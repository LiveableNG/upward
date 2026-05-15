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
  ) { }

  async execute(data: { userId: string; reference: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    const isDvaSession = data.reference.startsWith('DVA-')

    const existing = await this.txRepo.findByReference(data.reference)
    if (existing) {
      this.logger.log(`Found existing transaction by reference: ${data.reference}`)
      return { existing, isVerified: existing.status === 'SUCCESS', verifiedAmount: existing.amount, user, isNew: false }
    }

    if (isDvaSession) {
      this.logger.log(`Searching for successful DVA transaction for session: ${data.reference}`)
      const parts = data.reference.split('-')
      const accountNumber = parts[1] 

      if (accountNumber) {
        const recentDvaTx = await this.txRepo.findRecentDvaTransaction(accountNumber)

        if (recentDvaTx) {
          this.logger.log(`Found successful DVA transaction ${recentDvaTx.reference} for session ${data.reference}`)
          return { existing: recentDvaTx, isVerified: true, verifiedAmount: recentDvaTx.amount, user, isNew: false }
        }
      }
      
      return { isVerified: false, user, isNew: true }
    }

    let verifiedData: any = { status: false }
    try {
      verifiedData = await this.gateway.verifyTransaction(data.reference)
    } catch (e) {
      this.logger.error(`Gateway verification failed for ${data.reference}:`, e)
      return { isVerified: false, user, isNew: true }
    }

    return { 
      isVerified: verifiedData.status, 
      verifiedAmount: verifiedData.amount, 
      user, 
      isNew: true 
    }
  }
}
