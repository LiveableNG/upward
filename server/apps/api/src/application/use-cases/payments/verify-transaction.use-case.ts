import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { RecordTransactionUseCase } from './payment.use-cases'

@Injectable()
export class VerifyGatewayTransactionUseCase {
  private readonly logger = new Logger(VerifyGatewayTransactionUseCase.name)
  private readonly activeMocks = new Map<string, number>()

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly moduleRef: ModuleRef,
  ) { }

  async execute(data: { userId: string; reference: string }) {
    const user = await this.userRepository.findByUuid(data.userId)

    if (this.activeMocks.has(data.reference)) {
      const mockAmt = this.activeMocks.get(data.reference) || 0
      this.logger.log(`[MOCK] Inside recursive check for reference: ${data.reference}, returning verifiedAmount: ${mockAmt}`)
      return { isVerified: true, verifiedAmount: mockAmt, user, isNew: true }
    }

    const isDvaSession = data.reference.startsWith('DVA-') || data.reference.startsWith('DVA_')

    const existing = await this.txRepo.findByReference(data.reference)
    if (existing) {
      this.logger.log(`Found existing transaction by reference: ${data.reference}`)
      return { existing, isVerified: existing.status === 'SUCCESS', verifiedAmount: existing.amount, user, isNew: false }
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

          const isTestKey = process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_') || !process.env.PAYSTACK_SECRET_KEY
          if (isTestKey && !this.activeMocks.has(data.reference)) {
            this.logger.log(`[MOCK] Test environment detected and no transaction exists. Simulating payment for reference: ${data.reference}`)
            try {
              const prisma = this.moduleRef.get(PrismaService, { strict: false })
              const recordTransactionUseCase = this.moduleRef.get(RecordTransactionUseCase, { strict: false })

              const dva = await prisma.upward_dedicated_virtual_account.findUnique({
                where: { accountNumber }
              })

              let prUuid = ''
              if (data.reference.includes('DVA_')) {
                const parts = data.reference.split('_')
                prUuid = parts[2] || ''
              }

              let pr: any = null
              if (prUuid && prUuid !== 'no-pr') {
                pr = await prisma.upward_payment_request.findUnique({
                  where: { uuid: prUuid },
                  include: { user: true }
                })
              }

              if (!pr && dva) {
                pr = await prisma.upward_payment_request.findFirst({
                  where: {
                    userPropertyId: dva.userPropertyId,
                    status: { in: ['PENDING', 'PARTIAL'] }
                  },
                  include: { user: true }
                })
              }

              let tenantUser = user
              if (pr?.user) {
                tenantUser = pr.user
              } else if (dva?.userPropertyId) {
                const userProp = await prisma.upward_user_property.findUnique({
                  where: { id: dva.userPropertyId },
                  include: { user: true }
                })
                if (userProp?.user) {
                  tenantUser = userProp.user
                }
              }

              if (!tenantUser) {
                this.logger.error(`[MOCK] User context not found for mock transfer on account: ${accountNumber}`)
                return { isVerified: false, user, isNew: true }
              }

              let amountPaid = 0
              let lineItemPayments: any[] | undefined = undefined

              if (dva?.metadata && typeof dva.metadata === 'object') {
                const metadataObj = dva.metadata as any
                if ('lastPaymentIntent' in metadataObj && metadataObj.lastPaymentIntent) {
                  const intent = metadataObj.lastPaymentIntent
                  amountPaid = intent.amount
                  lineItemPayments = intent.lineItems?.map((lp: any) => ({
                    ...lp,
                    amountPaid: Number(lp.amount || lp.amountPaid || 0)
                  }))

                  // Clear intent so it is not reused
                  await prisma.upward_dedicated_virtual_account.update({
                    where: { id: dva.id },
                    data: {
                      metadata: {
                        ...metadataObj,
                        lastPaymentIntent: null
                      }
                    }
                  })
                }
              }

              if (amountPaid <= 0 && pr) {
                amountPaid = pr.amount + 2000 // default processing fee
              }
              if (amountPaid <= 0) {
                amountPaid = 10000 // default to 10k NGN
              }

              const hasNoIntent = !lineItemPayments
              const sequentialFill = pr ? (hasNoIntent && pr.allowPartial && !!pr.id) : false

              // Register the mock payment amount before executing RecordTransactionUseCase
              this.activeMocks.set(data.reference, amountPaid)

              this.logger.log(`[MOCK] Recording transaction via RecordTransactionUseCase for user ${tenantUser.email}, amount ${amountPaid}`)

              const createdTx: any = await recordTransactionUseCase.execute({
                userId: tenantUser.uuid,
                amount: amountPaid,
                currency: pr?.currency || 'NGN',
                reference: data.reference,
                type: 'RENT',
                status: 'SUCCESS',
                paymentRequestId: pr?.id,
                narration: `MOCK: Bank Transfer to ${accountNumber}`,
                settlementStatus: 'VERIFIED',
                lineItemPayments,
                sequentialFill
              })

              return {
                existing: createdTx,
                isVerified: true,
                verifiedAmount: createdTx.amount,
                user: tenantUser,
                isNew: false
              }
            } catch (err) {
              this.logger.error(`[MOCK] Failed to simulate/record payment:`, err)
            } finally {
              this.activeMocks.delete(data.reference)
            }
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

