import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class DismissJoinRequestUseCase {
  constructor(private readonly prisma: PrismaService) {}

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

    return { success: true };
  }
}
