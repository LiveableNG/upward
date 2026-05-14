import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPendingJoinRequestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

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

    return pendingLogs.map((log: any) => ({
      uuid: log.uuid,
      tenantFirstName: (log.metadata as any).userFirstName,
      tenantLastName: (log.metadata as any).userLastName,
      tenantEmail: (log.metadata as any).userEmail,
      tenantUuid: (log.metadata as any).userUuid,
      createdAt: log.createdAt,
    }));
  }
}
