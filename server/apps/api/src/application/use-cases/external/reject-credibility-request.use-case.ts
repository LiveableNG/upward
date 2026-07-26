import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';

@Injectable()
export class RejectCredibilityRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
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
        const tenantEmail = user.email;
        const tenantFirstName = user.firstName;
        
        const decryptedBusinessName = property.pm?.businessName ? this.encryption.decrypt(property.pm.businessName) : '';
        const decryptedFirstName = property.pm?.firstName ? this.encryption.decrypt(property.pm.firstName) : '';
        const decryptedLastName = property.pm?.lastName ? this.encryption.decrypt(property.pm.lastName) : '';
        const pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Your Property Manager';

        await this.unifiedCommService.processCommunication({
          recipientEmail: tenantEmail,
          recipientName: tenantFirstName,
          recipientRole: 'TENANT',
          registeredUserId: user.id,
          pmUuid: property.pm?.uuid,
          type: 'CREDIBILITY_REJECTION',
          context: {
            tenantName: tenantFirstName,
            propertyAddress: property.location?.address || 'Unknown Address',
            reason: 'Declined by Property Manager',
          },
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
