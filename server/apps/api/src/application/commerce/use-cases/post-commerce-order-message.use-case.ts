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
export class PostCommerceOrderMessageUseCase {
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
    senderType: 'TENANT' | 'ADMIN'
    senderUserUuid?: string
    senderUserId?: number | string
    senderName?: string
    message: string
  }) {
    const trimmed = params.message?.trim()
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty')
    }

    const subOrder = await this.orderRepo.findSubOrderByUuid(params.subOrderUuid)
    if (!subOrder || !subOrder.id) {
      throw new NotFoundException('Service order not found')
    }

    const order = subOrder.order || (await this.orderRepo.findOrderById(subOrder.orderId))
    if (!order) {
      throw new NotFoundException('Parent order not found')
    }

    let senderId = params.senderUserUuid || (params.senderUserId ? String(params.senderUserId) : 'ADMIN')
    let senderName = params.senderName || (params.senderType === 'ADMIN' ? 'Upward Team' : order.recipientName)

    if (params.senderType === 'TENANT') {
      const rawUser = params.senderUserUuid ?? params.senderUserId
      let user: any = null
      if (typeof rawUser === 'number') {
        user = await this.userRepo.findById(rawUser)
      } else if (rawUser) {
        user = await this.userRepo.findByUuid(rawUser)
      }
      if (!user?.id || user.id !== order.userId) {
        throw new ForbiddenException('You do not have access to this service order')
      }
      senderId = String(user.id)
      senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || order.recipientName
    }

    const created = await this.orderRepo.addSubOrderMessage({
      subOrderId: subOrder.id,
      senderType: params.senderType,
      senderId,
      senderName,
      message: trimmed,
    })

    const serviceTitle =
      (subOrder.items?.[0]?.snapshotData as any)?.title || 'Your Service Request'

    // Dispatch Push + Email/SMS notifications asynchronously (non-blocking) for instant messaging latency
    if (params.senderType === 'ADMIN') {
      void (async () => {
        const customerUser = order.user || (await this.userRepo.findById(order.userId))
        await notifyCustomerCommerceMilestone({
          notificationService: this.notificationService,
          emailService: this.emailService,
          smsService: this.smsService,
          userId: order.userId,
          userEmail: customerUser?.email,
          userPhone: customerUser?.phone || order.recipientPhone,
          title: `Update on ${serviceTitle}`,
          message: `Upward Team sent a message on ${order.orderNumber}: "${trimmed.slice(0, 110)}${trimmed.length > 110 ? '…' : ''}"`,
          emailSubject: `Message Regarding Your Quote — ${serviceTitle} (${order.orderNumber})`,
          emailLines: [
            `Hi ${order.recipientName},`,
            `Our team left a message regarding your request for <strong>${serviceTitle}</strong> (Order <strong>${order.orderNumber}</strong>):`,
            `<div style="padding:12px 14px;background:#faf8f5;border-left:3px solid #d97757;border-radius:6px;margin:8px 0;">${trimmed}</div>`,
            `Open your order to reply directly so we can finalize your tailored quote.`,
          ],
          smsText: `Upward (${order.orderNumber}): ${trimmed.slice(0, 120)} — Reply in the Upward app.`,
          url: `/dashboard/lifestyle/orders?uuid=${order.uuid}`,
          ctaLabel: 'Reply on Order',
          data: { orderUuid: order.uuid, subOrderUuid: subOrder.uuid },
        })
      })().catch(() => {})
    } else {
      void notifyAdminCommerceEvent({
        emailService: this.emailService,
        subject: `[QUOTE REPLY] ${order.orderNumber} — ${serviceTitle}`,
        title: `Customer Reply on ${order.orderNumber}`,
        lines: [
          `<strong>Customer:</strong> ${senderName}`,
          `<strong>Service:</strong> ${serviceTitle}`,
          `<strong>Message:</strong><br/>${trimmed}`,
          `Open the Admin Portal to continue the review or set the final quoted price.`,
        ],
      }).catch(() => {})
    }

    return {
      message: created,
    }
  }
}
