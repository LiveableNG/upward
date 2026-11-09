import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

function formatKoboToNgn(kobo: bigint, currency = 'NGN'): string {
  const amount = Number(kobo) / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

@Injectable()
export class SendCommerceThankYouEmailUseCase {
  private readonly logger = new Logger(SendCommerceThankYouEmailUseCase.name)
  private readonly frontendUrl: string

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'https://upward.goodtenants.io'
    )
      .split(',')[0]!
      .trim()
  }

  async execute(
    orderId: number,
    subOrderId?: number,
  ): Promise<{ emailSent: boolean; notificationSent: boolean; alreadySent?: boolean }> {
    const order = await this.orderRepo.findOrderById(orderId)
    if (!order) {
      this.logger.warn(`Cannot send thank-you email: Order #${orderId} not found`)
      return { emailSent: false, notificationSent: false }
    }

    // 1. Idempotency Check: Avoid sending multiple thank you emails for the same order
    const auditExisting = await this.prisma.upward_commerce_order_audit.findFirst({
      where: {
        orderId,
        event: 'THANK_YOU_EMAIL_DISPATCHED',
      },
    })
    if (auditExisting) {
      this.logger.debug(
        `Thank-you email already sent previously for order #${orderId} (${order.orderNumber})`,
      )
      return { emailSent: false, notificationSent: false, alreadySent: true }
    }

    // 2. Resolve User details
    const user = await this.userRepo.findById(order.userId)
    if (!user) {
      return { emailSent: false, notificationSent: false }
    }

    let tenantEmail: string | null = null
    let tenantName = order.recipientName

    try {
      if (user.email) {
        tenantEmail = this.encryption.decrypt(user.email)
      }
      const first = user.firstName ? this.encryption.decrypt(user.firstName) : ''
      const last = user.lastName ? this.encryption.decrypt(user.lastName) : ''
      const full = `${first} ${last}`.trim()
      if (full) tenantName = full
    } catch {
      // fallback to order recipient
    }

    // 3. Dispatch In-App Notification
    let notificationSent = false
    try {
      await this.notificationService.notifyUser(order.userId, {
        title: 'Order Completed - Thank You!',
        message: `Your Upward order ${order.orderNumber} is now complete. Thank you for choosing Upward Lifestyle!`,
        type: 'PAYMENT',
        url: `/dashboard/lifestyle/orders/${order.uuid}`,
      })
      notificationSent = true
    } catch (err) {
      this.logger.error(
        `Failed to dispatch completion in-app notification for order #${orderId}`,
        err,
      )
    }

    // 4. Dispatch Branded Thank You Email
    let emailSent = false
    if (tenantEmail && !tenantEmail.endsWith('@upward.com')) {
      try {
        const trackingUrl = `${this.frontendUrl}/dashboard/lifestyle/orders/${order.uuid}`

        // Collect items summary
        const itemsSummary: string[] = []
        ;(order.subOrders || []).forEach((sub) => {
          ;(sub.items || []).forEach((item) => {
            const snap = (item.snapshotData as any) || {}
            itemsSummary.push(`${item.quantity}x ${snap.title || `Offering #${item.offeringId}`}`)
          })
        })

        const itemsListHtml =
          itemsSummary.length > 0
            ? itemsSummary
                .map((it) => `<li style="margin-bottom: 6px; color: #1E1B18;">${it}</li>`)
                .join('')
            : '<li style="color: #1E1B18;">Lifestyle Order Package</li>'

        const html = `
          <div style="background-color: #F6F4EE; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1E1B18;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #EAE6DF; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
              <!-- Top Gradient Accent -->
              <tr>
                <td style="background: linear-gradient(90deg, #059669 0%, #047857 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
              </tr>
              <!-- Brand Header -->
              <tr>
                <td style="padding: 32px 32px 20px; border-bottom: 1px solid #F0ECE4;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle">
                        <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #1E1B18; line-height: 1;">
                          UPWARD
                        </div>
                        <div style="font-size: 9.5px; font-weight: 600; letter-spacing: 1.5px; color: #8A8275; margin-top: 4px; text-transform: uppercase;">
                          Commerce &amp; Lifestyle
                        </div>
                      </td>
                      <td align="right" valign="middle">
                        <span style="display: inline-block; background-color: #DEF7EC; border: 1px solid #A7F3D0; color: #03543F; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                          ✓ FULFILMENT COMPLETE
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Hero Content -->
              <tr>
                <td style="padding: 28px 32px 20px;">
                  <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #1E1B18; letter-spacing: -0.3px;">
                    Thank You, ${tenantName}!
                  </h1>
                  <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5C554B;">
                    Your order has been successfully delivered and completed. We hope you enjoy your new experience.
                  </p>

                  <!-- Completed Order Card -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #EAE6DF; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px 20px; background-color: #FAF8F5; border-bottom: 1px solid #EAE6DF;">
                        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #8A8275;">Completed Order</div>
                        <div style="font-size: 16px; font-weight: 700; color: #1E1B18; margin-top: 3px;">${order.orderNumber}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 18px 20px; background-color: #FFFFFF; border-bottom: 1px solid #F0ECE4;">
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275; margin-bottom: 8px;">Delivered Items</div>
                        <ul style="margin: 0 0 0 18px; padding: 0; font-size: 13.5px; line-height: 1.6; color: #1E1B18;">
                          ${itemsListHtml}
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 20px; background-color: #FAFAFA;">
                        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Delivered To</div>
                        <div style="font-size: 13px; line-height: 1.5; color: #5C554B; margin-top: 3px;">${order.deliveryAddress}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Primary CTA Button -->
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                    <tr>
                      <td align="center" style="border-radius: 10px; background-color: #B65B37;">
                        <a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                          View Order Details &amp; Receipt &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #FAFAFA; border-top: 1px solid #EAE6DF; text-align: center;">
                  <p style="margin: 0 0 6px; font-size: 12px; color: #8A8275;">
                    Have questions, feedback, or need customer support?
                  </p>
                  <p style="margin: 0 0 16px; font-size: 12.5px; color: #1E1B18;">
                    Our support team is always ready to help at <a href="mailto:hello@goodtenants.africa" style="color: #B65B37; font-weight: 700; text-decoration: underline;">hello@goodtenants.africa</a>
                  </p>
                  <div style="font-size: 11px; color: #B0A99E;">
                    &copy; ${new Date().getFullYear()} Upward Platform &middot; GoodTenants. All rights reserved.
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `

        await this.emailService.sendEmailWithRetry({
          email: tenantEmail,
          subject: `Thank you for your order! (${order.orderNumber}) - Upward Lifestyle`,
          html,
          type: 'COMMERCE_ORDER_COMPLETED_THANK_YOU',
        })

        emailSent = true

        // Record audit entry for idempotency
        await this.orderRepo.recordAuditLog(orderId, {
          event: 'THANK_YOU_EMAIL_DISPATCHED',
          fromState: order.status,
          toState: order.status,
          actorType: 'SYSTEM',
          actorId: 'COMMERCE_NOTIFIER',
          details: {
            recipientEmail: tenantEmail,
            deliveredAt: new Date().toISOString(),
          },
        })
      } catch (err) {
        this.logger.error(`Failed to send thank-you email for order #${orderId}`, err)
      }
    }

    return { emailSent, notificationSent }
  }
}
