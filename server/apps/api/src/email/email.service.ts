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
      this.logger.warn('Mailgun credentials not fully configured. Email sending might fail.')
    }

    this.mg = mailgun.client({
      username: 'api',
      key: apiKey || '',
    })
  }

  async sendWaitlistConfirmation(email: string, firstName?: string) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    const from = this.configService.get<string>('EMAIL_FROM') || `Upward <hello@${domain}>`

    const name = firstName ? firstName : 'there'
    const displayName = firstName ? `, ${firstName}` : ''

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: "You're in — Welcome to the Upward waitlist 🚀",
        text: `Hey ${name},\n\nYou made it — you're officially on the Upward waitlist.\n\nWe're building something we think you're going to love, and you'll be among the very first to experience it.\n\nWhen priority access opens up, we'll reach out to you directly. Keep an eye on your inbox.\n\nWelcome aboard,\nThe Upward Team\nhello@${domain}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Upward</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1eb; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f1eb; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Logo / Brand bar -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0f1b2d; border-radius: 50px; padding: 10px 28px;">
                    <span style="color: #c9a84c; font-family: Georgia, serif; font-size: 18px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase;">UPWARD</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color: #0f1b2d; border-radius: 20px; overflow: hidden;">

              <!-- Gold accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(90deg, #c9a84c, #e8cc7a, #c9a84c); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card content -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 52px 48px 48px;">

                    <!-- Greeting -->
                    <p style="margin: 0 0 8px 0; color: #c9a84c; font-family: Georgia, serif; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Welcome aboard</p>
                    <h1 style="margin: 0 0 28px 0; color: #f7f2e8; font-family: Georgia, serif; font-size: 32px; font-weight: normal; line-height: 1.25;">
                      Hey${displayName}, you're on<br />the list. ✦
                    </h1>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="border-top: 1px solid rgba(201,168,76,0.25); font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Body copy -->
                    <p style="margin: 0 0 18px 0; color: #b8b0a0; font-family: Georgia, serif; font-size: 16px; line-height: 1.75;">
                      You're officially on the <span style="color: #f7f2e8; font-style: italic;">Upward</span> waitlist — and that means something. We're building something we think you're going to love, and you're among the very first to know about it.
                    </p>
                    <p style="margin: 0 0 36px 0; color: #b8b0a0; font-family: Georgia, serif; font-size: 16px; line-height: 1.75;">
                      When priority access opens, you'll hear from us directly. Keep an eye on your inbox — good things are coming.
                    </p>

                    <!-- CTA-style info block -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 40px;">
                      <tr>
                        <td style="background-color: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 12px; padding: 20px 24px;">
                          <p style="margin: 0 0 4px 0; color: #c9a84c; font-family: Georgia, serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">What happens next</p>
                          <p style="margin: 0; color: #f7f2e8; font-family: Georgia, serif; font-size: 15px; line-height: 1.6;">We'll send your personal invite the moment priority access opens. No spam — just your one email when the time is right.</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="border-top: 1px solid rgba(201,168,76,0.15); font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Signature -->
                    <p style="margin: 0 0 4px 0; color: #f7f2e8; font-family: Georgia, serif; font-size: 15px;">Warmly,</p>
                    <p style="margin: 0; color: #c9a84c; font-family: Georgia, serif; font-size: 15px; font-style: italic;">The Upward Team</p>

                  </td>
                </tr>
              </table>

              <!-- Bottom gold bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(90deg, #c9a84c, #e8cc7a, #c9a84c); height: 2px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0 0 6px 0; color: #8a8070; font-family: Georgia, serif; font-size: 12px;">
                You're receiving this because you joined the Upward waitlist.
              </p>
              <p style="margin: 0; color: #8a8070; font-family: Georgia, serif; font-size: 12px;">
                Questions? Reach us at <a href="mailto:hello@${domain}" style="color: #c9a84c; text-decoration: none;">hello@${domain}</a>
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
}
