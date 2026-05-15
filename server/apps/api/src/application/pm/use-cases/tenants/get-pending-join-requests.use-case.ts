import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetPendingJoinRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number) {
    const logs = await this.prisma.upward_pm_activity_log.findMany({
      where: {
        ownerPmId: pmId,
        action: 'TENANT_JOIN_REQUEST',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for PENDING logs using the JSON metadata field
    const pendingLogs = logs.filter((log: any) => {
      const metadata = log.metadata as any;
      return metadata && metadata.status === 'PENDING';
    });

    return pendingLogs.map((log: any) => {
      const metadata = log.metadata as any;
      return {
        uuid: log.uuid,
        tenantFirstName: this.encryption.decrypt(metadata.userFirstName),
        tenantLastName: this.encryption.decrypt(metadata.userLastName),
        tenantEmail: this.encryption.decrypt(metadata.userEmail),
        tenantUuid: metadata.userUuid,
        unitDetails: metadata.unitDetails,
        createdAt: log.createdAt,
      };
    });
  }
}
