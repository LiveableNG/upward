import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { EmailService } from '@shared/infrastructure/email/email.service'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'

@Injectable()
export class RetryEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(logId: string, requesterId: string) {
    const log = await this.prisma.upward_email_log.findUnique({
      where: { id: logId },
    })

    if (!log || !log.email) {
      throw new NotFoundException('Email log not found')
    }

    const result = await this.emailService.sendEmailWithRetry({
      userId: log.userId ?? '',
      email: log.email,
      subject: log.subject,
      html: log.body || '',
      type: `${log.type}_RETRY`,
    })

    await this.adminLogService.logAction(
      requesterId,
      'RESEND_EMAIL',
      `Manually retried email (log: ${logId}) to ${log.email}. Success: ${result.success}`,
    )

    return result
  }
}
