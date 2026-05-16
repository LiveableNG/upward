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
      const parts = data.reference.split('-')
      const accountNumber = parts[1] || ''
      
      let prUuid: string | null = null
      let sessionTimestamp: number = 0
      
      if (parts.length >= 4) {
        const candidateUuid = parts[2]
        prUuid = (candidateUuid && candidateUuid !== 'no-pr') ? candidateUuid : null
        sessionTimestamp = parseInt(parts[3] || '0') || 0
      } else {
        sessionTimestamp = parseInt(parts[2] || '0') || 0
      }

      if (accountNumber) {

        const createdAfter = sessionTimestamp ? new Date(sessionTimestamp) : undefined
        const recentDvaTx = await this.txRepo.findRecentDvaTransaction(accountNumber, createdAfter)

        if (recentDvaTx) {
          this.logger.log(`Found DVA transaction ${recentDvaTx.reference} for account ${accountNumber} created after session ${sessionTimestamp}`)
          return { existing: recentDvaTx, isVerified: true, verifiedAmount: recentDvaTx.amount, user, isNew: false }
        } else {
          this.logger.log(`No DVA transaction found for account ${accountNumber} after session timestamp ${sessionTimestamp}`)
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
