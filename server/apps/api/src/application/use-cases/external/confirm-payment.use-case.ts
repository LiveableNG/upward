import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RecordTransactionUseCase } from '../payments/payment.use-cases'

@Injectable()
export class ConfirmExternalPaymentUseCase {
  private readonly logger = new Logger(ConfirmExternalPaymentUseCase.name)

  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly recordTransactionUseCase: RecordTransactionUseCase,
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

    if (!transaction) {
      throw new BadRequestException('Transaction could not be recorded')
    }

    if (transaction.status === 'SUCCESS') {
      // Re-fetch or check updated status (it should be PAID since we paid the full amount)
      const updatedPR = await this.paymentRequestRepository.findById(paymentRequest.id!)
      
      return {
        success: true,
        transactionUuid: transaction.uuid,
        status: updatedPR?.status || 'PAID'
      }
    } else {
      throw new BadRequestException('Payment verification failed or returned non-success status')
    }
  }
}
