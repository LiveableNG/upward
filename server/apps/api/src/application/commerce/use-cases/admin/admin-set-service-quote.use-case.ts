import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../../domains/commerce/commerce-order.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../../domains/users/user.repository'
import { NotificationService } from '../../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../../shared/infrastructure/email/email.service'
import { SmsService } from '../../../../shared/infrastructure/sms/sms.service'
import { AdminSetServiceQuoteDto } from '../../dto/service-quote.dto'
import { notifyCustomerCommerceMilestone } from '../../utils/commerce-comms.helper'

@Injectable()
export class AdminSetServiceQuoteUseCase {
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
    subOrderUuid: string
    adminActorId?: string
    dto: AdminSetServiceQuoteDto
  }) {
    const subOrder = await this.orderRepo.findSubOrderByUuid(params.subOrderUuid)
    if (!subOrder || !subOrder.id) {
      throw new NotFoundException('Service sub-order not found')
    }

    const order = subOrder.order || (await this.orderRepo.findOrderById(subOrder.orderId))
    if (!order || !order.id) {
      throw new NotFoundException('Parent order not found')
    }

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Cannot change quote price after payment has been completed')
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot set quote price for a cancelled order')
    }

    const quotedPriceKobo = BigInt(Math.round(params.dto.quotedPriceNgn * 100))
    if (quotedPriceKobo <= 0n) {
      throw new BadRequestException('Quoted price must be greater than zero')
    }

    const updatedOrder = await this.orderRepo.setSubOrderQuotePrice({
      orderId: order.id,
      subOrderId: subOrder.id,
      quotedPriceKobo,
      quoteNotes: params.dto.quoteNotes,
      adminActorId: params.adminActorId,
    })

    const serviceTitle =
      (subOrder.items?.[0]?.snapshotData as any)?.title || 'Your Service Request'
    const formattedPrice = `₦${params.dto.quotedPriceNgn.toLocaleString('en-NG')}`
    const customerUser = updatedOrder.user || (await this.userRepo.findById(updatedOrder.userId))

    await notifyCustomerCommerceMilestone({
      notificationService: this.notificationService,
      emailService: this.emailService,
      smsService: this.smsService,
      userId: updatedOrder.userId,
      userEmail: customerUser?.email,
      userPhone: customerUser?.phone || updatedOrder.recipientPhone,
      title: `Your Quote is Ready — ${formattedPrice}`,
      message: `Your custom quote of ${formattedPrice} for "${serviceTitle}" (${updatedOrder.orderNumber}) is ready. Tap to review and pay.`,
      emailSubject: `Your Quote is Ready (${formattedPrice}) — ${serviceTitle}`,
      emailLines: [
        `Hi ${updatedOrder.recipientName},`,
        `Great news! Your tailored quote for <strong>${serviceTitle}</strong> (Order <strong>${updatedOrder.orderNumber}</strong>) is ready:`,
        `<div style="padding:14px 16px;background:#faf8f5;border:1px solid #ece5dc;border-radius:10px;margin:10px 0;"><strong style="font-size:18px;color:#1a1714;">${formattedPrice}</strong>${params.dto.quoteNotes ? `<p style="margin:6px 0 0;font-size:13px;color:#4a4642;">${params.dto.quoteNotes}</p>` : ''}</div>`,
        `Open your order in Upward Pay to complete payment and schedule your service, or decline the quote if you prefer not to proceed.`,
      ],
      smsText: `Upward: Your quote for ${serviceTitle} (${updatedOrder.orderNumber}) is ${formattedPrice}. Open Upward Pay to review & pay.`,
      url: `/dashboard/lifestyle/orders?uuid=${updatedOrder.uuid}`,
      ctaLabel: `Review & Pay ${formattedPrice}`,
      data: {
        orderUuid: updatedOrder.uuid,
        orderNumber: updatedOrder.orderNumber,
        quotedPriceNgn: String(params.dto.quotedPriceNgn),
      },
    })

    return {
      orderUuid: updatedOrder.uuid,
      orderNumber: updatedOrder.orderNumber,
      totalAmountKobo: updatedOrder.totalAmountKobo.toString(),
      message: `Quote of ${formattedPrice} sent to customer.`,
    }
  }
}
