import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class VerifyGatewayTransactionUseCase {
  private readonly logger = new Logger(VerifyGatewayTransactionUseCase.name)

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(data: { userId: string; reference: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    // Idempotency check
    const existing = await this.txRepo.findByReference(data.reference)
    if (existing) {
      this.logger.warn(`Transaction with reference ${data.reference} already exists. Returning existing record.`)
      return { existing, isNew: false, user }
    }

    // Verification
    let verifiedData: any = { status: false }
    try {
      verifiedData = await this.gateway.verifyTransaction(data.reference)
    } catch (e) {
      this.logger.error(`Gateway verification failed for ${data.reference}:`, e)
      throw e
    }

    return { 
      isVerified: verifiedData.status, 
      verifiedAmount: verifiedData.amount, 
      user, 
      isNew: true 
    }
  }
}
