import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'

export interface PaystackPaymentWebhookData {
  reference: string
  amount: number // In kobo per Paystack standard
  currency: string
  status: string
  gateway_response?: string
  channel?: string
  paid_at?: string
  metadata?: any
}

export interface ConfirmCommercePaymentResult {
  success: boolean
  message?: string
  orderNumber?: string
  reason?: string
}

@Injectable()
export class ConfirmCommercePaymentUseCase {
  private readonly logger = new Logger(ConfirmCommercePaymentUseCase.name)

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
  ) {}

  async execute(data: PaystackPaymentWebhookData): Promise<ConfirmCommercePaymentResult> {
    const reference = data.reference
    this.logger.log(`Confirming commerce payment for reference: ${reference}`)

    // 1. Locate payment attempt in database
    const attempt = await this.orderRepo.findPaymentAttemptByReference(reference)
    if (!attempt) {
      this.logger.warn(`No commerce payment attempt found for reference: ${reference}`)
      return {
        success: false,
        reason: 'Payment attempt reference not found',
      }
    }

    const order = attempt.order
    if (!order) {
      this.logger.error(`Payment attempt ${reference} has no associated commerce order`)
      return {
        success: false,
        reason: 'Order association missing for payment attempt',
      }
    }

    // 2. Idempotency Check: if order is already CONFIRMED and PAID, return safely without duplicate transitions
    if (order.status === 'CONFIRMED' && order.paymentStatus === 'PAID') {
      this.logger.log(`Order ${order.orderNumber} is already confirmed and paid. Idempotent success returned.`)
      return {
        success: true,
        message: 'Order payment already confirmed and processed',
        orderNumber: order.orderNumber,
      }
    }

    // 3. Late Payment / Cancelled Order Recovery Boundary
    if (order.status === 'CANCELLED') {
      this.logger.error(
        `CRITICAL: Verified payment received for CANCELLED/EXPIRED order ${order.orderNumber}. Inventory may be released. Flagged for admin refund review.`,
      )
      await this.orderRepo.updatePaymentAttemptStatus(
        reference,
        'PAID_AFTER_CANCELLATION',
        data.gateway_response || 'Payment received after order cancellation',
      )
      await this.orderRepo.recordAuditLog(order.id!, {
        event: 'PAYMENT_RECEIVED_AFTER_EXPIRATION',
        fromState: 'CANCELLED',
        toState: 'CANCELLED',
        actorType: 'SYSTEM',
        actorId: 'PAYSTACK_WEBHOOK',
        details: {
          reference,
          amountKobo: data.amount.toString(),
          warning: 'Manual refund or inventory re-allocation required by admin.',
        },
      })
      return {
        success: false,
        reason: 'Order was cancelled prior to payment receipt. Marked for manual administrative review.',
        orderNumber: order.orderNumber,
      }
    }

    // 4. Verify transaction status from gateway
    if (data.status !== 'success') {
      this.logger.warn(`Payment reference ${reference} received non-success status: ${data.status}`)
      await this.orderRepo.updatePaymentAttemptStatus(
        reference,
        'FAILED',
        data.gateway_response || `Gateway reported status: ${data.status}`,
      )
      return {
        success: false,
        reason: `Gateway reported non-success status: ${data.status}`,
        orderNumber: order.orderNumber,
      }
    }

    // 5. Verify authoritative amount (Paystack amount is in kobo, attempt.amountKobo is BigInt kobo)
    const receivedAmountKobo = BigInt(data.amount)
    if (receivedAmountKobo !== attempt.amountKobo) {
      this.logger.error(
        `CRITICAL: Amount mismatch for reference ${reference}. Expected ${attempt.amountKobo} kobo, received ${receivedAmountKobo} kobo`,
      )
      await this.orderRepo.updatePaymentAttemptStatus(
        reference,
        'AMOUNT_MISMATCH',
        `Expected ${attempt.amountKobo} kobo, received ${receivedAmountKobo} kobo`,
      )
      throw new BadRequestException('Payment amount does not match authoritative order amount')
    }

    // 6. Verify currency
    const expectedCurrency = (attempt.currency || order.currency || 'NGN').toUpperCase()
    if (data.currency && data.currency.toUpperCase() !== expectedCurrency) {
      this.logger.error(`Currency mismatch for reference ${reference}: expected ${expectedCurrency}, got ${data.currency}`)
      await this.orderRepo.updatePaymentAttemptStatus(reference, 'CURRENCY_MISMATCH', `Expected ${expectedCurrency}`)
      throw new BadRequestException('Payment currency mismatch')
    }

    // 7. Atomic Order Payment Confirmation & Vendor Payable Ledger Creation
    const paidAt = data.paid_at ? new Date(data.paid_at) : new Date()

    await this.orderRepo.confirmOrderPayment({
      orderId: order.id!,
      paymentReference: reference,
      channel: data.channel,
      paidAt,
    })

    this.logger.log(`Order ${order.orderNumber} successfully confirmed and transitioned to PAID`)

    return {
      success: true,
      message: 'Payment confirmed successfully. Order is now processing.',
      orderNumber: order.orderNumber,
    }
  }
}
