import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class RejectCredibilityRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(requestUuid: string) {
    const credibilityReq = await this.prisma.upward_credibility_request.findUnique({
      where: { uuid: requestUuid }
    });

    if (!credibilityReq) {
      throw new NotFoundException('Credibility request not found or invalid link.');
    }

    if (credibilityReq.status !== 'PENDING') {
      throw new BadRequestException('This request is already resolved.');
    }

    const updatedRequest = await this.prisma.upward_credibility_request.update({
      where: { uuid: requestUuid },
      data: { status: 'CANCELLED' }
    });

    // Notify tenant
    try {
      const user = await this.prisma.upward_user.findUnique({ where: { id: credibilityReq.userId } });
      const property = await this.prisma.upward_user_property.findUnique({ 
        where: { uuid: credibilityReq.propertyUuid },
        include: { location: true, pm: true }
      });

      if (user && property) {
        const tenantEmail = this.encryption.decrypt(user.email);
        const tenantFirstName = this.encryption.decrypt(user.firstName);
        
        const decryptedBusinessName = property.pm?.businessName ? this.encryption.decrypt(property.pm.businessName) : '';
        const decryptedFirstName = property.pm?.firstName ? this.encryption.decrypt(property.pm.firstName) : '';
        const decryptedLastName = property.pm?.lastName ? this.encryption.decrypt(property.pm.lastName) : '';
        const pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Your Property Manager';

        await this.emailService.sendCredibilityRequestRejection({
          email: tenantEmail,
          tenantName: tenantFirstName,
          pmName,
          propertyAddress: property.location?.address || 'Unknown Address',
          pmUuid: property.pm?.uuid,
        });
      }
    } catch (e) {
      console.error('Failed to send credibility rejection email:', e);
    }

    return {
      success: true,
      message: 'Request declined successfully.',
      request: updatedRequest,
    };
  }
}
