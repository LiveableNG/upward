import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domains/users/user.repository'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { SmsService } from '../../../shared/infrastructure/sms/sms.service'
import {
  notifyAdminCommerceEvent,
  notifyCustomerCommerceMilestone,
} from '../utils/commerce-comms.helper'

@Injectable()
export class DeclineServiceQuoteUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly emailService?: EmailService,
    @Optional()
    private readonly smsService?: SmsService,
    @Optional()
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo?: VoucherRepository,
  ) {}

  async execute(params: {
    userUuid?: string
    userId?: number | string
    orderUuid: string
    reason?: string
  }) {
    const rawUser = params.userUuid ?? params.userId
    let user: any = null
    if (typeof rawUser === 'number') {
      user = await this.userRepo.findById(rawUser)
    } else if (rawUser) {
      user = await this.userRepo.findByUuid(rawUser)
    }
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    const order = await this.orderRepo.findOrderByUuid(params.orderUuid)
    if (!order || !order.id) {
      throw new NotFoundException('Order not found')
    }
    if (order.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this order')
    }
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Cannot decline a quote that has already been paid')
    }

    const subOrder = order.subOrders?.[0]
    if (!subOrder?.id) {
      throw new BadRequestException('Order has no service sub-order')
    }

    if (!['QUOTE_REQUESTED', 'QUOTE_PROVIDED'].includes(subOrder.customerStatus)) {
      throw new BadRequestException('Only pending quote requests can be declined')
    }

    // Release any reserved voucher credit back to user's wallet if one was held on this quote
    if (this.voucherRepo && order.discountKobo > 0n) {
      await this.voucherRepo.releaseReservedVoucherForOrder(
        order.id,
        'Released because customer declined service quote',
      )
    }

    await this.orderRepo.declineQuoteOrder({
      orderId: order.id,
      subOrderId: subOrder.id,
      userId: user.id,
      reason: params.reason,
    })

    const serviceTitle =
      (subOrder.items?.[0]?.snapshotData as any)?.title || 'Service Request'

    await notifyCustomerCommerceMilestone({
      notificationService: this.notificationService,
      emailService: this.emailService,
      smsService: this.smsService,
      userId: user.id,
      userEmail: user.email,
      userPhone: user.phone || order.recipientPhone,
      title: 'Quote Declined',
      message: `You declined the quote for "${serviceTitle}" (${order.orderNumber}). No payment was charged. Our team may reach out if we can offer a revised option.`,
      emailSubject: `Quote Declined — ${serviceTitle} (${order.orderNumber})`,
      emailLines: [
        `Hi ${order.recipientName},`,
        `You declined the quote for <strong>${serviceTitle}</strong> (Order <strong>${order.orderNumber}</strong>). No charges were made.`,
        params.reason ? `<strong>Your feedback:</strong> ${params.reason}` : '',
        `If you'd like to discuss a different scope or budget, you can still message our team on your order.`,
      ].filter(Boolean),
      smsText: `Upward: You declined the quote for ${serviceTitle} (${order.orderNumber}). No charge was made.`,
      url: `/dashboard/lifestyle/orders?uuid=${order.uuid}`,
      data: { orderUuid: order.uuid },
    })

    await notifyAdminCommerceEvent({
      emailService: this.emailService,
      subject: `[QUOTE DECLINED] ${order.orderNumber} — ${serviceTitle}`,
      title: `Customer Declined Quote (${order.orderNumber})`,
      lines: [
        `<strong>Customer:</strong> ${order.recipientName}`,
        `<strong>Service:</strong> ${serviceTitle}`,
        params.reason ? `<strong>Reason:</strong> ${params.reason}` : '<strong>Reason:</strong> Not specified',
        `Open the Admin Commerce Orders tab to message the customer, send a revised quote, or close the request.`,
      ],
    })

    return {
      success: true,
      message: 'Quote declined. No payment was charged.',
    }
  }
}
