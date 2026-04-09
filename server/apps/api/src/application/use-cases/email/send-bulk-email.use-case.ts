import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { formatName } from '@upward/common-utils'
import { wrapInBaseTemplate } from '../../../shared/infrastructure/email/templates'

@Injectable()
export class SendBulkEmailUseCase {
  private readonly logger = new Logger(SendBulkEmailUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(payload: {
    userIds: string[]
    subject: string
    content: string
    sessionId?: string
    requesterId?: string
  }) {
    const users = await this.prisma.upward_waitlist.findMany({
      where: { id: { in: payload.userIds }, unsubscribed: false },
    })

    const results = []

    for (const user of users) {
      try {
        const customizedContent = payload.content
          .replace(/{{firstName}}/g, user.firstName ? formatName(user.firstName) : 'there')
          .replace(/{{lastName}}/g, user.lastName ? formatName(user.lastName) : '')
          .replace(/{{email}}/g, user.email)

        const finalHtml = wrapInBaseTemplate(customizedContent, payload.subject, user.email)
        await this.emailService.sendGenericEmail(user.email, payload.subject, finalHtml, user.id)
        results.push({ email: user.email, status: 'SENT' })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error(`Failed to send email to ${user.email}`, error)
        results.push({ email: user.email, status: 'FAILED', error: errorMessage })
      }
    }

    if (payload.requesterId) {
      await this.adminLogService.logAction(
        payload.requesterId,
        'SEND_EMAIL',
        `Batch emailed ${users.length} users. Subject: ${payload.subject}`,
      )
    }

    return results
  }
}
