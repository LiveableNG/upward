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
        const recentDvaTx = await this.txRepo.findRecentDvaTransaction(accountNumber)

        if (recentDvaTx) {
          // 1. If we have a PR UUID in the reference, check for an exact match first
          if (prUuid && recentDvaTx.paymentRequest?.uuid === prUuid) {
            this.logger.log(`Found matching DVA transaction ${recentDvaTx.reference} for PR ${prUuid}`)
            return { existing: recentDvaTx, isVerified: true, verifiedAmount: recentDvaTx.amount, user, isNew: false }
          }

          // 2. Fallback to timestamp check for legacy sessions or if PR UUID didn't match
          // Use a more lenient 2-hour window to account for users paying before opening the link
          const gracePeriod = 2 * 60 * 60 * 1000 // 2 hours
          const sessionStartTime = sessionTimestamp ? new Date(sessionTimestamp - gracePeriod) : new Date(0)

          if (recentDvaTx.createdAt >= sessionStartTime) {
            this.logger.log(`Found fresh DVA transaction ${recentDvaTx.reference} for session ${data.reference}`)
            return { existing: recentDvaTx, isVerified: true, verifiedAmount: recentDvaTx.amount, user, isNew: false }
          } else {
            this.logger.log(`Ignoring old successful DVA transaction ${recentDvaTx.reference} for session ${data.reference}`)
          }
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
