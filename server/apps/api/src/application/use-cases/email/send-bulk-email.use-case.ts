import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { formatName } from '@upward/common-utils'
import { wrapInBaseTemplate } from '../../../shared/infrastructure/email/templates'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class SendBulkEmailUseCase {
  private readonly logger = new Logger(SendBulkEmailUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(payload: {
    userIds: string[]
    subject: string
    content: string
    sessionId?: string
    requesterId?: string
  }) {
    const users = await this.prisma.upward_user.findMany({
      where: { uuid: { in: payload.userIds }, unsubscribed: false },
    })

    const results = []

    for (const user of users) {
      const email = this.encryption.decrypt(user.email)
      const firstName = this.encryption.decrypt(user.firstName)
      const lastName = this.encryption.decrypt(user.lastName)
      
      try {
        const customizedContent = payload.content
          .replace(/{{firstName}}/g, firstName ? formatName(firstName) : 'there')
          .replace(/{{lastName}}/g, lastName ? formatName(lastName) : '')
          .replace(/{{email}}/g, email)

        const finalHtml = wrapInBaseTemplate(customizedContent, payload.subject, email)
        await this.emailService.sendGenericEmail(email, payload.subject, finalHtml, String(user.id))
        results.push({ email, status: 'SENT' })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error(`Failed to send email to ${email}`, error)
        results.push({ email, status: 'FAILED', error: errorMessage })
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
