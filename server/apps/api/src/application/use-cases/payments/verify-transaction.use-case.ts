import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  IPaymentGateway,
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
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
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
  ) { }

  async execute(data: { userId: string; reference: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    const isDvaSession = data.reference.startsWith('DVA-') || data.reference.startsWith('DVA_')

    const existing = await this.txRepo.findByReference(data.reference)
    if (existing) {
      this.logger.log(`Found existing transaction by reference: ${data.reference}`)
      return { existing, isVerified: existing.status === 'SUCCESS', verifiedAmount: existing.amount, user, isNew: false }
    }

    if (process.env.MOCK_PAYMENTS === 'true') {
      this.logger.log(`[MOCK_PAYMENTS] Mocking transaction verification for reference: ${data.reference}`)
      let verifiedAmount: number | undefined = undefined
      
      if (isDvaSession) {
        const parts = data.reference.split('_')
        const prUuid = parts[2]
        if (prUuid && prUuid !== 'no-pr') {
          const pr = await this.paymentRequestRepo.findByUuid(prUuid)
          if (pr) {
            verifiedAmount = pr.amount - (pr.amountPaid || 0)
          }
        }
      }

      return {
        isVerified: true,
        verifiedAmount,
        user,
        isNew: true
      }
    }

    if (isDvaSession) {
      let accountNumber = ''
      let sessionTimestamp: number = 0

      if (data.reference.includes('DVA_')) {
        const parts = data.reference.split('_')
        accountNumber = parts[1] || ''
        sessionTimestamp = parseInt(parts[parts.length - 1] || '0') || 0
      } else {
        const raw = data.reference.replace(/^DVA-/, '')
        const lastDash = raw.lastIndexOf('-')
        if (lastDash !== -1) {
          const tail = raw.substring(lastDash + 1)
          if (/^\d{10,}$/.test(tail)) {
            sessionTimestamp = parseInt(tail) || 0
            const head = raw.substring(0, lastDash)
            const firstDash = head.indexOf('-')
            accountNumber = firstDash !== -1 ? head.substring(0, firstDash) : head
          } else {
            // Fallback: just grab account number
            const parts = raw.split('-')
            accountNumber = parts[0] || ''
          }
        }
      }

      this.logger.log(`DVA session parsed: account=${accountNumber}, sessionTs=${sessionTimestamp}`)

      if (accountNumber) {

        const createdAfter = sessionTimestamp ? new Date(sessionTimestamp) : undefined
        const recentDvaTx = await this.txRepo.findRecentDvaTransaction(accountNumber, createdAfter)

        if (recentDvaTx) {
          this.logger.log(`Found DVA transaction ${recentDvaTx.reference} for account ${accountNumber} created after ${sessionTimestamp}`)
          return { existing: recentDvaTx, isVerified: true, verifiedAmount: recentDvaTx.amount, user, isNew: false }
        } else {
          this.logger.log(`No DVA transaction found for account ${accountNumber} after ${sessionTimestamp}`)
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
