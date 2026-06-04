import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class ResolveDuplicateJoinRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, logUuid: string): Promise<{ success: boolean }> {
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
      metadata.status = 'ACCEPTED';
    }

    await this.prisma.upward_pm_activity_log.update({
      where: { id: log.id },
      data: { metadata },
    });

    try {
      const user = await this.prisma.upward_user.findUnique({
        where: { uuid: metadata.userUuid }
      });

      if (user) {
        // Delete any duplicate pending property connections on the tenant side
        await this.prisma.upward_user_property.deleteMany({
          where: {
            userId: user.id,
            pmId: pmId,
            pmUnitId: null,
            verificationStatus: 'PENDING',
          }
        });
      }
    } catch (e) {
      console.error('Failed to clean up duplicate pending user properties during duplicate resolution:', e);
    }

    return { success: true };
  }
}
