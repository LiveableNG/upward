import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  OVERPAYMENT_REPOSITORY,
  IOverpaymentRepository,
} from '../../../domains/payments/payment.repository'

@Injectable()
export class HandlePaymentOverpaymentUseCase {
  private readonly logger = new Logger(HandlePaymentOverpaymentUseCase.name)

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(OVERPAYMENT_REPOSITORY)
    private readonly overpaymentRepo: IOverpaymentRepository,
  ) {}

  async execute(params: {
    userId: number
    excess: number
    reference: string
    currency: string
    paymentRequestId?: number
    propertyAddress?: string
    futureCreditName?: string
    parentTransactionId: number
    txClient: any
  }) {
    const { userId, excess, reference, currency, paymentRequestId, propertyAddress, futureCreditName, parentTransactionId, txClient } = params

    if (excess <= 0) return

    const futureCreditRef = `FC_${reference}`
    const existingFc = await this.txRepo.findByReference(futureCreditRef, txClient)
    
    if (!existingFc) {
      const creditName = futureCreditName || 'Future Credit'
      await this.txRepo.create({
        userId: userId,
        type: 'RENT',
        status: 'SUCCESS',
        amount: excess,
        currency: currency,
        reference: futureCreditRef,
        narration: creditName,
        paymentRequestId: paymentRequestId,
        propertyAddress: propertyAddress,
        lineItems: [{ name: creditName, amount: excess }],
      } as any, txClient)

      await this.overpaymentRepo.create({
        userId: userId,
        amount: excess,
        currency: currency,
        transactionId: parentTransactionId,
        paymentRequestId: paymentRequestId,
        status: 'AVAILABLE',
      }, txClient)
      
      this.logger.log(`Overpayment of ${excess} recorded as Future Credit for user ${userId}`)
    }
  }
}
