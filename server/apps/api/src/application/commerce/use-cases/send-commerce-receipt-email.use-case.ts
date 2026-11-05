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
import {
  CommerceReceiptData,
  CommerceReceiptService,
} from '../../../shared/infrastructure/common/receipt/commerce-receipt.service'
import { ConfigService } from '@nestjs/config'

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
export class SendCommerceReceiptEmailUseCase {
  private readonly logger = new Logger(SendCommerceReceiptEmailUseCase.name)
  private readonly frontendUrl: string

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly receiptService: CommerceReceiptService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'https://upward.goodtenants.io'
    )
      .split(',')[0]!
      .trim()
  }

  async execute(orderId: number): Promise<{ emailSent: boolean; notificationSent: boolean }> {
    const order = await this.orderRepo.findOrderById(orderId)

    if (!order || order.paymentStatus !== 'PAID') {
      this.logger.warn(`Cannot send commerce receipt: Order #${orderId} not found or unpaid`)
      return { emailSent: false, notificationSent: false }
    }

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
      // fallback to recipient name
    }

    // 1. Send in-app and mobile push notification
    let notificationSent = false
    try {
      await this.notificationService.notifyUser(order.userId, {
        title: 'Order Confirmed & Paid',
        message: `Your Upward order ${order.orderNumber} has been verified. We are preparing your order for fulfillment.`,
        type: 'PAYMENT',
        url: `/dashboard/lifestyle/orders/${order.uuid}`,
      })
      notificationSent = true
    } catch (err) {
      this.logger.error(`Failed to dispatch in-app notification for order #${orderId}`, err)
    }

    // 2. Generate PDF receipt
    const lineItems: CommerceReceiptData['lineItems'] = []
    ;(order.subOrders || []).forEach((sub) => {
      ;(sub.items || []).forEach((item) => {
        const snap = (item.snapshotData as any) || {}
        lineItems.push({
          title: snap.title || `Offering #${item.offeringId}`,
          offeringType: item.offeringType,
          quantity: item.quantity,
          unitPriceKobo: item.unitPriceKobo,
          totalPriceKobo: item.totalPriceKobo,
        })
      })
    })

    const receiptNumber = order.orderNumber.replace('UPW-ORD-', 'UPW-RCP-')
    const receiptData: CommerceReceiptData = {
      orderNumber: order.orderNumber,
      receiptNumber,
      customerName: tenantName,
      customerEmail: tenantEmail || undefined,
      deliveryAddress: order.deliveryAddress,
      paymentReference: order.paymentReference || 'N/A',
      paymentChannel: 'Paystack Central Checkout',
      paidAt: order.paidAt || new Date(),
      currency: order.currency,
      itemsSubtotalKobo: order.itemsSubtotalKobo,
      deliveryFeeKobo: order.deliveryFeeKobo,
      discountKobo: order.discountKobo,
      totalAmountKobo: order.totalAmountKobo,
      lineItems,
    }

    let pdfBuffer: Buffer | null = null
    try {
      pdfBuffer = await this.receiptService.generateReceiptPdf(receiptData)
    } catch (err) {
      this.logger.error(`Failed to generate PDF for order #${orderId}`, err)
    }

    // 3. Send email to tenant
    let emailSent = false
    if (tenantEmail && !tenantEmail.endsWith('@upward.com')) {
      try {
        const trackingUrl = `${this.frontendUrl}/dashboard/lifestyle/orders/${order.uuid}`
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B18; line-height: 1.5;">
            <div style="background-color: #B65B37; height: 6px; width: 100%;"></div>
            <div style="padding: 32px 24px; background-color: #FAF8F6; border-radius: 0 0 12px 12px; border: 1px solid #E5E2DC; border-top: none;">
              <h2 style="color: #B65B37; margin: 0 0 6px; font-size: 22px;">Order Confirmed!</h2>
              <p style="font-size: 14px; color: #666666; margin: 0 0 24px;">Thank you for your purchase. We have received 100% of your funds and are preparing your order.</p>
              
              <div style="background-color: #FFFFFF; border: 1px solid #E5E2DC; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 13px; color: #888888; margin-bottom: 4px;">Order Number</div>
                <div style="font-size: 16px; font-weight: 700; color: #1E1B18; margin-bottom: 12px;">${order.orderNumber}</div>
                
                <div style="font-size: 13px; color: #888888; margin-bottom: 4px;">Delivery / Service Location</div>
                <div style="font-size: 14px; color: #1E1B18; margin-bottom: 12px;">${order.deliveryAddress}</div>

                <div style="font-size: 13px; color: #888888; margin-bottom: 4px;">Total Amount Paid</div>
                <div style="font-size: 18px; font-weight: 700; color: #B65B37;">${formatKoboToNgn(order.totalAmountKobo, order.currency)}</div>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${trackingUrl}" style="background-color: #B65B37; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                  Track Order in Upward Pay
                </a>
              </div>

              <div style="border-top: 1px solid #E5E2DC; padding-top: 20px; font-size: 12px; color: #888888; text-align: center;">
                <p style="margin: 0 0 4px;">Your official PDF receipt is attached to this email.</p>
                <p style="margin: 0;">Protected by Upward Buyer Protection · support@upward.ng</p>
              </div>
            </div>
          </div>
        `

        const attachments = pdfBuffer
          ? [
              {
                filename: `${receiptNumber}.pdf`,
                content: pdfBuffer,
              },
            ]
          : undefined

        await this.emailService.sendEmailWithRetry({
          email: tenantEmail,
          subject: `Order Receipt: ${order.orderNumber} - Upward Platform`,
          html,
          type: 'COMMERCE_ORDER_RECEIPT',
          attachments,
        })

        emailSent = true
      } catch (err) {
        this.logger.error(`Failed to send order confirmation email for order #${orderId}`, err)
      }
    }

    return { emailSent, notificationSent }
  }
}
