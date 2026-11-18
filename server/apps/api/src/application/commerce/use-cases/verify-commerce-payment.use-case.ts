import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
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
import { ConfirmCommercePaymentUseCase } from './confirm-commerce-payment.use-case'

@Injectable()
export class VerifyCommercePaymentUseCase {
  private readonly logger = new Logger(VerifyCommercePaymentUseCase.name)

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly confirmCommercePaymentUseCase: ConfirmCommercePaymentUseCase,
  ) {}

  async execute(params: {
    userUuid?: string
    userId?: number | string
    orderUuid: string
    reference: string
  }) {
    const rawUser = params.userUuid ?? params.userId
    let resolvedUserId: number

    if (typeof rawUser === 'number') {
      resolvedUserId = rawUser
    } else if (rawUser) {
      const user = await this.userRepo.findByUuid(rawUser)
      if (!user?.id) {
        throw new NotFoundException('User not found')
      }
      resolvedUserId = user.id
    } else {
      throw new NotFoundException('User identifier required')
    }

    // 1. Locate order and verify ownership
    const order = await this.orderRepo.findOrderByUuid(params.orderUuid)
    if (!order || order.userId !== resolvedUserId) {
      throw new NotFoundException(`Order '${params.orderUuid}' not found`)
    }

    // 2. Idempotency Check: if order is already paid, return early
    if (order.paymentStatus === 'PAID') {
      return {
        success: true,
        alreadyPaid: true,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
      }
    }

    // 3. Locate or resolve matching payment attempt
    let attempt = await this.orderRepo.findPaymentAttemptByReference(params.reference)
    if (!attempt && order.id) {
      const activeAttempt = await this.orderRepo.findActivePaymentAttempt(order.id)
      if (activeAttempt) {
        attempt = activeAttempt
      } else {
        // Record attempt for this reference if none exists yet
        attempt = await this.orderRepo.recordPaymentAttempt(order.id, {
          reference: params.reference,
          amountKobo: order.totalAmountKobo,
          currency: order.currency,
          status: 'INITIATED',
        })
      }
    }

    // 4. Query Paystack Gateway directly for authoritative verification
    const verification = await this.paymentGateway.verifyTransaction(params.reference)

    if (verification?.status) {
      const amountKobo = verification.amount
        ? Math.round(verification.amount * 100)
        : Number(order.totalAmountKobo)

      const targetReference = attempt?.reference || params.reference

      const confirmationResult = await this.confirmCommercePaymentUseCase.execute({
        reference: targetReference,
        amount: amountKobo,
        currency: verification.currency || order.currency || 'NGN',
        status: 'success',
        channel: 'card',
        paid_at: new Date().toISOString(),
      })

      const updatedOrder = await this.orderRepo.findOrderByUuid(params.orderUuid)
      return {
        success: confirmationResult.success,
        orderNumber: updatedOrder?.orderNumber || order.orderNumber,
        status: updatedOrder?.status,
        paymentStatus: updatedOrder?.paymentStatus,
      }
    }

    this.logger.warn(`Paystack verification returned unverified status for reference ${params.reference}`)
    throw new BadRequestException('Payment verification failed with payment gateway. Please check your transaction reference.')
  }
}
