import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { formatName } from '@upward/common-utils'
import { BugsnagService } from '../../../shared/infrastructure/common/bugsnag/bugsnag.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { EmailSentEvent } from '../../../application/events/definition/email-sent.event'
import { Inject } from '@nestjs/common'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mg: any
  private readonly MAX_RETRIES = 3
  private readonly frontendUrl: string

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private bugsnag: BugsnagService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://upward.goodtenants.io'
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
              await this.prisma.upward_dev_email_preview.create({
                data: {
                  to: toStr,
                  subject: data.subject || '',
                  html: data.html || '',
                  text: data.text || '',
                },
              })
            } catch (err) {
              this.logger.error('Failed to save dev email preview to database:', err)
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
    const displayName = firstName ? `, ${formattedName}` : ''

    // Try to get template from DB
    const template = await this.prisma.upward_system_email.findUnique({
      where: { slug: 'SIGNUP_CONFIRMATION' },
    })

    let subject = template?.subject || 'Welcome to the Upward Waitlist — You’re In'
    let html =
      template?.htmlContent ||
      `<!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upward Waitlist</title>
      <style>
      @media (prefers-color-scheme: dark) {
      body, .container-table, .outer-table { background-color: #f9fafb !important; }
      .main-card { background-color: #ffffff !important; border-color: #e5e7eb !important; }
      .title, .greeting, .body-text, .footer-text { color: #111827 !important; }
      .sub-text { color: #4b5563 !important; }
      .info-box { background-color: #fff7ed !important; border-color: #ffedd5 !important; }
      .info-box-title { color: #9a3412 !important; }
      .info-box-text { color: #431407 !important; }
      .brand-name { color: #d97757 !important; }
      .brand-sub { color: #6b7280 !important; }
      .supporting-text { color: #9ca3af !important; }
      .support-link { color: #6b7280 !important; }
      }
      </style>
      </head>
      <body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
      <table class="outer-table" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background-color:#F9FAFB;">
      <tr>
      <td align="center">
      <table class="main-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);overflow:hidden;border:1px solid #E5E7EB;">
      <tr>
      <td style="height:4px;background-color:#d97757;"></td>
      </tr>
      <tr>
      <td style="padding:40px;">
      <div style="margin-bottom:32px;">
      <span class="brand-name" style="color:#d97757;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
      <div class="brand-sub" style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
      </div>
      <h1 class="greeting" style="color:#111827;font-size:24px;font-weight:700;margin:0 0 20px 0;line-height:1.2;">Hello{{firstName}},</h1>
      <p class="body-text" style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">You are now officially on the waitlist for <strong>Upward by GoodTenants</strong>.</p>
      <p class="sub-text" style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">We're building upward for you to help create a pathway to better rental terms, discounts, financial services, and eventually to owning a home — with a community of people who are building the same future.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
      <td class="info-box" style="background-color:#FFF7ED;border:1px solid #FFEDD5;border-radius:12px;padding:24px;">
      <div class="info-box-title" style="color:#9A3412;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">What happens next</div>
      <p class="info-box-text" style="color:#431407;font-size:15px;margin:0;line-height:1.5;">We will notify you as soon as early access becomes available. You may also receive occasional updates as we prepare for launch.</p>
      </td>
      </tr>
      </table>
      <p class="footer-text" style="color:#6B7280;font-size:15px;margin:0 0 24px 0;">Thank you for joining early.</p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E5E7EB;padding-top:24px;">
        <tr>
          <td align="left">
            <a href="${this.frontendUrl}" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Our Website</a>
            <span style="color: #D1D5DB; padding: 0 12px;">&bull;</span>
            <a href="mailto:hello@goodtenants.africa" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Contact Support</a>
            <span style="color: #D1D5DB; padding: 0 12px;">&bull;</span>
            <a href="${this.frontendUrl}/unsubscribe?email={{email}}" style="color: #6B7280; font-size: 12px; text-decoration: underline; font-weight: 500;">Unsubscribe</a>
          </td>
        </tr>
      </table>

      </td>
      </tr>
      </table>
      </td>
      </tr>
      </table>
      </body>
      </html>`

    const text =
      template?.textContent ||
      `Hello ${formattedName},\n\nYou're officially on the waitlist for Upward by GoodTenants.`

    // Replace variables
    html = html
      .replace(/{{firstName}}/g, displayName || (formattedName ? `, ${formattedName}` : ''))
      .replace(/{{email}}/g, email)
    subject = subject.replace(/{{firstName}}/g, formattedName)

    return await this.sendEmailWithRetry({
      userId,
      email,
      subject,
      html,
      text,
      type: 'CONFIRMATION',
    })
  }

  async sendEmailWithRetry(params: {
    userId: string
    email: string
    subject: string
    text?: string
    html: string
    type: string
    sessionId?: string
    attachments?: Array<{ filename: string; content: Buffer }>
  }) {
    const { userId, email, subject, text, html, type, sessionId, attachments } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    if (!domain) {
      this.logger.error('MAILGUN_DOMAIN not configured')
      return { success: false, error: 'MAILGUN_DOMAIN not configured' }
    }

    const from =
      this.configService.get<string>('EMAIL_FROM') || `Upward by GoodTenants <hello@${domain}>`

    let retries = 0
    let success = false
    let lastError = ''
    let mailgunId = ''

    while (retries < this.MAX_RETRIES && !success) {
      try {
        const mailData: any = {
          from,
          to: [email],
          subject,
          text,
          html,
          'h:List-Unsubscribe': `<${this.frontendUrl}/unsubscribe?email=${email}>`,
          'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
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

    // Publish Sent Event for logging/other side effects
    this.eventBus.publish(
      new EmailSentEvent(
        userId,
        email,
        subject,
        type,
        success ? 'SENT' : 'FAILED',
        mailgunId,
        success ? undefined : lastError,
        retries - 1 >= 0 ? retries - 1 : 0,
        sessionId,
        html,
      ),
    )

    if (!success) {
      this.bugsnag.notify(new Error(`Failed to send ${type} email to ${email}: ${lastError}`), {
        userId,
        email,
        subject,
        type,
        retries,
      })
    }

    // If it's a confirmation email, also update the user record
    if (type === 'CONFIRMATION') {
      await this.prisma.upward_waitlist.update({
        where: { id: userId },
        data: {
          confirmationSent: success,
          confirmationEmailStatus: success ? 'SENT' : 'FAILED',
          confirmationEmailError: success ? null : lastError,
          confirmationEmailRetries: retries > 0 ? retries - 1 : 0,
        },
      })
    }

    return { success, mailgunId, error: lastError }
  }

  async sendGenericEmail(email: string, subject: string, content: string, userId?: string) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    try {
      const response = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: subject,
        html: content,
        'h:List-Unsubscribe': `<${this.frontendUrl}/unsubscribe?email=${email}>`,
        'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      })

      // LOG IT via event bus!
      if (userId) {
        this.eventBus.publish(
          new EmailSentEvent(
            userId,
            email,
            subject,
            'BULK',
            'SENT',
            response.id,
            undefined,
            0,
            undefined,
            content,
          ),
        )
      }

      this.logger.log(`Generic email "${subject}" sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send generic email to ${email}`, error)
      this.bugsnag.notify(error, { email, subject, type: 'GENERIC' })
      throw error
    }
  }

  async sendDailyAnalyticsEmail(
    recipientEmail: string,
    stats: { completed: number; incomplete: number; total: number },
  ) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from =
      this.configService.get<string>('EMAIL_FROM') || `Upward Analytics <hello@${domain}>`
    const date = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
        <h2 style="color: #d97757; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Daily Signup Analytics</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Here is the summary for <strong>${date}</strong>:</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; border-collapse: separate; border-spacing: 16px 0;">
          <tr>
            <td width="50%" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 12px; text-align: center;">
              <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Completed</div>
              <div style="font-size: 36px; font-weight: 800; color: #14532d; line-height: 1;">${stats.completed}</div>
            </td>
            <td width="50%" style="background: #fff7ed; border: 1px solid #ffedd5; padding: 24px; border-radius: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Incomplete</div>
              <div style="font-size: 36px; font-weight: 800; color: #7c2d12; line-height: 1;">${stats.incomplete}</div>
            </td>
          </tr>
        </table>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin: 24px 16px 0; text-align: center;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Total New Signups</div>
          <div style="font-size: 28px; font-weight: 800; color: #111827; line-height: 1;">${stats.total}</div>
        </div>

        <p style="font-size: 13px; color: #9ca3af; margin-top: 40px; text-align: center; font-style: italic; line-height: 1.5;">
          This is an automated report generated by the Upward Cron Service.<br>
          Sent to superadmin users of Upward by GoodTenants.
        </p>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [recipientEmail],
        subject: `Upward Daily Report: ${date}`,
        html,
      })
      this.logger.log(`Daily analytics email sent to ${recipientEmail}`)
    } catch (error) {
      this.logger.error(`Failed to send daily analytics email to ${recipientEmail}`, error)
      this.bugsnag.notify(error, { email: recipientEmail, type: 'DAILY_ANALYTICS' })
    }
  }

  async sendPasswordResetOTP(
    email: string,
    fullName: string,
    otp: string,
    theme: 'CLAY' | 'FOREST' = 'CLAY',
  ) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const isForest = theme === 'FOREST'
    const primaryColor = isForest ? '#166534' : '#d97757'
    const bgColor = isForest ? '#faf9f5' : '#f9fafb'
    const borderStyle = isForest ? '1px solid rgba(22, 101, 52, 0.1)' : '1px solid #e5e7eb'
    const shadowStyle = isForest ? 'box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04);' : ''
    const outerBorder = isForest ? 'border: 1px solid rgba(0,0,0,0.06);' : ''

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px; ${outerBorder}">
        <div style="margin-bottom:32px;">
          <span style="color:${primaryColor};font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
          <div style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
        </div>
        <h2 style="color: ${primaryColor}; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello ${fullName},</p>
        <p style="font-size: 16px; color: #4b5563;">We received a request to reset your password. Use the code below to proceed. This code expires in 15 minutes.</p>
        
        <div style="background: #ffffff; border: ${borderStyle}; padding: 32px; border-radius: 12px; margin: 32px 0; text-align: center; ${shadowStyle}">
          <div style="font-size: 11px; color: ${primaryColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Verification Code</div>
          <div style="font-size: 48px; font-weight: 800; color: ${primaryColor}; letter-spacing: 0.1em; line-height: 1;">${otp}</div>
        </div>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; text-align: center;">
          If you didn't request this, you can safely ignore this email. Someone may have typed your email address by mistake.
        </p>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Your Upward Password Reset Code: ${otp}`,
        html,
      })
      this.logger.log(`Password reset OTP sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error)
      this.bugsnag.notify(error, { email, type: 'PASSWORD_RESET' })
      throw error
    }
  }

  async sendAuthOTP(
    email: string,
    otp: string,
    context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT',
    theme: 'CLAY' | 'FOREST' = 'CLAY',
  ) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const contexts = {
      SIGNUP: {
        title: 'Verify your email',
        message:
          'Welcome to Upward! Use the code below to verify your email address and complete your signup.',
        subject: `Verify your Upward account: ${otp}`,
      },
      LOGIN: {
        title: 'Login Verification',
        message: 'You requested to log in via verification code. Use the code below to proceed.',
        subject: `Your Upward Login Code: ${otp}`,
      },
      INVITE: {
        title: 'Accept Your Invite',
        message:
          'You have been invited to join Upward. Use the code below to verify your identity and accept the invite.',
        subject: `Your Upward Invite Verification Code: ${otp}`,
      },
      PAYMENT: {
        title: 'Verify Payment Access',
        message:
          'Use the code below to verify your access to this payment. This ensures your transaction is secure.',
        subject: `Your Upward Payment Verification Code: ${otp}`,
      },
      WAITLIST: {
        title: 'Claim Your Waitlist Spot',
        message:
          'Use the code below to verify your email and claim your spot on the Upward waitlist.',
        subject: `Your Upward Waitlist Verification Code: ${otp}`,
      },
    }

    const { title, message, subject } = contexts[context]

    const isForest = theme === 'FOREST'
    const primaryColor = isForest ? '#166534' : '#d97757'
    const bgColor = isForest ? '#faf9f5' : '#f9fafb'
    const borderStyle = isForest ? '1px solid rgba(22, 101, 52, 0.1)' : '1px solid #e5e7eb'
    const shadowStyle = isForest ? 'box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04);' : ''
    const outerBorder = isForest ? 'border: 1px solid rgba(0,0,0,0.06);' : ''

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: ${bgColor}; padding: 40px; border-radius: 16px; ${outerBorder}">
        <div style="margin-bottom:32px;">
          <span style="color:${primaryColor};font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
          <div style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
        </div>
        <h2 style="color: ${primaryColor}; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">${title}</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello,</p>
        <p style="font-size: 16px; color: #4b5563;">${message}</p>
        
        <div style="background: #ffffff; border: ${borderStyle}; padding: 32px; border-radius: 12px; margin: 32px 0; text-align: center; ${shadowStyle}">
          <div style="font-size: 11px; color: ${primaryColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Verification Code</div>
          <div style="font-size: 48px; font-weight: 800; color: ${primaryColor}; letter-spacing: 0.1em; line-height: 1;">${otp}</div>
        </div>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; text-align: center;">
          This code expires in 10 minutes.
        </p>
        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 24px; text-align: center;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject,
        html,
      })
      this.logger.log(`${context} OTP sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send ${context} OTP to ${email}`, error)
      this.bugsnag.notify(error, { email, type: context })
      throw error
    }
  }

  private getPmTypeLabel(pmType?: string | null): string {
    if (!pmType) return 'Property Manager'

    const types: Record<string, string> = {
      INDIVIDUAL_LANDLORD: 'Landlord',
      Caretaker: 'Caretaker',
      Lawyer: 'Lawyer',
      'Estate Agent': 'Estate Agent',
      'Property Manager': 'Property Manager',
      Company: 'Property Management Company',
    }

    return types[pmType] || 'Property Manager'
  }

  async sendTenantInvite(params: {
    email: string
    tenantName: string
    pmName: string
    inviteLink: string
    pmType?: string | null
  }): Promise<boolean> {
    const { email, tenantName, pmName, inviteLink, pmType } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`
    const pmRole = this.getPmTypeLabel(pmType)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #faf9f5; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(22, 101, 52, 0.05); }
          .header { background-color: #166534; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #faf9f5; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          .logo-sub { color: rgba(250, 249, 245, 0.7); font-size: 12px; }
          h1 { font-size: 22px; font-weight: 700; color: #166534; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 20px; }
          .bullet-list { margin-bottom: 24px; padding-left: 0; list-style: none; }
          .bullet-item { font-size: 16px; color: #4a4a4a; margin-bottom: 12px; position: relative; padding-left: 24px; line-height: 1.6; }
          .bullet-item::before { content: "•"; color: #166534; font-weight: bold; position: absolute; left: 0; }
          .btn { background-color: #166534; color: #faf9f5 !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f5; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
            <span class="logo-sub">${pmRole}</span>
          </div>
          <div class="content">
            <h1>Dear ${tenantName},</h1>
            <p>We're excited to let you know that <strong>${pmName}</strong> will now be using Upward to manage your rent payments and tenancy records.</p>
            
            <p>Upward is a simple platform designed to make your renting experience easier and more rewarding. With the platform, you can securely make rent payments, build a credibility score you can use anywhere, and get exclusive benefits from paying rent.</p>
            
            <p>Upward helps you:</p>
            <div class="bullet-list">
              <div class="bullet-item">Earn rewards for paying rent early and consistently</div>
              <div class="bullet-item">Get access to quality houses when moving homes</div>
              <div class="bullet-item">Get apartments based on your rental credibility, without discriminatory biases</div>
              <div class="bullet-item">Build a credibility profile that can be used anywhere.</div>
            </div>

            <p style="margin-bottom: 32px;">Getting started only takes a few minutes.</p>
            
            <a href="${inviteLink}" class="btn">Accept Upward Invite</a>
            
            <p style="margin-top: 32px; margin-bottom: 24px;">We look forward to giving you a smoother housing experience through Upward.</p>
            
            <p style="margin: 0; line-height: 1.6;">
              Your Cheerleader,<br>
              <strong>Liveable</strong>
            </p>
          </div>
          <div class="footer">
            <p class="footer-text">
              If you have any questions, please contact your ${pmRole.toLowerCase()} or reply to this email.<br>
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Invitation to join Upward from ${pmName}`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send tenant invite email to ${email}`, error)
      return false
    }
  }

  async sendPaymentRequestEmail(params: {
    email: string
    tenantName: string
    pmName: string
    amount: number
    currency: string
    dueDate: string | Date
    description?: string
    paymentLink: string
    pmType?: string | null
  }): Promise<boolean> {
    const {
      email,
      tenantName,
      pmName,
      amount,
      currency,
      dueDate,
      description,
      paymentLink,
      pmType,
    } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`
    const pmRole = this.getPmTypeLabel(pmType)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #faf9f5; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(22, 101, 52, 0.05); }
          .header { background-color: #166534; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #faf9f5; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          .logo-sub { color: rgba(250, 249, 245, 0.7); font-size: 12px; }
          h1 { font-size: 24px; font-weight: 700; color: #166534; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px; }
          .payment-badge { background-color: #f0f7f2; border: 1px solid #d1e7d8; padding: 24px; border-radius: 16px; margin-bottom: 32px; }
          .payment-label { font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: block; }
          .payment-amount { font-size: 32px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; display: block; }
          .payment-meta { font-size: 14px; color: #666; display: block; margin-top: 4px; }
          .btn { background-color: #166534; color: #faf9f5 !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f5; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
            <span class="logo-sub">Payment Request</span>
          </div>
          <div class="content">
            <h1>Payment Request from ${pmName}</h1>
            <p>Hello ${tenantName}, you have a new payment request for your property.</p>
            
            <div class="payment-badge">
              <span class="payment-label">Amount Due</span>
              <span class="payment-amount">${currency} ${amount.toLocaleString()}</span>
              <span class="payment-meta"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</span>
              ${description ? `<span class="payment-meta"><strong>Description:</strong> ${description}</span>` : ''}
            </div>

            <p>Please use the button below to view the breakdown and make your payment securely.</p>
            
            <a href="${paymentLink}" class="btn">View & Pay Now</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              If you have any questions about this request, please contact your ${pmRole.toLowerCase()} directly.<br>
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `New Payment Request: ${currency} ${amount.toLocaleString()} from ${pmName}`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send payment request email to ${email}`, error)
      return false
    }
  }

  async sendCredibilityRequestEmail(params: {
    email: string
    tenantName: string
    propertyAddress: string
    requestLink: string
    isRegisteredPm?: boolean
  }): Promise<boolean> {
    const { email, tenantName, propertyAddress, requestLink, isRegisteredPm } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const ctaText = isRegisteredPm ? 'Open Dashboard' : 'Review & Fulfill Request'
    const mainText = isRegisteredPm
      ? `A past tenant, <strong>${tenantName}</strong>, is requesting their rental history for <strong>${propertyAddress}</strong> to build their credit score on Upward.`
      : `<strong>${tenantName}</strong> has requested that you verify their past tenancy and payment records for <strong>${propertyAddress}</strong>.`

    const subText = isRegisteredPm
      ? 'Since you are already on Upward, you can fulfill this request directly from your dashboard Activity Center.'
      : 'Providing these records helps your former tenant build their credibility profile on Upward.'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #faf9f5; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(22, 101, 52, 0.05); }
          .header { background-color: #166534; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #faf9f5; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          h1 { font-size: 24px; font-weight: 700; color: #166534; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px; }
          .btn { background-color: #166534; color: #faf9f5 !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f5; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
          </div>
          <div class="content">
            <h1>Past Tenancy Record Request</h1>
            <p>Hello,</p>
            <p>${mainText}</p>
            <p>${subText}</p>
            <a href="${requestLink}" class="btn">${ctaText}</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Record Request from ${tenantName} for ${propertyAddress}`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send credibility request email to ${email}`, error)
      return false
    }
  }

  async sendNewUserRecordsEmail(params: {
    email: string
    pmName: string
    propertyAddress: string
    completeProfileLink: string
  }): Promise<boolean> {
    const { email, pmName, propertyAddress, completeProfileLink } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #faf9f5; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(22, 101, 52, 0.05); }
          .header { background-color: #166534; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #faf9f5; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          h1 { font-size: 24px; font-weight: 700; color: #166534; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px; }
          .btn { background-color: #166534; color: #faf9f5 !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f5; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
          </div>
          <div class="content">
            <h1>Your Past Records Have Been Added</h1>
            <p>Hello,</p>
            <p><strong>${pmName}</strong> has just added your past rent payment records for <strong>${propertyAddress}</strong> to Upward.</p>
            <p>You can proceed to complete your profile to see how this affects your tenancy score and unlocks better rental opportunities.</p>
            <a href="${completeProfileLink}" class="btn">Complete Your Profile</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Your past rent records have been added on Upward`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send new user records email to ${email}`, error)
      return false
    }
  }
  async sendLandlordWelcome(params: {
    email: string
    landlordName: string
    tempPassword: string
    portalLink: string
  }): Promise<boolean> {
    const { email, landlordName, tempPassword, portalLink } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #faf9f5; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(22, 101, 52, 0.05); }
          .header { background-color: #166534; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #faf9f5; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          h1 { font-size: 24px; font-weight: 700; color: #166534; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px; }
          .badge { background-color: #f0f7f2; border: 1px solid #d1e7d8; padding: 24px; border-radius: 16px; margin-bottom: 32px; }
          .label { font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: block; }
          .password { font-size: 24px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; display: block; font-family: monospace; }
          .btn { background-color: #166534; color: #faf9f5 !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f5; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
            <span style="color: rgba(253, 252, 251, 0.7); font-size: 12px;">Landlord Portal</span>
          </div>
          <div class="content">
            <h1>Welcome to Upward, ${landlordName}</h1>
            <p>Your property manager has invited you to the Upward Landlord Portal. Here you can view real-time summary analysis of your properties, units, and rental revenue.</p>
            
            <div class="badge">
              <span class="label">Temporary Password</span>
              <span class="password">${tempPassword}</span>
              <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">You will be required to change this password upon your first login.</p>
            </div>

            <p>Access your dashboard using the button below:</p>
            
            <a href="${portalLink}" class="btn">Login to Landlord Portal</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              If you didn't expect this invitation, please contact your property manager.<br>
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Welcome to Upward Landlord Portal`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send landlord welcome email to ${email}`, error)
      return false
    }
  }

  async sendLandlordNewPropertyAssignment(params: {
    email: string
    landlordName: string
    portalLink: string
  }): Promise<boolean> {
    const { email, landlordName, portalLink } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #fdfcfb; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(13, 77, 43, 0.05); }
          .header { background-color: #0d4d2b; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #fdfcfb; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          h1 { font-size: 24px; font-weight: 700; color: #0d4d2b; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px; }
          .btn { background-color: #0d4d2b; color: #fdfcfb !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f6; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
            <span style="color: rgba(253, 252, 251, 0.7); font-size: 12px;">Landlord Portal</span>
          </div>
          <div class="content">
            <h1>New Property Assigned, ${landlordName}</h1>
            <p>A property manager has just added a new property to your portfolio on Upward.</p>
            <p>You can now view real-time analysis and reports for this property by logging into your portal.</p>
            
            <a href="${portalLink}" class="btn">View Your Portfolio</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `New Property Added to Your Upward Portfolio`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send landlord new assignment email to ${email}`, error)
      return false
    }
  }

  async sendRecordAddedEmail(params: {
    email: string
    pmName: string
    propertyAddress: string
  }): Promise<boolean> {
    const { email, pmName, propertyAddress } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #fdfcfb; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e6e1; box-shadow: 0 10px 25px rgba(13, 77, 43, 0.05); }
          .header { background-color: #0d4d2b; padding: 40px; text-align: left; }
          .content { padding: 48px; }
          .logo-text { color: #fdfcfb; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: block; }
          h1 { font-size: 24px; font-weight: 700; color: #0d4d2b; margin-bottom: 24px; line-height: 1.3; }
          p { font-size: 16px; line-height: 1.7; color: #4a4a4a; margin-bottom: 24px; }
          .btn { background-color: #0d4d2b; color: #fdfcfb !important; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s; text-align: center; width: 100%; box-sizing: border-box; }
          .footer { padding: 32px 48px; border-top: 1px solid #f0eee9; background-color: #faf9f6; }
          .footer-text { font-size: 13px; color: #8c8c8c; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Upward</span>
          </div>
          <div class="content">
            <h1>New Rental Records Added</h1>
            <p>Hello,</p>
            <p><strong>${pmName}</strong> has just updated your rental payment history for <strong>${propertyAddress}</strong> on Upward.</p>
            <p>These records help build your rental credibility score and showcase your consistency as a tenant.</p>
            <a href="${this.frontendUrl}/dashboard" class="btn">View Your Rent Passport</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              © 2026 Upward by GoodTenants. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const result = await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `New rent records added by ${pmName} for ${propertyAddress}`,
        html,
      })
      return !!result.id
    } catch (error) {
      this.logger.error(`Failed to send record added email to ${email}`, error)
      return false
    }
  }

  async sendDataDeletionRequestConfirmation(email: string) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward Privacy <hello@${domain}>`

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
        <div style="margin-bottom:32px;">
          <span style="color:#d97757;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
          <div style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
        </div>
        <h2 style="color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Data Deletion Request</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello,</p>
        <p style="font-size: 16px; color: #4b5563;">We have received a request to delete all data associated with this email address from our systems.</p>
        
        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin: 32px 0;">
          <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">
            <strong>Important:</strong> This process is irreversible. Once we proceed, your Rent Passport, payment history, and all account details will be permanently removed.
          </p>
        </div>

        <p style="font-size: 16px; color: #4b5563;">
          To ensure the security of your data, we require you to confirm this request by replying to this email or clicking the button below (if available). 
          If you did not initiate this request, please ignore this email and your data will remain safe.
        </p>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          Best regards,<br>
          The Upward Privacy Team
        </p>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: 'Confirm your data deletion request',
        html,
      })
      this.logger.log(`Data deletion request confirmation sent to ${email}`)
      return { success: true }
    } catch (error) {
      this.logger.error(`Failed to send data deletion confirmation to ${email}`, error)
      this.bugsnag.notify(error, { email, type: 'DATA_DELETION_REQUEST' })
      throw error
    }
  }

  async sendTeamInvitation(params: {
    email: string
    name: string
    inviterName: string
    isNewAccount: boolean
    claimLink: string
  }) {
    const { email, name, inviterName, isNewAccount, claimLink } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #0a0a0f; background-color: #faf9f5; padding: 48px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.06);">
        <div style="margin-bottom: 40px;">
          <span style="color: #166534; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">Upward PM</span>
          <div style="color: #8a8a8a; font-size: 12px; margin-top: 4px;">Property Management Collaboration</div>
        </div>
        <h2 style="color: #166534; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">Team Invitation</h2>
        <p style="font-size: 16px; color: #4a4642; line-height: 1.6; margin-bottom: 24px;">Hello ${name},</p>
        <p style="font-size: 16px; color: #4a4642; line-height: 1.6; margin-bottom: 32px;">
          <strong>${inviterName}</strong> has invited you to collaborate on their properties on the Upward PM platform.
        </p>
        
        <div style="background: #ffffff; border: 1px solid rgba(22, 101, 52, 0.1); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04);">
          <p style="font-size: 15px; color: #8a8a8a; margin-bottom: 24px; line-height: 1.5;">
            ${
              isNewAccount
                ? 'An account has been prepared for you. Click the button below to claim your access and set your password.'
                : 'You have been granted access to new properties. You can now manage them from your existing dashboard.'
            }
          </p>
          <a href="${claimLink}" style="background-color: #166534; color: #ffffff; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background-color 0.2s;">
            ${isNewAccount ? 'Claim Your Access' : 'Go to Dashboard'}
          </a>
        </div>

        <p style="font-size: 14px; color: #8a8a8a; line-height: 1.6; margin-top: 40px; text-align: center;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
        
        <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(0,0,0,0.06); text-align: center;">
          <p style="font-size: 12px; color: #8a8a8a;">
            &copy; 2026 Upward by GoodTenants. Built for professional property managers.
          </p>
        </div>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Collaboration Invite from ${inviterName}`,
        html,
      })
      this.logger.log(`Team invitation sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send team invitation to ${email}`, error)
      throw error
    }
  }

  async sendPmAuthOTP(email: string, otp: string, context: 'SIGNUP' | 'LOGIN') {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward PM <hello@${domain}>`

    const contexts = {
      SIGNUP: {
        title: 'Create Your PM Account',
        message:
          'Welcome to the Upward Property Management platform. Use the code below to verify your email and start managing your properties.',
        subject: `Verify your Upward PM account: ${otp}`,
      },
      LOGIN: {
        title: 'Secure Portal Login',
        message:
          'A login attempt was made for your Upward PM account. Use the verification code below to securely access your dashboard.',
        subject: `Your Upward PM Login Code: ${otp}`,
      },
    }

    const { title, message, subject } = contexts[context]

    const html = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #0a0a0f; background-color: #faf9f5; padding: 48px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.06);">
        <div style="margin-bottom: 40px;">
          <span style="color: #166534; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">Upward PM</span>
          <div style="color: #8a8a8a; font-size: 12px; margin-top: 4px;">Property Management Platform</div>
        </div>
        <h2 style="color: #166534; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">${title}</h2>
        <p style="font-size: 16px; color: #4a4642; line-height: 1.6; margin-bottom: 32px;">${message}</p>
        
        <div style="background: #ffffff; border: 1px solid rgba(22, 101, 52, 0.1); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 8px 24px rgba(22, 101, 52, 0.04);">
          <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; margin-bottom: 16px;">Verification Code</div>
          <div style="font-size: 56px; font-weight: 800; color: #166534; letter-spacing: 0.15em; line-height: 1; font-variant-numeric: tabular-nums;">${otp}</div>
        </div>

        <p style="font-size: 14px; color: #8a8a8a; line-height: 1.6; margin-top: 40px; text-align: center;">
          This code expires in 10 minutes. If you did not request this, please ignore this email.
        </p>
        
        <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(0,0,0,0.06); text-align: center;">
          <p style="font-size: 12px; color: #8a8a8a;">
            &copy; 2026 Upward by GoodTenants. Professional Property Management Simplified.
          </p>
        </div>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject,
        html,
      })
      this.logger.log(`PM ${context} OTP sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send PM ${context} OTP to ${email}`, error)
      this.bugsnag.notify(error, { email, type: `PM_${context}` })
      throw error
    }
  }

  async sendJoinRequestRejection(params: {
    email: string
    tenantName: string
    pmName: string
    propertyAddress: string
    reason?: string
  }): Promise<boolean> {
    const { email, tenantName, pmName, propertyAddress, reason } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Connection Request Declined</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello ${tenantName},</p>
        <p style="font-size: 16px; color: #4b5563;">Your request to connect with <strong>${pmName}</strong> for the property at <strong>${propertyAddress}</strong> has been declined.</p>
        
        ${
          reason
            ? `
        <div style="background: #FEF2F2; border: 1px solid #FEE2E2; padding: 24px; border-radius: 12px; margin: 24px 0;">
          <div style="font-size: 11px; color: #991B1B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Reason from Manager</div>
          <p style="font-size: 15px; color: #7F1D1D; margin: 0; line-height: 1.5;">${reason}</p>
        </div>
        `
            : ''
        }

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          You can try reconnecting with a different email address or contact the manager directly if you believe this was an error.
        </p>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Update on your connection request for ${propertyAddress}`,
        html,
      })
      return true
    } catch (error) {
      this.logger.error(`Failed to send join rejection email to ${email}`, error)
      return false
    }
  }

  async sendCredibilityRequestRejection(params: {
    email: string
    tenantName: string
    pmName: string
    propertyAddress: string
    reason?: string
  }): Promise<boolean> {
    const { email, tenantName, pmName, propertyAddress, reason } = params
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Record Request Declined</h2>
        <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello ${tenantName},</p>
        <p style="font-size: 16px; color: #4b5563;">Your request for past tenancy records for <strong>${propertyAddress}</strong> has been declined by the manager.</p>
        
        ${
          reason
            ? `
        <div style="background: #FEF2F2; border: 1px solid #FEE2E2; padding: 24px; border-radius: 12px; margin: 24px 0;">
          <div style="font-size: 11px; color: #991B1B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Reason from Manager</div>
          <p style="font-size: 15px; color: #7F1D1D; margin: 0; line-height: 1.5;">${reason}</p>
        </div>
        `
            : ''
        }

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          This request will no longer appear as pending on your dashboard.
        </p>
      </div>
    `

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: `Update on your record request for ${propertyAddress}`,
        html,
      })
      return true
    } catch (error) {
      this.logger.error(`Failed to send credibility rejection email to ${email}`, error)
      return false
    }
  }
}
