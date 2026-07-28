import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { randomUUID } from 'crypto'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { BugsnagService } from '../../../shared/infrastructure/common/bugsnag/bugsnag.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { EmailSentEvent } from '../../../application/events/definition/email-sent.event'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { formatName } from '@upward/common-utils'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UnifiedCommunicationService } from '../communication/unified-communication.service'
import {
  applyPmBranding,
} from './email.helper'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mg: any
  private readonly MAX_RETRIES = 3
  private readonly frontendUrl: string
  private readonly replyToEmail: string

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private bugsnag: BugsnagService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private s3Service: S3Service,
    private encryption: EncryptionService,
    @Inject(forwardRef(() => UnifiedCommunicationService))
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {
    this.frontendUrl =
      (this.configService.get<string>('FRONTEND_URL') || 'https://upward.goodtenants.io')
        .split(',')[0]!
        .trim()
    this.replyToEmail =
      this.configService.get<string>('REPLY_TO_EMAIL') || 'hello@goodtenants.africa'
    const mailgun = new Mailgun(FormData)
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY')
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')

    const mockEmails =
      this.configService.get<string>('MOCK_EMAILS') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'dev' ||
      !apiKey ||
      !domain

    if (mockEmails) {
      this.logger.log('EmailService: Mocking outgoing emails in development/local environment.')
      this.mg = {
        messages: {
          create: async (dom: string, data: any) => {
            const toStr = Array.isArray(data.to) ? data.to.join(', ') : data.to
            this.logger.log(`[MOCK EMAIL] To: ${toStr} | Subject: ${data.subject}`)
            try {
              const uuid = randomUUID()

              const htmlBuffer = Buffer.from(data.html || '')
              const htmlKey = `dev-emails/${uuid}/body.html`
              await this.s3Service.uploadBuffer(htmlBuffer, htmlKey, 'text/html')

              const attachmentsData = []
              if (data.attachment && Array.isArray(data.attachment)) {
                for (const att of data.attachment) {
                  const attKey = `dev-emails/${uuid}/attachments/${att.filename}`
                  const buffer = Buffer.isBuffer(att.data)
                    ? att.data
                    : typeof att.data === 'string'
                      ? Buffer.from(att.data)
                      : Buffer.from([])

                  await this.s3Service.uploadBuffer(buffer, attKey, 'application/octet-stream')
                  attachmentsData.push({
                    filename: att.filename,
                    s3Key: attKey,
                  })
                }
              }

              await this.prisma.upward_dev_email_preview.create({
                data: {
                  uuid,
                  to: toStr,
                  cc: data.cc || null,
                  bcc: data.bcc || null,
                  subject: data.subject || '',
                  html: htmlKey,
                  text: data.text || '',
                  attachments: attachmentsData,
                },
              })
            } catch (err) {
              this.logger.error('Failed to save dev email preview to database / S3:', err)
            }
            return { id: `mock-mailgun-id-${Date.now()}` }
          },
        },
      }
    } else {
      this.mg = mailgun.client({
        username: 'api',
        key: apiKey || '',
      })
    }
  }

  async sendWaitlistConfirmation(userId: string, email: string, firstName?: string) {
    const formattedName = firstName ? formatName(firstName) : 'there'
    
    const success = await this.unifiedCommService.processCommunication({
      userId,
      recipientEmail: email,
      recipientName: formattedName,
      recipientRole: 'TENANT',
      type: 'SIGNUP_CONFIRMATION',
      context: {
        firstName: formattedName,
        displayName: formattedName,
        email,
      }
    });

    return { success, mailgunId: '', error: success ? '' : 'Unified confirmation dispatch failed' }
  }

  async sendEmailWithRetry(params: {
    userId?: string
    pmUuid?: string
    email: string
    subject: string
    text?: string
    html: string
    type: string
    sessionId?: string
    fromOverride?: string
    replyToOverride?: string
    attachments?: Array<{ filename: string; content: Buffer }>
    cc?: string
    bcc?: string
    emailSequenceLogId?: number
  }) {
    const { userId, pmUuid, email, subject, text, html, type, sessionId, fromOverride, replyToOverride, attachments, cc, bcc } = params
    let domain = this.configService.get<string>('MAILGUN_DOMAIN')
    if (!domain) {
      this.logger.error('MAILGUN_DOMAIN not configured')
      return { success: false, error: 'MAILGUN_DOMAIN not configured' }
    }

    let from =
      fromOverride || this.configService.get<string>('EMAIL_FROM') || `Upward by GoodTenants <hello@${domain}>`
    let replyTo = replyToOverride || this.replyToEmail
    let brandedHtml = html

    const targetPmUuid = pmUuid || userId
    if (targetPmUuid) {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: targetPmUuid },
        include: { emailSetting: true },
      })
      if (pm?.emailSetting) {
        if (pm.emailSetting.isVerified && pm.emailSetting.domain) {
          domain = pm.emailSetting.domain
          from = `"${pm.emailSetting.senderName}" <${pm.emailSetting.senderEmail}>`
          // For PM-branded emails, reply-to the PM's own sender so tenants reach them directly
          replyTo = pm.emailSetting.senderEmail
        }
        brandedHtml = applyPmBranding(html, pm.emailSetting)
      }
    }

    let retries = 0
    let success = false
    let lastError = ''
    let mailgunId = ''

    const emailTrackingToken = randomUUID()
    const apiUrl = (this.configService.get<string>('API_URL') || '').replace(/\/$/, '')
    const trackingPixelUrl = `${apiUrl}/api/v1/email-tracking/open?t=${emailTrackingToken}`
    const trackingPixelRegex = /\/api\/v1\/email-tracking\/open\?t=[^"'>\s]+/

    if (brandedHtml && !trackingPixelRegex.test(brandedHtml)) {
      brandedHtml += `\n<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none!important;visibility:hidden!important;max-height:1px;max-width:1px;border:0;outline:none;text-decoration:none;" />`
    }

    const plainText = text || brandedHtml
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const unsubscribeToken = Buffer.from(email).toString('base64url')

    while (retries < this.MAX_RETRIES && !success) {
      try {
        const mailData: any = {
          from,
          to: [email],
          subject,
          text: plainText,
          html: brandedHtml,
          'h:Reply-To': replyTo,
          'h:List-Unsubscribe': `<${this.frontendUrl}/unsubscribe?token=${unsubscribeToken}>`,
          'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'h:X-Entity-Ref-ID': emailTrackingToken,
          'o:tag': [type],
        }

        if (cc) {
          mailData.cc = cc
        }
        if (bcc) {
          mailData.bcc = bcc
        }

        if (attachments && attachments.length > 0) {
          mailData.attachment = attachments.map((a) => ({
            filename: a.filename,
            data: a.content,
          }))
        }

        const response = await this.mg.messages.create(domain, mailData)
        success = true
        mailgunId = response.id
        this.logger.log(`Email ${type} sent to ${email} (Attempt ${retries + 1})`)
      } catch (error: unknown) {
        retries++
        lastError = error instanceof Error ? error.message : 'Unknown error'
        this.logger.warn(
          `Failed to send email to ${email} (Attempt ${retries}/${this.MAX_RETRIES}): ${lastError}`,
        )
        if (retries < this.MAX_RETRIES) {
          // Exponential backoff: 2s, 4s, 8s...
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000))
        }
      }
    }

    // Resolve userId if not provided
    let resolvedUserId = userId
    if (!resolvedUserId && email) {
      const user = await this.prisma.upward_user.findFirst({
        where: { email },
        select: { id: true },
      })
      if (user) {
        resolvedUserId = String(user.id)
      } else {
        const waitlist = await this.prisma.upward_waitlist.findFirst({
          where: { email },
          select: { id: true },
        })
        if (waitlist) {
          resolvedUserId = waitlist.id
        }
      }
    }

    // Publish Sent Event for logging/other side effects
    this.eventBus.publish(
      new EmailSentEvent(
        resolvedUserId,
        email,
        subject,
        type,
        success ? 'SENT' : 'FAILED',
        mailgunId,
        success ? undefined : lastError,
        retries - 1 >= 0 ? retries - 1 : 0,
        sessionId,
        brandedHtml,
        params.emailSequenceLogId,
        emailTrackingToken,
      ),
    )

    if (!success) {
      this.bugsnag.notify(new Error(`Failed to send ${type} email to ${email}: ${lastError}`), {
        userId: resolvedUserId,
        email,
        subject,
        type,
        retries,
      })
    }

    // If it's a confirmation email, also update the user record
    if (type === 'CONFIRMATION' && resolvedUserId) {
      try {
        await this.prisma.upward_waitlist.update({
          where: { id: resolvedUserId },
          data: {
            confirmationSent: success,
            confirmationEmailStatus: success ? 'SENT' : 'FAILED',
            confirmationEmailError: success ? null : lastError,
            confirmationEmailRetries: retries > 0 ? retries - 1 : 0,
          },
        })
      } catch (err) {
        this.logger.error('Failed to update waitlist confirmation:', err)
      }
    }

    return { success, mailgunId, error: lastError }
  }

  async sendGenericEmail(email: string, subject: string, content: string, userId?: string, pmUuid?: string, fromOverride?: string) {
    const result = await this.sendEmailWithRetry({
      userId,
      pmUuid,
      email,
      subject,
      html: content,
      type: 'BULK',
      fromOverride,
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send generic email')
    }
  }

  async sendCustomerSupportNotification(role: 'USER' | 'PM', id?: string) {
    const email = this.configService.get<string>('SUPPORT_EMAIL') || 'support@goodtenants.io'
    const subject = `New ${role} Signup Alert`
    const html = `<div style="font-family: sans-serif; padding: 20px;">
      <h2>New ${role} Signup</h2>
      <p>A new ${role} has successfully registered on the platform.</p>
      <p><strong>System ID:</strong> ${id || 'Unknown'}</p>
    </div>`
    
    await this.sendEmailWithRetry({
      email,
      subject,
      html,
      text: `New ${role} Signup. ID: ${id || 'Unknown'}`,
      type: 'CUSTOMER_SUPPORT',
    })
  }

  async sendSystemAlertToAdmins(subject: string, message: string) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@goodtenants.io'
    const html = `<div style="font-family: sans-serif; padding: 20px;">
      <h2>System Alert</h2>
      <p>${message}</p>
    </div>`
    
    await this.sendEmailWithRetry({
      email: adminEmail,
      subject,
      html,
      text: message,
      type: 'SYSTEM_ALERT',
    })
  }

}
