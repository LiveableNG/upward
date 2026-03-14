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

    const name = firstName ? ` ${firstName}` : ''

    try {
      await this.mg.messages.create(domain, {
        from,
        to: [email],
        subject: "You're on the list! Welcome to Upward",
        text: `Hi${name},\n\nThanks for joining the Upward waitlist! We're excited to have you with us.\n\nWe'll send you an invite as soon as priority access drops. Be on the lookout!\n\nBest,\nThe Upward Team`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p>Hi${name},</p>
            <p>Thanks for joining the <strong>Upward</strong> waitlist! We're excited to have you with us.</p>
            <p>We'll send you an invite as soon as priority access drops. Be on the lookout!</p>
            <br />
            <p>Best,<br />The Upward Team</p>
          </div>
        `,
      })
      this.logger.log(`Confirmation email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error)
    }
  }
}
