import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../../domains/commerce/commerce-order.repository'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../../domains/vouchers/voucher.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../../domains/users/user.repository'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { NotificationService } from '../../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../../shared/infrastructure/email/email.service'
import { SmsService } from '../../../../shared/infrastructure/sms/sms.service'
import { notifyCustomerCommerceMilestone } from '../../utils/commerce-comms.helper'
import { AdminCancelOrderDto } from '../../dto/admin-cancel-order.dto'

@Injectable()
export class AdminCancelCommerceOrderUseCase {
  private readonly logger = new Logger(AdminCancelCommerceOrderUseCase.name)

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Optional()
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo?: VoucherRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
    @Optional()
    private readonly emailService?: EmailService,
    @Optional()
    private readonly smsService?: SmsService,
  ) {}

  async execute(orderUuid: string, adminId: string | number, dto: AdminCancelOrderDto) {
    const order = await this.orderRepo.findOrderByUuid(orderUuid)
    if (!order || !order.id) {
      throw new NotFoundException(`Order with UUID '${orderUuid}' not found`)
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Order has already been cancelled')
    }

    if (order.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel an order that has already been completed')
    }

    const previousStatus = order.status
    const reason = dto.reason.trim()
    const actorIdStr = String(adminId)

    this.logger.log(`Cancelling commerce order #${order.orderNumber} (UUID: ${order.uuid}) by admin ${actorIdStr}`)

    // 1. Release reserved stock if applicable
    try {
      await this.orderRepo.releaseInventory(order.id, `Admin cancellation: ${reason}`)
    } catch (invErr: any) {
      this.logger.warn(`Inventory release note for order #${order.orderNumber}: ${invErr?.message}`)
    }

    // 1b. Release any reserved (unredeemed) voucher credit back to the user's wallet
    if (this.voucherRepo && order.discountKobo > 0n) {
      try {
        await this.voucherRepo.releaseReservedVoucherForOrder(
          order.id,
          `Admin cancellation: ${reason}`,
        )
      } catch (vErr: any) {
        this.logger.warn(`Voucher release note for order #${order.orderNumber}: ${vErr?.message}`)
      }
    }

    // 2. Transition master order to CANCELLED in DB
    const updatedOrder = await this.prisma.upward_commerce_order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
      },
    })

    // 3. Transition all sub-orders to CANCELLED and log customer-visible fulfilment event
    const subOrders = await this.prisma.upward_commerce_vendor_suborder.findMany({
      where: { orderId: order.id },
    })

    for (const sub of subOrders) {
      await this.prisma.upward_commerce_vendor_suborder.update({
        where: { id: sub.id },
        data: {
          customerStatus: 'CANCELLED',
          operationalStatus: 'CANCELLED_REFUNDED',
          adminOperationalNotes: `Order cancelled by operations: ${reason}`,
        },
      })

      await this.prisma.upward_commerce_fulfilment_event.create({
        data: {
          subOrderId: sub.id,
          status: 'CANCELLED',
          title: 'Order Cancelled',
          description: `This order was cancelled by Upward Operations: ${reason}`,
          isCustomerVisible: true,
          actorType: 'ADMIN',
          actorId: actorIdStr,
        },
      })
    }

    // 4. Record audit log
    await this.orderRepo.recordAuditLog(order.id, {
      event: 'ORDER_ADMIN_CANCELLED',
      fromState: previousStatus,
      toState: 'CANCELLED',
      actorType: 'ADMIN',
      actorId: actorIdStr,
      details: {
        reason,
        previousPaymentStatus: order.paymentStatus,
        subOrdersCancelledCount: subOrders.length,
      },
    })

    // 5. Send in-app, push, and email (with SMS fallback) notification to the customer
    const isPaid = order.paymentStatus === 'PAID'
    const refundNote = isPaid
      ? ' A full refund has been initiated to your original payment method.'
      : ' No payment was captured for this order.'

    try {
      const customerUser = this.userRepo
        ? await this.userRepo.findById(order.userId)
        : null

      await notifyCustomerCommerceMilestone({
        notificationService: this.notificationService,
        emailService: this.emailService,
        smsService: this.smsService,
        userId: order.userId,
        userEmail: customerUser?.email,
        userPhone: customerUser?.phone || order.recipientPhone,
        title: `Order Cancelled — #${order.orderNumber}`,
        message: `Your order #${order.orderNumber} has been cancelled: ${reason}.${refundNote}`,
        emailSubject: `Order Cancelled — ${order.orderNumber}`,
        emailLines: [
          `Hi ${order.recipientName},`,
          `Your order <strong>${order.orderNumber}</strong> has been cancelled by Upward Operations.`,
          `<strong>Reason:</strong> ${reason}`,
          isPaid
            ? 'A full refund has been initiated back to your original payment method.'
            : 'No payment was captured for this order, and any reserved voucher balance has been returned to your wallet.',
          `If you have any questions, open your order in Upward Pay to reach our support team.`,
        ],
        smsText: `Upward: Order ${order.orderNumber} was cancelled (${reason}).${refundNote}`,
        url: `/dashboard/lifestyle/orders?uuid=${order.uuid}`,
        ctaLabel: 'View Order Details',
        data: {
          orderUuid: order.uuid,
          orderNumber: order.orderNumber,
          status: 'CANCELLED',
        },
      })
    } catch (notifErr: any) {
      this.logger.error(`Failed to dispatch cancellation notification for order #${order.orderNumber}`, notifErr)
    }

    return {
      message: `Order #${order.orderNumber} successfully cancelled`,
      order: {
        uuid: updatedOrder.uuid,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      },
    }
  }
}
