import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../domains/payments/payment.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domains/users/user.repository'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { InitializeCommercePaymentResponse } from '../dto/initialize-commerce-payment.dto'

@Injectable()
export class InitializeCommercePaymentUseCase {
  private readonly logger = new Logger(InitializeCommercePaymentUseCase.name)

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Optional()
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo?: VoucherRepository,
  ) {}

  async execute(params: {
    userUuid?: string
    userId?: number | string
    orderUuid: string
    ipAddress?: string
    applyVoucher?: boolean
  }): Promise<InitializeCommercePaymentResponse> {
    const rawUser = params.userUuid ?? params.userId
    let resolvedUserId: number
    let userEmail: string | undefined = undefined

    if (typeof rawUser === 'number') {
      resolvedUserId = rawUser
      const u = await this.userRepo.findById(rawUser)
      userEmail = u?.email
    } else if (rawUser) {
      const user = await this.userRepo.findByUuid(rawUser)
      if (!user?.id) {
        throw new NotFoundException('User not found')
      }
      resolvedUserId = user.id
      userEmail = user.email
    } else {
      throw new NotFoundException('User identifier required')
    }

    // 1. Retrieve order and verify tenant ownership
    let order = await this.orderRepo.findOrderByUuid(params.orderUuid)
    if (!order || order.userId !== resolvedUserId) {
      throw new NotFoundException(`Order '${params.orderUuid}' not found`)
    }

    // 2. Validate order status eligibility
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for a cancelled or expired order')
    }

    if (order.paymentStatus === 'PAID' || order.status === 'CONFIRMED' || order.status === 'COMPLETED' || order.status === 'PROCESSING') {
      throw new BadRequestException('Order has already been paid and confirmed')
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order is not eligible for payment in status ${order.status}`)
    }

    if (!order.itemsSubtotalKobo || order.itemsSubtotalKobo <= 0n) {
      throw new BadRequestException('A quoted price has not been set for this service request yet')
    }

    // 2b. Optional server-authoritative voucher application (e.g. on service quotes or unpaid eligible orders)
    if (params.applyVoucher === true && order.discountKobo === 0n && this.voucherRepo && order.id) {
      let eligibleSubtotalKobo = 0n
      const subOrderEligibleMap = new Map<number, bigint>()

      for (const sub of order.subOrders || []) {
        let subEligible = 0n
        for (const it of sub.items || []) {
          const offering = (it as any).offering
          if (offering?.voucherEligible && it.totalPriceKobo > 0n) {
            subEligible += it.totalPriceKobo
          }
        }
        if (subEligible > 0n && sub.id) {
          eligibleSubtotalKobo += subEligible
          subOrderEligibleMap.set(sub.id, subEligible)
        }
      }

      if (eligibleSubtotalKobo > 0n) {
        const reserveResult = await this.voucherRepo.reserveVoucherForOrder({
          userId: resolvedUserId,
          orderId: order.id,
          maxAmountKobo: eligibleSubtotalKobo,
          idempotencyKey: `ORDER_RESERVE:${order.id}`,
          reason: `Voucher applied to order #${order.orderNumber}`,
        })

        if (reserveResult.reservedKobo > 0n) {
          const appliedDiscount = reserveResult.reservedKobo
          const grossTotal = order.itemsSubtotalKobo + order.deliveryFeeKobo + order.taxKobo
          const newTotal = grossTotal > appliedDiscount ? grossTotal - appliedDiscount : 0n

          // Proportionally allocate discount across eligible sub-orders
          const allocations: Array<{ subOrderId: number; allocatedDiscountKobo: bigint }> = []
          let remainingDiscount = appliedDiscount
          const entries = Array.from(subOrderEligibleMap.entries())
          entries.forEach(([subOrderId, subEligible], idx) => {
            const alloc =
              idx === entries.length - 1
                ? remainingDiscount
                : (appliedDiscount * subEligible) / eligibleSubtotalKobo
            remainingDiscount -= alloc
            allocations.push({ subOrderId, allocatedDiscountKobo: alloc })
          })

          order = await this.orderRepo.applyOrderVoucherDiscount({
            orderId: order.id,
            discountKobo: appliedDiscount,
            totalAmountKobo: newTotal,
            subOrderAllocations: allocations,
          })
        }
      }
    }

    // 2c. Handle 100% voucher-covered order (₦0 remaining) without Paystack
    if (order.totalAmountKobo === 0n && order.discountKobo > 0n && order.id) {
      const voucherRef = `VOUCHER_${order.orderNumber}`
      await this.orderRepo.confirmOrderPayment({
        orderId: order.id,
        paymentReference: voucherRef,
        channel: 'voucher',
        paidAt: new Date(),
      })
      if (this.voucherRepo) {
        await this.voucherRepo.redeemReservedVoucherForOrder(order.id)
      }
      return {
        authorizationUrl: '',
        reference: voucherRef,
        orderNumber: order.orderNumber,
        amountKobo: '0',
        currency: order.currency,
        paidWithVoucher: true,
        discountKobo: order.discountKobo.toString(),
      }
    }

    if (!order.totalAmountKobo || order.totalAmountKobo <= 0n) {
      throw new BadRequestException('A quoted price has not been set for this service request yet')
    }

    // 3. Retrieve tenant email
    const email = userEmail || order.user?.email || order.recipientPhone || 'customer@goodtenants.africa'

    // 4. Generate unique payment attempt reference (distinct from order idempotency key)
    const paymentReference = `UPW_ORD_PAY_${randomUUID()}`

    // 5. Persist payment attempt in database BEFORE calling gateway
    await this.orderRepo.recordPaymentAttempt(order.id!, {
      reference: paymentReference,
      amountKobo: order.totalAmountKobo,
      currency: order.currency,
      status: 'INITIATED',
      ipAddress: params.ipAddress,
    })

    // 6. Update order payment status to INITIATED
    await this.orderRepo.updateOrderStatus(order.id!, 'PENDING', 'INITIATED')

    // 7. Initialize transaction with Paystack Gateway (100% Upward corporate account, no subaccount/split)
    let initialization: { authorizationUrl: string; accessCode?: string; reference: string }
    try {
      initialization = await this.paymentGateway.initializeTransaction({
        email,
        amount: Number(order.totalAmountKobo) / 100, // Gateway converts Naira amount to kobo internally
        reference: paymentReference,
        metadata: {
          paymentKind: 'COMMERCE_ORDER',
          orderUuid: order.uuid,
          orderNumber: order.orderNumber,
          orderId: order.id,
          userId: resolvedUserId,
        },
      })
    } catch (error: any) {
      this.logger.error(`Failed to initialize Paystack transaction for order ${order.orderNumber}:`, error)
      await this.orderRepo.updatePaymentAttemptStatus(
        paymentReference,
        'FAILED',
        error.message || 'Gateway initialization failed',
      )
      throw new BadRequestException('Payment gateway initialization failed. Please try again.')
    }

    // 8. Record audit log
    await this.orderRepo.recordAuditLog(order.id!, {
      event: 'PAYMENT_INITIALIZED',
      fromState: 'UNPAID',
      toState: 'INITIATED',
      actorType: 'TENANT',
      actorId: String(resolvedUserId),
      details: {
        paymentReference,
        orderNumber: order.orderNumber,
        amountKobo: order.totalAmountKobo.toString(),
      },
    })

    return {
      authorizationUrl: initialization.authorizationUrl,
      accessCode: initialization.accessCode,
      reference: paymentReference,
      orderNumber: order.orderNumber,
      amountKobo: order.totalAmountKobo.toString(),
      currency: order.currency,
    }
  }
}
