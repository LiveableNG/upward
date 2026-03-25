import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { PrismaService } from '../prisma/prisma.service'
import { formatName } from '@upward/common-utils'
import { BugsnagService } from '../common/bugsnag/bugsnag.service'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mg: any
  private readonly MAX_RETRIES = 3

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private bugsnag: BugsnagService,
  ) {
    const mailgun = new Mailgun(FormData)
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY')
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')

    if (!apiKey || !domain) {
      this.logger.warn('Mailgun credentials not fully configured.')
    }

    this.mg = mailgun.client({
      username: 'api',
      key: apiKey || '',
    })
  }

  async sendWaitlistConfirmation(userId: string, email: string, firstName?: string) {
    const formattedName = firstName ? formatName(firstName) : 'there'
    const displayName = firstName ? `, ${formattedName}` : ''

    const emailData = {
      subject: 'Welcome to the Upward Waitlist — You’re In',
      text: `Hello ${formattedName},\n\nYou're officially on the waitlist for Upward by GoodTenants.\n\nUpward is designed to make finding and securing your next home significantly easier. As a waitlist member, you'll receive early access when we begin onboarding users.\n\nWe will notify you as soon as your access becomes available.\n\nThank you for joining us early.\n\n— Upward by GoodTenants\nhello@goodtenants.africa`,
      html: `<!DOCTYPE html>
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
      <h1 class="greeting" style="color:#111827;font-size:24px;font-weight:700;margin:0 0 20px 0;line-height:1.2;">Hello${displayName},</h1>
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
      <p class="footer-text" style="color:#6B7280;font-size:15px;margin:0;">Thank you for joining early.</p>
      <p class="brand-name" style="color:#d97757;font-size:16px;margin-top:12px;font-weight:600;">The Upward Team</p>
      </td>
      </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin-top:24px;">
      <tr>
      <td align="center" style="padding: 0 20px;">
      <p class="supporting-text" style="color:#9CA3AF;font-size:12px;margin:0 0 8px 0;text-align:center;">You received this email because you joined the waitlist at https://upward.goodtenants.io</p>
      <p class="supporting-text" style="color:#9CA3AF;font-size:12px;margin:0;text-align:center;">Questions? <a class="support-link" href="mailto:hello@goodtenants.africa" style="color:#6B7280;text-decoration:underline;">Contact Support</a></p>
      <p style="color:#D1D5DB;font-size:11px;margin-top:20px;text-align:center;">Upward by GoodTenants</p>
      </td>
      </tr>
      </table>
      </td>
      </tr>
      </table>
      </body>
      </html>`,
    }

    return await this.sendEmailWithRetry({
      userId,
      email,
      ...emailData,
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
  }) {
    const { userId, email, subject, text, html, type, sessionId } = params
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

    // Create initial log entry
    const log = await this.prisma.upward_email_log.create({
      data: {
        userId,
        email,
        subject,
        type,
        status: 'PENDING',
        sessionId,
      },
    })

    while (retries < this.MAX_RETRIES && !success) {
      try {
        const response = await this.mg.messages.create(domain, {
          from,
          to: [email],
          subject,
          text,
          html,
        })
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

    // Update log entry
    await this.prisma.upward_email_log.update({
      where: { id: log.id },
      data: {
        status: success ? 'SENT' : 'FAILED',
        mailgunId,
        lastError: success ? null : lastError,
        retries: retries - 1 >= 0 ? retries - 1 : 0,
        sentAt: success ? new Date() : null,
      },
    })

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

  async sendGenericEmail(email: string, subject: string, content: string) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: subject,
        html: content,
      })
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
}
