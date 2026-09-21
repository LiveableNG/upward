import { Inject, Injectable } from '@nestjs/common'
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'

@Injectable()
export class GetBanksUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) { }

  async execute() {
    return this.gateway.getBanks()
  }
}
