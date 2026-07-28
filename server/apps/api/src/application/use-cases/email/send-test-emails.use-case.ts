import { Injectable, Logger } from '@nestjs/common'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { wrapInBaseTemplate } from '../../../shared/infrastructure/email/templates'

@Injectable()
export class SendTestEmailsUseCase {
  private readonly logger = new Logger(SendTestEmailsUseCase.name)

  constructor(
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(payload: {
    emails: string[]
    subject: string
    content: string
    requesterId?: string
  }) {
    const results = []

    for (const email of payload.emails) {
      try {
        const customizedContent = payload.content
          .replace(/{{firstName}}/g, 'Test Recipient')
          .replace(/{{lastName}}/g, '(Test)')
          .replace(/{{email}}/g, email)

        const isFullHtml =
          customizedContent.toLowerCase().includes('<html') ||
          customizedContent.toLowerCase().includes('<!doctype')
        const finalHtml = isFullHtml
          ? customizedContent
          : wrapInBaseTemplate(customizedContent, payload.subject, email)

        await this.emailService.sendGenericEmail(email, payload.subject, finalHtml)
        results.push({ email, status: 'SENT' })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error(`Failed to send test email to ${email}`, error)
        results.push({ email, status: 'FAILED', error: errorMessage })
      }
    }

    if (payload.requesterId) {
      await this.adminLogService.logAction(
        payload.requesterId,
        'SEND_TEST_EMAIL',
        `Sent ${payload.emails.length} test emails. Subject: ${payload.subject}`,
      )
    }

    return results
  }
}
