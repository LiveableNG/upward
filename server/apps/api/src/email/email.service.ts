import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mg: any

  constructor(private configService: ConfigService) {
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

  async sendWaitlistConfirmation(email: string, firstName?: string) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from =
      this.configService.get<string>('EMAIL_FROM') || `Upward by GoodTenants <hello@${domain}>`

    const name = firstName ? firstName : 'there'
    const displayName = firstName ? `, ${firstName}` : ''

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: 'Welcome to the Upward Waitlist — You’re In',
        text: `Hello ${name},

      You're officially on the waitlist for Upward by GoodTenants.

      Upward is designed to make finding and securing your next home significantly easier. As a waitlist member, you'll receive early access when we begin onboarding users.

      We will notify you as soon as your access becomes available.

      Thank you for joining us early.

      — Upward by GoodTenants
      hello@goodtenants.africa`,

        html: `<!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upward Waitlist</title>
      </head>

      <body style="margin:0;padding:0;background:#141413;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

      <table width="100%" cellpadding="0" cellspacing="0" style="padding:60px 20px;background:#141413;">
      <tr>
      <td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1c1c1b;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

      <tr>
      <td style="height:4px;background:#d97757;"></td>
      </tr>

      <tr>
      <td style="padding:48px 40px;">

      <div style="margin-bottom:32px;">
      <span style="color:#d97757;font-size:13px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;">
      Upward
      </span>
      <div style="color:#8a8a8a;font-size:12px;margin-top:6px;">
      by GoodTenants
      </div>
      </div>

      <h1 style="color:#faf9f5;font-size:30px;font-weight:600;margin:0 0 24px 0;">
      Hello${displayName},
      </h1>

      <p style="color:#faf9f5;font-size:16px;line-height:1.6;margin:0 0 18px 0;">
      You are now officially on the waitlist for <strong>Upward by GoodTenants</strong>.
      </p>

      <p style="color:#8a8a8a;font-size:16px;line-height:1.6;margin:0 0 28px 0;">
      Upward is being built to simplify how people discover, evaluate, and secure rental homes. As a waitlist member, you'll be among the first to receive access when onboarding begins.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
      <td style="background:rgba(217,119,87,0.05);border:1px solid rgba(217,119,87,0.12);border-radius:14px;padding:22px;">
      <div style="color:#d97757;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
      What happens next
      </div>

      <p style="color:#faf9f5;font-size:15px;margin:0;line-height:1.5;">
      We will notify you as soon as early access becomes available. You may also receive occasional updates as we prepare for launch.
      </p>
      </td>
      </tr>
      </table>

      <p style="color:#8a8a8a;font-size:15px;margin:0;">
      Thank you for joining early.
      </p>

      <p style="color:#d97757;font-size:16px;margin-top:12px;font-weight:500;">
      The Upward Team
      </p>

      </td>
      </tr>

      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:28px;">
      <tr>
      <td align="center">

      <p style="color:#555;font-size:12px;margin:0 0 8px 0;">
      You received this email because you joined the waitlist at upward.ng
      </p>

      <p style="color:#555;font-size:12px;margin:0;">
      Questions? 
      <a href="mailto:hello@goodtenants.africa" style="color:#888;text-decoration:underline;">
      Contact Support
      </a>
      </p>

      <p style="color:#444;font-size:11px;margin-top:16px;">
      Upward by GoodTenants
      </p>

      </td>
      </tr>
      </table>

      </td>
      </tr>
      </table>

      </body>
      </html>`,
      })

      this.logger.log(`Confirmation email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error)
    }
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
      throw error
    }
  }
}
