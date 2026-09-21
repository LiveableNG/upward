import { Inject, Injectable } from '@nestjs/common'
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'

@Injectable()
export class VerifyAccountUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) { }

  async execute(accountNumber: string, bankCode: string) {
    return this.gateway.verifyAccountNumber(accountNumber, bankCode)
  }
}
