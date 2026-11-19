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
      title: 'Quote Request Cancelled',
      message: `You declined the quote for "${serviceTitle}" (${order.orderNumber}). No payment was charged.`,
      emailSubject: `Quote Request Cancelled — ${serviceTitle} (${order.orderNumber})`,
      emailLines: [
        `Hi ${order.recipientName},`,
        `Your quote request for <strong>${serviceTitle}</strong> (Order <strong>${order.orderNumber}</strong>) has been cancelled as requested. No charges were made.`,
      ],
      smsText: `Upward: Your quote request for ${serviceTitle} (${order.orderNumber}) has been cancelled. No charge was made.`,
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
      ],
    })

    return {
      success: true,
      message: 'Quote declined and request cancelled.',
    }
  }
}
