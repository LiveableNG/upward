import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigService } from '@nestjs/config'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { randomUUID, createHmac } from 'crypto'
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
                  from: data.from || null,
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
    const { userId, pmUuid, email, subject, text, html, type, sessionId, fromOverride, replyToOverride, attachments } = params
    let { cc, bcc } = params
    let domain = this.configService.get<string>('MAILGUN_DOMAIN')
    if (!domain) {
      this.logger.error('MAILGUN_DOMAIN not configured')
      return { success: false, error: 'MAILGUN_DOMAIN not configured' }
    }

    let from = fromOverride || this.configService.get<string>('EMAIL_FROM') || `Upward by GoodTenants <hello@${domain}>`
    let replyTo = replyToOverride || this.replyToEmail
    let brandedHtml = html

    const upperType = type.toUpperCase()
    const isPlatformSpecial = upperType.includes('OTP') || upperType.includes('ADMIN') || upperType === 'CUSTOMER_SUPPORT' || upperType === 'SYSTEM_ALERT'

    if (isPlatformSpecial) {
      if (upperType.includes('OTP')) {
        from = `"Upward" <noreplyupward@goodtenants.io>`
      } else {
        from = `"Upward Admin" <upwardadmin@goodtenants.io>`
      }
    } else if (upperType.includes('UNIVERSITY') || upperType.includes('STUDENT')) {
      from = fromOverride || `"Upward University" <replyupwarduniversity@goodtenants.io>`
    }

    const targetPmUuid = pmUuid || userId
    let emailSetting: any = null
    if (targetPmUuid && !isPlatformSpecial) {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: targetPmUuid },
        include: { emailSetting: true },
      })
      
      let isSenderVerified = false
      let pmDomain = ''
      
      if (pm?.emailSetting) {
        emailSetting = pm.emailSetting
        if (pm.emailSetting.isVerified && pm.emailSetting.domain) {
          isSenderVerified = true
          pmDomain = pm.emailSetting.domain
          domain = pm.emailSetting.domain
        }
        
        if (!replyToOverride && pm.emailSetting.senderEmail) {
          replyTo = pm.emailSetting.senderEmail
        }
        
        if (pm.emailSetting.cc) {
          cc = cc ? `${cc}, ${pm.emailSetting.cc}` : pm.emailSetting.cc
        }
        if (pm.emailSetting.bcc) {
          bcc = bcc ? `${bcc}, ${pm.emailSetting.bcc}` : pm.emailSetting.bcc
        }
        brandedHtml = applyPmBranding(html, pm.emailSetting)
      }
      
      if (!fromOverride) {
        if (pm?.emailSetting) {
          const isExternalProvider = pm.emailSetting.provider && pm.emailSetting.provider !== 'platform-sender' && pm.emailSetting.provider !== 'mailgun'
          if (isSenderVerified || isExternalProvider) {
            from = `"${pm.emailSetting.senderName}" <${pm.emailSetting.senderEmail}>`
          } else if (pm.emailSetting.senderEmail) {
            const defaultFrom = this.configService.get<string>('EMAIL_FROM') || 'noreply@goodtenants.io'
            const senderName = pm.emailSetting.senderName || 'Property Manager'
            from = `"${senderName} (via Upward)" <${defaultFrom.replace(/^.*<([^>]+)>$/, '$1')}>`
          }
        }
      } else {
        const emailMatch = fromOverride.match(/<([^>]+)>/) || [null, fromOverride]
        const extractedEmail = emailMatch[1]?.trim() || fromOverride.trim()
        
        const isOverrideVerified = isSenderVerified && pmDomain && extractedEmail.endsWith(`@${pmDomain}`)
        const isPlatformDomain = extractedEmail.endsWith(`@${this.configService.get<string>('MAILGUN_DOMAIN')}`)
        const isDefaultFrom = extractedEmail === (this.configService.get<string>('EMAIL_FROM') || 'noreply@goodtenants.io').replace(/^.*<([^>]+)>$/, '$1')
        
        if (!isOverrideVerified && !isPlatformDomain && !isDefaultFrom) {
          const defaultFrom = this.configService.get<string>('EMAIL_FROM') || 'noreply@goodtenants.io'
          let senderName = fromOverride.replace(/<[^>]+>/, '').replace(/"/g, '').trim()
          if (!senderName) senderName = extractedEmail.split('@')[0] || 'Property Manager'
          from = `"${senderName} (via Upward)" <${defaultFrom.replace(/^.*<([^>]+)>$/, '$1')}>`
          
          if (!replyToOverride && extractedEmail) {
            replyTo = extractedEmail
          }
        } else {
          from = fromOverride
        }
      }
    } else if (fromOverride) {
      from = fromOverride
    }

    let retries = 0
    let success = false
    let lastError = ''
    let mailgunId = ''

    const emailTrackingToken = randomUUID()
    const apiUrl = (this.configService.get<string>('API_URL') || '').replace(/\/$/, '')
    const trackingPixelUrl = `${apiUrl}/api/v1/email-tracking/open?t=${emailTrackingToken}`
    const trackingPixelRegex = /\/api\/v1\/email-tracking\/open\?t=[^"'>\s]+/

    const trackedLinks: Array<{ id: string; originalUrl: string }> = []
    if (brandedHtml) {
      brandedHtml = brandedHtml.replace(
        /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']([^>]*)>/gi,
        (match, href, rest) => {
          if (
            !href.match(/^https?:\/\//i) ||
            href.includes('/email-tracking/') ||
            href.includes('/emails/') ||
            href.includes('/unsubscribe')
          ) {
            return match
          }
          const linkId = randomUUID()
          trackedLinks.push({ id: linkId, originalUrl: href })
          const token = this.createTrackingToken(href, linkId)
          const trackingUrl = `${apiUrl}/l/${token}`
          return match.replace(`href="${href}"`, `href="${trackingUrl}"`).replace(`href='${href}'`, `href='${trackingUrl}'`)
        },
      )
    }

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

        if (emailSetting && emailSetting.isVerified && emailSetting.provider && emailSetting.provider !== 'platform-sender') {
          if (emailSetting.provider === 'office365') {
            mailgunId = await this.sendViaOffice365(emailSetting, mailData)
          } else if (['gmail', 'zoho-smtp', 'yahoo-smtp'].includes(emailSetting.provider)) {
            mailgunId = await this.sendViaSmtp(emailSetting, mailData)
          } else if (['gmail-oauth', 'zoho-oauth'].includes(emailSetting.provider)) {
            mailgunId = await this.sendViaOAuth(emailSetting, mailData)
          } else {
            const response = await this.mg.messages.create(domain, mailData)
            mailgunId = response.id
          }
        } else {
          const response = await this.mg.messages.create(domain, mailData)
          mailgunId = response.id
        }
        success = true
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
        trackedLinks,
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
    const alertAdmins = await this.prisma.upward_admin.findMany({
      where: { receivesSystemAlerts: true },
      select: { email: true },
    })

    if (alertAdmins.length === 0) {
      this.logger.warn(`No admins with receivesSystemAlerts=true — skipping ${role} signup alert`)
      return
    }

    let uuid = id
    let displayName = 'Unknown'
    let emailAddress = 'Unknown'

    if (id) {
      if (role === 'USER') {
        const isNumeric = /^\d+$/.test(id)
        const user = await this.prisma.upward_user.findFirst({
          where: isNumeric ? { id: parseInt(id, 10) } : { uuid: id },
          select: { uuid: true, firstName: true, lastName: true, email: true },
        })
        if (user) {
          uuid = user.uuid
          const fn = user.firstName ? this.encryption.decrypt(user.firstName) : ''
          const ln = user.lastName ? this.encryption.decrypt(user.lastName) : ''
          displayName = `${fn} ${ln}`.trim() || 'Unknown'
          emailAddress = user.email ? this.encryption.decrypt(user.email) : 'Unknown'
        }
      } else if (role === 'PM') {
        const isNumeric = /^\d+$/.test(id)
        const pm = await this.prisma.upward_property_manager.findFirst({
          where: isNumeric ? { id: parseInt(id, 10) } : { uuid: id },
          select: { uuid: true, firstName: true, lastName: true, email: true },
        })
        if (pm) {
          uuid = pm.uuid
          const fn = pm.firstName ? this.encryption.decrypt(pm.firstName) : ''
          const ln = pm.lastName ? this.encryption.decrypt(pm.lastName) : ''
          displayName = `${fn} ${ln}`.trim() || 'Unknown'
          emailAddress = pm.email ? this.encryption.decrypt(pm.email) : 'Unknown'
        }
      }
    }

    const adminSiteUrl = (this.configService.get<string>('ADMIN_SITE_URL') || 'https://admin.upward.goodtenants.io').split(',')[0]!.trim()
    const profileUrl = uuid ? `${adminSiteUrl}/${role === 'PM' ? 'pms' : 'users'}/${uuid}` : null

    const subject = `New ${role} Signup Alert`
    const html = `<div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333;">
      <h2 style="color: #166534; margin-bottom: 20px;">New ${role} Signup</h2>
      <p style="font-size: 15px;">A new ${role.toLowerCase()} has successfully registered on the platform.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px; border-bottom: 1px solid #eee;">Name:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${displayName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${emailAddress}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">System ID:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${id || 'Unknown'}</td>
        </tr>
      </table>
      ${profileUrl ? `<p style="margin-top: 20px;"><a href="${profileUrl}" style="background-color: #166534; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Profile in Admin Portal</a></p>` : ''}
    </div>`
    const text = `New ${role} Signup.\nName: ${displayName}\nEmail: ${emailAddress}\nID: ${id || 'Unknown'}${profileUrl ? `\nView Profile: ${profileUrl}` : ''}`

    await Promise.allSettled(
      alertAdmins.map(({ email }) =>
        this.sendEmailWithRetry({ email, subject, html, text, type: 'CUSTOMER_SUPPORT' })
      )
    )
  }

  async sendSystemAlertToAdmins(subject: string, message: string) {
    const alertAdmins = await this.prisma.upward_admin.findMany({
      where: { receivesSystemAlerts: true },
      select: { email: true },
    })

    if (alertAdmins.length === 0) {
      this.logger.warn(`No admins with receivesSystemAlerts=true — skipping system alert: ${subject}`)
      return
    }

    const html = `<div style="font-family: sans-serif; padding: 20px;">
      <h2>System Alert</h2>
      <p>${message}</p>
    </div>`

    await Promise.allSettled(
      alertAdmins.map(({ email }) =>
        this.sendEmailWithRetry({ email, subject, html, text: message, type: 'SYSTEM_ALERT' })
      )
    )
  }

  private async sendViaSmtp(emailSetting: any, mailData: any): Promise<string> {
    let host = 'smtp.gmail.com'
    let port = 465
    let secure = true

    if (emailSetting.provider === 'zoho-smtp') {
      host = 'smtp.zoho.com'
    } else if (emailSetting.provider === 'yahoo-smtp') {
      host = 'smtp.mail.yahoo.com'
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: emailSetting.smtpEmail,
        pass: emailSetting.smtpPassword,
      },
    })

    const mailOptions: any = {
      from: mailData.from,
      to: mailData.to,
      subject: mailData.subject,
      text: mailData.text,
      html: mailData.html,
    }

    if (mailData.cc) mailOptions.cc = mailData.cc
    if (mailData.bcc) mailOptions.bcc = mailData.bcc
    if (mailData['h:Reply-To']) mailOptions.replyTo = mailData['h:Reply-To']

    if (mailData.attachment && mailData.attachment.length > 0) {
      mailOptions.attachments = mailData.attachment.map((a: any) => ({
        filename: a.filename,
        content: a.data,
      }))
    }

    const info = await transporter.sendMail(mailOptions)
    return info.messageId || `smtp-${Date.now()}`
  }

  private async sendViaOffice365(emailSetting: any, mailData: any): Promise<string> {
    const config = emailSetting.office365Config
    if (!config || !config.applicationId || !config.directoryId || !config.clientSecret || !config.userObjectId) {
      throw new Error('Office365 configuration is incomplete')
    }

    const tokenUrl = `https://login.microsoftonline.com/${config.directoryId}/oauth2/v2.0/token`
    const bodyParams = new URLSearchParams()
    bodyParams.append('client_id', config.applicationId)
    bodyParams.append('client_secret', config.clientSecret)
    bodyParams.append('scope', 'https://graph.microsoft.com/.default')
    bodyParams.append('grant_type', 'client_credentials')

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      throw new Error(`Failed to refresh Office365 access token: ${errorText}`)
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    const message: any = {
      subject: mailData.subject,
      body: {
        contentType: 'HTML',
        content: mailData.html,
      },
      toRecipients: mailData.to.map((email: string) => ({
        emailAddress: { address: email },
      })),
    }

    if (mailData.cc) {
      message.ccRecipients = mailData.cc.split(',').map((email: string) => ({
        emailAddress: { address: email.trim() },
      }))
    }

    if (mailData.bcc) {
      message.bccRecipients = mailData.bcc.split(',').map((email: string) => ({
        emailAddress: { address: email.trim() },
      }))
    }

    if (mailData['h:Reply-To']) {
      message.replyTo = [
        {
          emailAddress: { address: mailData['h:Reply-To'] },
        },
      ]
    }

    if (mailData.attachment && mailData.attachment.length > 0) {
      message.attachments = mailData.attachment.map((a: any) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.filename,
        contentType: 'application/octet-stream',
        contentBytes: Buffer.from(a.data).toString('base64'),
      }))
    }

    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${config.userObjectId}/sendMail`
    const sendRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      throw new Error(`Office365 sending failed: ${errText}`)
    }

    return `office365-${Date.now()}`
  }

  private async sendViaOAuth(emailSetting: any, mailData: any): Promise<string> {
    const isGmail = emailSetting.provider === 'gmail-oauth'
    const config = isGmail ? emailSetting.gmailOauthConfig : emailSetting.zohoConfig
    if (!config || !config.clientId || !config.clientSecret || !config.refreshToken) {
      throw new Error('OAuth configuration is incomplete or missing tokens')
    }

    let accessToken = ''
    if (isGmail) {
      const tokenUrl = 'https://oauth2.googleapis.com/token'
      const bodyParams = new URLSearchParams()
      bodyParams.append('client_id', config.clientId)
      bodyParams.append('client_secret', config.clientSecret)
      bodyParams.append('refresh_token', config.refreshToken)
      bodyParams.append('grant_type', 'refresh_token')

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      })

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text()
        throw new Error(`Failed to refresh Gmail OAuth token: ${errorText}`)
      }

      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
    } else {
      const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token'
      const bodyParams = new URLSearchParams()
      bodyParams.append('client_id', config.clientId)
      bodyParams.append('client_secret', config.clientSecret)
      bodyParams.append('refresh_token', config.refreshToken)
      bodyParams.append('grant_type', 'refresh_token')

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      })

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text()
        throw new Error(`Failed to refresh Zoho OAuth token: ${errorText}`)
      }

      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
    }

    const transporter = nodemailer.createTransport({
      host: isGmail ? 'smtp.gmail.com' : 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: emailSetting.smtpEmail || emailSetting.senderEmail,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken,
        accessToken,
      },
    } as any)

    const mailOptions: any = {
      from: mailData.from,
      to: mailData.to,
      subject: mailData.subject,
      text: mailData.text,
      html: mailData.html,
    }

    if (mailData.cc) mailOptions.cc = mailData.cc
    if (mailData.bcc) mailOptions.bcc = mailData.bcc
    if (mailData['h:Reply-To']) mailOptions.replyTo = mailData['h:Reply-To']

    if (mailData.attachment && mailData.attachment.length > 0) {
      mailOptions.attachments = mailData.attachment.map((a: any) => ({
        filename: a.filename,
        content: a.data,
      }))
    }

    const info = await transporter.sendMail(mailOptions)
    return info.messageId || `oauth-${Date.now()}`
  }

  private createTrackingToken(originalUrl: string, linkId: string): string {
    const secret = this.configService.get<string>('JWT_SECRET') || 'upward-email-tracking-secret'
    const payload = Buffer.from(JSON.stringify({ u: originalUrl, l: linkId })).toString('base64url')
    const sig = createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 10)
    return `${payload}.${sig}`
  }
}
