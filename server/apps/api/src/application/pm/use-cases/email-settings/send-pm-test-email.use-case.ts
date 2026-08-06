import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../../shared/infrastructure/email/email.service'

@Injectable()
export class SendPmTestEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async execute(pmUuid: string, targetEmail: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { emailSetting: true },
    })
    if (!pm) throw new BadRequestException('Property manager not found')
    if (!pm.emailSetting) throw new BadRequestException('Email settings not configured yet')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 32px; margin: 0;">
          <div class="footer" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 32px;">
            <h1 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 16px;">Test Email Configuration</h1>
            <p style="font-size: 14px; line-height: 24px; color: #374151;">
              This is a test email sent from your newly configured email settings on Upward. Your sender details, custom domain, branding, and closing signatures are configured correctly!
            </p>
          </div>
        </body>
      </html>
    `

    const result = await this.emailService.sendEmailWithRetry({
      userId: pm.uuid,
      pmUuid: pm.uuid,
      email: targetEmail,
      subject: `Test Email from ${pm.emailSetting.senderName}`,
      html: emailHtml,
      type: 'TEST_EMAIL',
    })

    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to send test email')
    }

    return { message: 'Test email sent successfully' }
  }
}
