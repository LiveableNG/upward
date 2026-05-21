import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class DismissJoinRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, logUuid: string) {
    const log = await this.prisma.upward_pm_activity_log.findFirst({
      where: {
        uuid: logUuid,
        ownerPmId: pmId,
        action: 'TENANT_JOIN_REQUEST',
      },
    });

    if (!log) {
      throw new NotFoundException('Join request not found');
    }

    const metadata = log.metadata as any;
    if (metadata) {
      metadata.status = 'DISMISSED';
    }

    await this.prisma.upward_pm_activity_log.update({
      where: { id: log.id },
      data: { metadata },
    });
    try {
      const tenantEmail = this.encryption.decrypt(metadata.userEmail);
      const tenantName = this.encryption.decrypt(metadata.userFirstName);
      const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: pmId } });
      const pmName = pm?.businessName || (pm?.firstName ? `${pm.firstName} ${pm.lastName || ''}` : 'Your Property Manager');

      await this.emailService.sendJoinRequestRejection({
        email: tenantEmail,
        tenantName,
        pmName,
        propertyAddress: metadata.unitDetails?.address || 'Unknown Address',
        pmUuid: pm?.uuid,
      });

      const user = await this.prisma.upward_user.findUnique({ where: { uuid: metadata.userUuid } });
      if (user && metadata.unitDetails?.address) {
        const properties = await this.prisma.upward_user_property.findMany({
          where: { userId: user.id },
          include: { location: true }
        });

        const targetProp = properties.find(p => 
          p.location?.address === metadata.unitDetails.address || 
          p.location?.area === metadata.unitDetails.address
        );

        if (targetProp) {
          await (this.prisma.upward_user_property as any).update({
            where: { id: targetProp.id },
            data: { 
              verificationStatus: 'REJECTED',
              // reason: metadata.dismissalReason || 'Declined by Manager'
            }
          });
        }
      }
    } catch (e) {
      // Log error but don't fail the request
      console.error('Failed to send join rejection email:', e);
    }

    return { success: true };
  }
}
