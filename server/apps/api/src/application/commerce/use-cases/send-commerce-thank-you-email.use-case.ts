import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domains/users/user.repository'
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
      this.logger.debug(`Thank-you email already sent previously for order #${orderId} (${order.orderNumber})`)
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
      this.logger.error(`Failed to dispatch completion in-app notification for order #${orderId}`, err)
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
            itemsSummary.push(
              `${item.quantity}x ${snap.title || `Offering #${item.offeringId}`}`,
            )
          })
        })

        const itemsListHtml = itemsSummary.length > 0
          ? itemsSummary.map((it) => `<li style="margin-bottom: 6px; color: #1E1B18;">${it}</li>`).join('')
          : '<li style="color: #1E1B18;">Lifestyle Order Package</li>'

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B18; line-height: 1.5;">
            <div style="background-color: #059669; height: 6px; width: 100%;"></div>
            <div style="padding: 32px 24px; background-color: #FAF8F6; border-radius: 0 0 12px 12px; border: 1px solid #E5E2DC; border-top: none;">
              <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background: #DEF7EC; color: #03543F; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
                Fulfilment Complete
              </span>
              <h2 style="color: #1E1B18; margin: 0 0 8px; font-size: 22px;">Thank You, ${tenantName}!</h2>
              <p style="font-size: 14.5px; color: #555555; margin: 0 0 24px;">Your order has been successfully delivered and completed. We hope you enjoy your new experience.</p>
              
              <div style="background-color: #FFFFFF; border: 1px solid #E5E2DC; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 4px;">Completed Order</div>
                <div style="font-size: 16px; font-weight: 700; color: #1E1B18; margin-bottom: 14px;">${order.orderNumber}</div>

                <div style="font-size: 12px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 6px;">Delivered Items</div>
                <ul style="margin: 0 0 14px 18px; padding: 0; font-size: 14px;">
                  ${itemsListHtml}
                </ul>

                <div style="font-size: 12px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 4px;">Delivered To</div>
                <div style="font-size: 13.5px; color: #1E1B18;">${order.deliveryAddress}</div>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${trackingUrl}" style="background-color: #B65B37; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; display: inline-block;">
                  View Order Details &amp; Receipt
                </a>
              </div>

              <div style="border-top: 1px solid #E5E2DC; padding-top: 20px; font-size: 12.5px; color: #777777; text-align: center;">
                <p style="margin: 0 0 4px;">Have questions, feedback, or need customer support?</p>
                <p style="margin: 0;">Our support team is always ready to help at <a href="mailto:support@upward.ng" style="color: #B65B37; text-decoration: none;">support@upward.ng</a></p>
              </div>
            </div>
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
