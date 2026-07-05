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
    targetGroup?: 'TENANTS' | 'PMS' | 'WAITLIST'
    sessionId?: string
    requesterId?: string
  }) {
    const target = payload.targetGroup || 'TENANTS'
    const results = []
    let recipientCount = 0

    if (target === 'PMS') {
      const pms = await this.prisma.upward_property_manager.findMany({
        where: { uuid: { in: payload.userIds } },
      })
      recipientCount = pms.length

      for (const pm of pms) {
        let email = ''
        let firstName = ''
        let lastName = ''
        try {
          email = this.encryption.decrypt(pm.email)
          firstName = this.encryption.decrypt(pm.firstName)
          lastName = this.encryption.decrypt(pm.lastName)
        } catch (err) {
          email = pm.email
          firstName = pm.firstName
          lastName = pm.lastName
        }

        try {
          const customizedContent = payload.content
            .replace(/{{firstName}}/g, firstName ? formatName(firstName) : 'there')
            .replace(/{{lastName}}/g, lastName ? formatName(lastName) : '')
            .replace(/{{email}}/g, email)

          const finalHtml = wrapInBaseTemplate(customizedContent, payload.subject, email)
          await this.emailService.sendGenericEmail(email, payload.subject, finalHtml, pm.uuid)
          results.push({ email, status: 'SENT' })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          this.logger.error(`Failed to send email to PM ${email}`, error)
          results.push({ email, status: 'FAILED', error: errorMessage })
        }
      }
    } else if (target === 'WAITLIST') {
      const entries = await this.prisma.upward_waitlist.findMany({
        where: {
          OR: [
            { uuid: { in: payload.userIds } },
            { id: { in: payload.userIds } }
          ],
          unsubscribed: false,
        },
      })
      recipientCount = entries.length

      for (const entry of entries) {
        const email = entry.email
        const firstName = entry.firstName || ''
        const lastName = entry.lastName || ''

        try {
          const customizedContent = payload.content
            .replace(/{{firstName}}/g, firstName ? formatName(firstName) : 'there')
            .replace(/{{lastName}}/g, lastName ? formatName(lastName) : '')
            .replace(/{{email}}/g, email)

          const finalHtml = wrapInBaseTemplate(customizedContent, payload.subject, email)
          await this.emailService.sendGenericEmail(email, payload.subject, finalHtml, entry.id)
          results.push({ email, status: 'SENT' })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          this.logger.error(`Failed to send email to Waitlist ${email}`, error)
          results.push({ email, status: 'FAILED', error: errorMessage })
        }
      }
    } else {
      // TENANTS (default)
      const users = await this.prisma.upward_user.findMany({
        where: { uuid: { in: payload.userIds }, unsubscribed: false },
      })
      recipientCount = users.length

      for (const user of users) {
        let email = ''
        let firstName = ''
        let lastName = ''
        try {
          email = this.encryption.decrypt(user.email)
          firstName = this.encryption.decrypt(user.firstName)
          lastName = this.encryption.decrypt(user.lastName)
        } catch (err) {
          email = user.email
          firstName = user.firstName
          lastName = user.lastName
        }

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
          this.logger.error(`Failed to send email to Tenant ${email}`, error)
          results.push({ email, status: 'FAILED', error: errorMessage })
        }
      }
    }

    if (payload.requesterId) {
      await this.adminLogService.logAction(
        payload.requesterId,
        'SEND_EMAIL',
        `Batch emailed ${recipientCount} recipients (${target}). Subject: ${payload.subject}`,
      )
    }

    return results
  }
}
