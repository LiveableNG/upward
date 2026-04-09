import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RecordTransactionUseCase } from '../payments/payment.use-cases'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'

@Injectable()
export class ConfirmExternalPaymentUseCase {
  private readonly logger = new Logger(ConfirmExternalPaymentUseCase.name)

  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly recordTransactionUseCase: RecordTransactionUseCase,
    private readonly webhookService: WebhookService,
  ) {}

  async execute(paymentUuid: string, reference: string): Promise<any> {
    const paymentRequest = await this.paymentRequestRepository.findByUuid(paymentUuid)
    if (!paymentRequest) {
      throw new NotFoundException(`Payment request with UUID ${paymentUuid} not found`)
    }

    if (paymentRequest.status === 'PAID') {
      return { success: true, message: 'Payment already confirmed as PAID' }
    }

    const user = await this.userRepository.findById(paymentRequest.userId)
    if (!user) {
      throw new NotFoundException('User associated with payment request not found')
    }

    // Record and verify transaction
    const transaction = await this.recordTransactionUseCase.execute({
      userId: user.uuid,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      narration: paymentRequest.description || 'External Payment',
      reference: reference,
      status: 'PENDING',
      type: 'RENT',
      paymentRequestId: paymentRequest.id!,
    })

    if (transaction.status === 'SUCCESS') {
      // Update Payment Request status
      await this.paymentRequestRepository.update(paymentRequest.id!, {
        status: 'PAID',
        paidAt: new Date(),
        reference: reference, // Link the final verified reference
      })

      // Send Webhook to Platform via WebhookService (Persistent + Retries)
      if (paymentRequest.platformId) {
        await this.webhookService.sendWebhook(paymentRequest.platformId, 'payment.confirmed', {
          event: 'payment.confirmed',
          data: {
            paymentUuid: paymentRequest.uuid,
            reference: reference,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            description: paymentRequest.description,
            status: 'PAID',
            paidAt: new Date(),
            customerEmail: user.email,
          }
        })
      }

      return {
        success: true,
        transactionUuid: transaction.uuid,
        status: 'PAID'
      }
    } else {
      throw new BadRequestException('Payment verification failed or returned non-success status')
    }
  }
}
