import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'

@Injectable()
export class RetryEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(logId: string, requesterId: string) {
    const log = await this.prisma.upward_communication_log.findUnique({
      where: { id: logId },
    })

    if (!log) {
      throw new NotFoundException('Communication log not found')
    }

    const success = await this.unifiedCommService.retryCommunication(logId);

    await this.adminLogService.logAction(
      requesterId,
      'RESEND_EMAIL',
      `Manually retried communication (log: ${logId}) via channel ${log.channel}. Success: ${success}`,
    )

    return { success }
  }
}
