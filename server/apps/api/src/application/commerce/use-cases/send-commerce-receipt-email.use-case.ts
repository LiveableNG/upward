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

function formatEmailDate(date: Date): string {
  try {
    const d = new Date(date)
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(date)
  }
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
    private readonly prisma: PrismaService,
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
      ; (order.subOrders || []).forEach((sub) => {
        ; (sub.items || []).forEach((item) => {
          const snap = (item.snapshotData as any) || {}
          lineItems.push({
            title: snap.title || snap.name || `Offering #${item.offeringId}`,
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
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes || undefined,
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

        const itemsCustomerHtml = lineItems
          .map(
            (item, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
              <td style="padding: 12px 16px; border-bottom: 1px solid #F0ECE4; font-size: 13.5px; color: #1E1B18;">
                <strong style="color: #1E1B18;">${item.title}</strong>
                <div style="font-size: 11.5px; color: #8A8275; margin-top: 2px;">${(item.offeringType || 'PRODUCT').toUpperCase()}</div>
              </td>
              <td align="center" style="padding: 12px 10px; border-bottom: 1px solid #F0ECE4; font-size: 13px; color: #5C554B;">
                ${item.quantity}
              </td>
              <td align="right" style="padding: 12px 16px; border-bottom: 1px solid #F0ECE4; font-size: 13.5px; font-weight: 700; color: #1E1B18;">
                ${formatKoboToNgn(item.totalPriceKobo, order.currency)}
              </td>
            </tr>
          `,
          )
          .join('')

        const html = `
          <div style="background-color: #F6F4EE; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1E1B18;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #EAE6DF; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
              <!-- Top Gradient Accent -->
              <tr>
                <td style="background: linear-gradient(90deg, #B65B37 0%, #8C4327 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
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
                        <span style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                          ✓ PAID &amp; VERIFIED
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
                    Order Confirmed &amp; Paid
                  </h1>
                  <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5C554B;">
                    Thank you for your purchase, <strong>${tenantName}</strong>. We have received 100% of your payment and your official receipt has been issued. Our team is now preparing your order for fulfillment.
                  </p>

                  <!-- Amount Paid Card -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; border: 1px solid #EAE6DF; border-radius: 12px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 20px 24px;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #8A8275;">Total Amount Paid</div>
                              <div style="font-size: 28px; font-weight: 800; color: #B65B37; margin-top: 4px; letter-spacing: -0.5px;">
                                ${formatKoboToNgn(order.totalAmountKobo, order.currency)}
                              </div>
                            </td>
                            <td align="right" valign="bottom">
                              <div style="font-size: 11.5px; color: #8A8275; line-height: 1.4;">
                                Receipt: <strong style="color: #1E1B18;">${receiptNumber}</strong><br/>
                                Date: ${formatEmailDate(order.paidAt || new Date())}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Order & Delivery Metadata -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #EAE6DF; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px 20px; background-color: #FFFFFF; border-bottom: 1px solid #F0ECE4;" width="50%" valign="top">
                        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Order Reference</div>
                        <div style="font-size: 13.5px; font-weight: 700; color: #1E1B18; margin-top: 3px;">${order.orderNumber}</div>
                        <div style="font-size: 11px; color: #8A8275; margin-top: 2px;">Ref: ${order.paymentReference || 'N/A'}</div>
                      </td>
                      <td style="padding: 16px 20px; background-color: #FFFFFF; border-bottom: 1px solid #F0ECE4;" width="50%" valign="top">
                        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Payment Channel</div>
                        <div style="font-size: 13.5px; font-weight: 700; color: #1E1B18; margin-top: 3px;">Paystack Central Checkout</div>
                        <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">✓ 100% Settled</div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 16px 20px; background-color: #FAFAFA;">
                        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Delivery Destination</div>
                        <div style="font-size: 13.5px; font-weight: 700; color: #1E1B18; margin-top: 3px;">${order.recipientName || tenantName}${order.recipientPhone ? ` · ${order.recipientPhone}` : ''}</div>
                        <div style="font-size: 13px; line-height: 1.5; color: #5C554B; margin-top: 3px;">${order.deliveryAddress}</div>
                        ${order.deliveryNotes ? `<div style="margin-top: 6px; font-size: 12px; color: #8A8275; font-style: italic;">Note: ${order.deliveryNotes}</div>` : ''}
                      </td>
                    </tr>
                  </table>

                  <!-- Itemized Order Table -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; border: 1px solid #EAE6DF; border-radius: 12px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #F8F6F1; border-bottom: 1px solid #EAE6DF;">
                        <th align="left" style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E675C;">Items &amp; Specification</th>
                        <th align="center" style="padding: 12px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E675C; width: 40px;">Qty</th>
                        <th align="right" style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E675C; width: 110px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsCustomerHtml}
                    </tbody>
                    <tfoot>
                      ${order.deliveryFeeKobo > 0n
            ? `
                      <tr>
                        <td colspan="2" style="padding: 10px 16px; font-size: 12.5px; color: #5C554B; border-top: 1px solid #F0ECE4;">Delivery Fee</td>
                        <td align="right" style="padding: 10px 16px; font-size: 12.5px; color: #1E1B18; font-weight: 600; border-top: 1px solid #F0ECE4;">${formatKoboToNgn(order.deliveryFeeKobo, order.currency)}</td>
                      </tr>`
            : `
                      <tr>
                        <td colspan="2" style="padding: 10px 16px; font-size: 12.5px; color: #5C554B; border-top: 1px solid #F0ECE4;">Delivery &amp; Logistics</td>
                        <td align="right" style="padding: 10px 16px; font-size: 12.5px; color: #059669; font-weight: 600; border-top: 1px solid #F0ECE4;">Free</td>
                      </tr>`
          }
                      ${order.discountKobo > 0n
            ? `
                      <tr>
                        <td colspan="2" style="padding: 10px 16px; font-size: 12.5px; color: #059669;">Platform Discount</td>
                        <td align="right" style="padding: 10px 16px; font-size: 12.5px; color: #059669; font-weight: 600;">-${formatKoboToNgn(order.discountKobo, order.currency)}</td>
                      </tr>`
            : ''
          }
                      <tr style="background-color: #FAF8F5;">
                        <td colspan="2" style="padding: 14px 16px; font-size: 14px; font-weight: 800; color: #1E1B18; border-top: 1px solid #EAE6DF;">Total Paid</td>
                        <td align="right" style="padding: 14px 16px; font-size: 15px; font-weight: 800; color: #B65B37; border-top: 1px solid #EAE6DF;">${formatKoboToNgn(order.totalAmountKobo, order.currency)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <!-- Primary CTA Button -->
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                    <tr>
                      <td align="center" style="border-radius: 10px; background-color: #B65B37;">
                        <a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                          Track Live Order Updates &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Attachment Notice -->
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8F6F1; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
                    <tr>
                      <td style="font-size: 12.5px; color: #5C554B; text-align: center;">
                        📎 Your official PDF receipt (<strong>${receiptNumber}.pdf</strong>) is attached to this email.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #FAFAFA; border-top: 1px solid #EAE6DF; text-align: center;">
                  <p style="margin: 0 0 6px; font-size: 12px; color: #8A8275;">
                    Have questions or need assistance with your order?
                  </p>
                  <p style="margin: 0 0 16px; font-size: 12.5px; color: #1E1B18;">
                    Email us anytime at <a href="mailto:hello@goodtenants.africa" style="color: #B65B37; font-weight: 700; text-decoration: underline;">hello@goodtenants.africa</a>
                  </p>
                  <div style="font-size: 11px; color: #B0A99E;">
                    &copy; ${new Date().getFullYear()} Upward Platform &middot; GoodTenants. All rights reserved.
                  </div>
                </td>
              </tr>
            </table>
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

    // 4. Alert Email to Admins who receive operational / system alerts
    await this.notifyAdminsOfNewOrder(order, tenantName, tenantEmail, lineItems)

    return { emailSent, notificationSent }
  }

  private async notifyAdminsOfNewOrder(
    order: any,
    tenantName: string,
    tenantEmail: string | null,
    lineItems: CommerceReceiptData['lineItems'],
  ): Promise<void> {
    try {
      const alertAdmins = await this.prisma.upward_admin.findMany({
        where: {
          OR: [
            { receivesSystemAlerts: true },
            { role: { in: ['SUPERADMIN', 'ADMIN', 'OPERATIONS', 'CUSTOMER_SUPPORT'] } },
          ],
        },
        select: { email: true },
      })

      const adminEmails = Array.from(
        new Set(
          alertAdmins
            .map((a) => a.email?.trim().toLowerCase())
            .filter((e): e is string => Boolean(e && !e.endsWith('@upward.com'))),
        ),
      )

      if (adminEmails.length === 0) {
        const fallback = this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL')
        if (fallback) adminEmails.push(fallback.trim().toLowerCase())
      }

      if (adminEmails.length === 0) return

      const adminSiteUrl =
        this.configService.get<string>('ADMIN_SITE_URL') || 'https://upward-admin-site.vercel.app'
      const adminOrderUrl = `${adminSiteUrl}/lifestyle/orders/${order.uuid}`

      const itemsHtml = lineItems
        .map(
          (item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
            <td style="padding: 12px 14px; border-bottom: 1px solid #ECEAE6; font-size: 13.5px; color: #1E1B18;">
              <strong style="color: #1E1B18;">${item.title}</strong>
              <div style="font-size: 11.5px; color: #888888; margin-top: 2px;">Type: ${item.offeringType} · Qty: ${item.quantity}</div>
            </td>
            <td align="right" style="padding: 12px 14px; border-bottom: 1px solid #ECEAE6; font-size: 13.5px; text-align: right; font-weight: 700; color: #1E1B18;">
              ${formatKoboToNgn(item.totalPriceKobo, order.currency)}
            </td>
          </tr>
        `,
        )
        .join('')

      const adminHtml = `
        <div style="background-color: #F6F4EE; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1E1B18;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #EAE6DF; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
            <!-- Top Gradient Accent -->
            <tr>
              <td style="background: linear-gradient(90deg, #D97706 0%, #B65B37 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
            <!-- Header -->
            <tr>
              <td style="padding: 30px 32px 20px; border-bottom: 1px solid #F0ECE4;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle">
                      <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #1E1B18; line-height: 1;">
                        UPWARD OPERATIONS
                      </div>
                      <div style="font-size: 9.5px; font-weight: 600; letter-spacing: 1.5px; color: #8A8275; margin-top: 4px; text-transform: uppercase;">
                        Commerce Dispatch Alert
                      </div>
                    </td>
                    <td align="right" valign="middle">
                      <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background: #FEF3C7; color: #92400E; padding: 5px 12px; border-radius: 20px;">
                        ACTION REQUIRED
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 28px 32px 20px;">
                <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #1E1B18; letter-spacing: -0.3px;">
                  New Order Placed: ${order.orderNumber}
                </h1>
                <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #5C554B;">
                  A verified order has been fully paid and placed by a tenant. Operational fulfillment and vendor dispatch action is required.
                </p>

                <!-- Key Metrics Card -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; border: 1px solid #EAE6DF; border-radius: 12px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 20px 24px;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #8A8275;">Settled Order Value</div>
                            <div style="font-size: 28px; font-weight: 800; color: #B65B37; margin-top: 4px; letter-spacing: -0.5px;">
                              ${formatKoboToNgn(order.totalAmountKobo, order.currency)}
                            </div>
                          </td>
                          <td align="right" valign="bottom">
                            <div style="font-size: 11.5px; color: #8A8275; line-height: 1.4;">
                              Items: <strong style="color: #1E1B18;">${lineItems.length}</strong><br/>
                              Date: ${formatEmailDate(order.paidAt || new Date())}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Customer & Destination Details -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #EAE6DF; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td style="padding: 16px 20px; background-color: #FFFFFF; border-bottom: 1px solid #F0ECE4;" width="50%" valign="top">
                      <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Customer</div>
                      <div style="font-size: 14px; font-weight: 700; color: #1E1B18; margin-top: 3px;">${tenantName}</div>
                      <div style="font-size: 12.5px; color: #555555; margin-top: 2px;">${tenantEmail || 'No email provided'}</div>
                      <div style="font-size: 12px; color: #888888; margin-top: 2px;">Phone: ${order.recipientPhone || 'N/A'}</div>
                    </td>
                    <td style="padding: 16px 20px; background-color: #FFFFFF; border-bottom: 1px solid #F0ECE4;" width="50%" valign="top">
                      <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Payment Reference</div>
                      <div style="font-size: 12.5px; font-family: monospace; font-weight: 700; color: #1E1B18; margin-top: 4px; word-break: break-all;">${order.paymentReference || 'N/A'}</div>
                      <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 4px;">✓ Paystack Central Checkout</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 16px 20px; background-color: #FAFAFA;">
                      <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #8A8275;">Fulfillment Destination</div>
                      <div style="font-size: 13.5px; font-weight: 700; color: #1E1B18; margin-top: 3px;">${order.deliveryAddress}</div>
                      ${order.deliveryZoneTag ? `<div style="font-size: 12px; color: #888888; margin-top: 3px;">Coverage Zone: <strong>${order.deliveryZoneTag}</strong></div>` : ''}
                      ${order.deliveryNotes ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E5E2DC; font-size: 12.5px; color: #5C554B;"><strong>Delivery Instructions:</strong> ${order.deliveryNotes}</div>` : ''}
                    </td>
                  </tr>
                </table>

                <!-- Items Table -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; border: 1px solid #EAE6DF; border-radius: 12px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #F8F6F1; border-bottom: 1px solid #EAE6DF;">
                      <th align="left" style="padding: 12px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E675C;">Items</th>
                      <th align="right" style="padding: 12px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E675C; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #FAF8F5;">
                      <td style="padding: 14px; font-size: 14px; font-weight: 800; color: #1E1B18; border-top: 1px solid #EAE6DF;">Total Order Value</td>
                      <td align="right" style="padding: 14px; font-size: 16px; font-weight: 800; color: #B65B37; border-top: 1px solid #EAE6DF; text-align: right;">${formatKoboToNgn(order.totalAmountKobo, order.currency)}</td>
                    </tr>
                  </tfoot>
                </table>

                <!-- Admin Action Button -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                  <tr>
                    <td align="center" style="border-radius: 10px; background-color: #B65B37;">
                      <a href="${adminOrderUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                        Open Order in Admin Portal &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color: #FAFAFA; border-top: 1px solid #EAE6DF; text-align: center;">
                <div style="font-size: 11.5px; color: #8A8275;">
                  Upward Platform Operations Engine &middot; Automated Internal Dispatch
                </div>
                <div style="font-size: 11px; color: #B0A99E; margin-top: 4px;">
                  For operational escalations, contact <a href="mailto:hello@goodtenants.africa" style="color: #8A8275; text-decoration: underline;">hello@goodtenants.africa</a>
                </div>
              </td>
            </tr>
          </table>
        </div>
      `

      await Promise.allSettled(
        adminEmails.map((email) =>
          this.emailService.sendEmailWithRetry({
            email,
            subject: `[New Order Placed] ${order.orderNumber} - ${tenantName} (${formatKoboToNgn(order.totalAmountKobo, order.currency)})`,
            html: adminHtml,
            type: 'COMMERCE_ADMIN_ORDER_ALERT',
          }),
        ),
      )
    } catch (err) {
      this.logger.error(`Failed to dispatch admin alert emails for order #${order.id}`, err)
    }
  }
}
