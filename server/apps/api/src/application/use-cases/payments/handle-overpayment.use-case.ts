import { Injectable, Logger } from '@nestjs/common'
import { CreditRentDepositUseCase } from './credit-rent-deposit.use-case'

@Injectable()
export class HandlePaymentOverpaymentUseCase {
  private readonly logger = new Logger(HandlePaymentOverpaymentUseCase.name)

  constructor(
    private readonly creditRentDeposit: CreditRentDepositUseCase,
  ) {}

  async execute(params: {
    userId: number
    userPropertyId?: number
    excess: number
    reference: string
    currency: string
    paymentRequestId?: number
    propertyAddress?: string
    futureCreditName?: string
    parentTransactionId?: number
    txClient?: any
  }) {
    const { userId, userPropertyId, excess, reference, currency, paymentRequestId, futureCreditName, txClient } = params

    if (excess <= 0 || !userPropertyId) return

    return this.creditRentDeposit.execute({
      userId,
      userPropertyId,
      amount: excess,
      reference: `EXCESS_${reference}`,
      currency,
      source: 'OVERPAYMENT_EXCESS',
      paymentRequestId,
      narration: futureCreditName || 'Invoice Settlement Excess',
      txClient,
    })
  }
}


