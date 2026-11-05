import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
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
  ) {}

  async execute(params: {
    userId: number
    orderUuid: string
    ipAddress?: string
  }): Promise<InitializeCommercePaymentResponse> {
    // 1. Retrieve order and verify tenant ownership
    const order = await this.orderRepo.findOrderByUuid(params.orderUuid)
    if (!order || order.userId !== params.userId) {
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

    // 3. Retrieve tenant email
    const user = await this.userRepo.findById(params.userId)
    const email = user?.email || order.recipientPhone || 'customer@upward.ng'

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
          userId: params.userId,
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
      actorId: String(params.userId),
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
