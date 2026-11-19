import { Logger } from '@nestjs/common'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { SmsService } from '../../../shared/infrastructure/sms/sms.service'

const logger = new Logger('CommerceCommsHelper')

function buildBrandedHtml(title: string, bodyLines: string[], ctaUrl?: string, ctaLabel?: string): string {
  const paragraphs = bodyLines
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3d3834;">${line}</p>`)
    .join('')

  const ctaHtml =
    ctaUrl && ctaLabel
      ? `<div style="margin:24px 0 8px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#d97757;color:#ffffff;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;text-decoration:none;">
            ${ctaLabel}
          </a>
        </div>`
      : ''

  return `
    <div style="font-family:'Plus Jakarta Sans',Inter,-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;background:#faf8f5;">
      <div style="background:#ffffff;border:1px solid #ece5dc;border-radius:16px;padding:28px 24px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d97757;margin-bottom:8px;">
          Upward Lifestyle &amp; Services
        </div>
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1714;line-height:1.3;">
          ${title}
        </h2>
        ${paragraphs}
        ${ctaHtml}
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#8a8178;">
        Upward by Goodtenants — Verified Home &amp; Lifestyle Services
      </p>
    </div>
  `
}

export async function notifyCustomerCommerceMilestone(params: {
  notificationService?: NotificationService
  emailService?: EmailService
  smsService?: SmsService
  userId: number
  userEmail?: string | null
  userPhone?: string | null
  title: string
  message: string
  emailSubject: string
  emailLines: string[]
  smsText?: string
  url: string
  ctaLabel?: string
  type?: string
  data?: Record<string, string>
}): Promise<void> {
  const {
    notificationService,
    emailService,
    smsService,
    userId,
    userEmail,
    userPhone,
    title,
    message,
    emailSubject,
    emailLines,
    smsText,
    url,
    ctaLabel,
    type = 'COMMERCE_ORDER',
    data,
  } = params

  // 1. Always dispatch In-App + Push Notification
  if (notificationService) {
    try {
      await notificationService.notifyUser(userId, {
        title,
        message,
        type,
        url,
        data,
      })
    } catch (err) {
      logger.warn(`Failed to send push/in-app notification to user ${userId}: ${err}`)
    }
  }

  // 2. Dispatch Email if user has an email address; otherwise fallback to SMS
  const hasValidEmail = Boolean(userEmail && userEmail.includes('@'))
  const webBase = (process.env.FRONTEND_URL || process.env.UPWARD_PAY_URL || 'https://pay.goodtenants.africa').replace(/\/$/, '')
  const fullUrl = url.startsWith('http') ? url : `${webBase}${url}`

  if (hasValidEmail && emailService) {
    try {
      await emailService.sendEmailWithRetry({
        email: userEmail!,
        subject: emailSubject,
        html: buildBrandedHtml(title, emailLines, fullUrl, ctaLabel || 'View Service Order'),
        text: `${title}\n\n${emailLines.join('\n')}\n\nView order: ${fullUrl}`,
        type,
      })
    } catch (err) {
      logger.warn(`Failed to send commerce email to ${userEmail}: ${err}`)
    }
  } else if (userPhone && smsService) {
    try {
      await smsService.sendSms({
        to: userPhone,
        message: smsText || `${title}: ${message}`,
      })
    } catch (err) {
      logger.warn(`Failed to send commerce SMS fallback to ${userPhone}: ${err}`)
    }
  }
}

export async function notifyAdminCommerceEvent(params: {
  emailService?: EmailService
  subject: string
  title: string
  lines: string[]
  type?: string
  roles?: string[]
}): Promise<void> {
  const { emailService, subject, title, lines, type = 'ADMIN_COMMERCE_ALERT', roles } = params
  if (!emailService) return

  try {
    await emailService.sendSystemAlertToAdmins(
      subject,
      `${title}\n\n${lines.join('\n')}`,
      {
        roles,
        htmlOverride: buildBrandedHtml(title, lines),
        type,
      },
    )
  } catch (err) {
    logger.warn(`Failed to send admin commerce alert email (${subject}): ${err}`)
  }
}
