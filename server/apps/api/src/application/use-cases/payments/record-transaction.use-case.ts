import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentSucceededEvent } from '../../events/definition/payment-succeeded.event'
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
  Transaction,
  OVERPAYMENT_REPOSITORY,
  IOverpaymentRepository,
} from '../../../domains/payments/payment.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'
import { VerifyGatewayTransactionUseCase } from './verify-transaction.use-case'
import { DistributePaymentAllocationsUseCase } from './distribute-allocations.use-case'
import { ActivateBenefitsSubscriptionUseCase } from './benefits-subscription.use-cases'
import { SyncPmPaymentStatusUseCase } from './sync-pm-status.use-case'
import { SettlePropertyBalanceUseCase } from './settle-property.use-case'
import { HandlePaymentOverpaymentUseCase } from './handle-overpayment.use-case'

export interface LineItemPayment {
  id: number
  amountPaid: number
  amount?: number
  name?: string
}

@Injectable()
export class RecordTransactionUseCase {
  private readonly logger = new Logger(RecordTransactionUseCase.name)

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly verifyTransaction: VerifyGatewayTransactionUseCase,
    private readonly distributeAllocations: DistributePaymentAllocationsUseCase,
    private readonly activateBenefits: ActivateBenefitsSubscriptionUseCase,
    private readonly syncPmStatus: SyncPmPaymentStatusUseCase,
    private readonly settleProperty: SettlePropertyBalanceUseCase,
    private readonly handleOverpayment: HandlePaymentOverpaymentUseCase,
    @Inject(OVERPAYMENT_REPOSITORY)
    private readonly overpaymentRepo: IOverpaymentRepository,
    private readonly paymentConfig: PaymentConfigurationService,
  ) { }

  async execute(
    data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & {
      userId: string
      userPropertyUuid?: string
      lineItemPayments?: LineItemPayment[]
      futureCreditName?: string
      lineItems?: any[]
      sequentialFill?: boolean // When true, fills line items top-to-bottom instead of proportionally
      metadata?: any
    }
  ) {
    this.logger.log(`Recording transaction for reference: ${data.reference}`)

    const verification = await this.verifyTransaction.execute({
      userId: data.userId,
      reference: data.reference,
    })

    if (!verification.isNew && verification.existing) {
      return verification.existing
    }

    const { isVerified, verifiedAmount, user } = verification
    if (isVerified && !user) {
      this.logger.error(`Transaction verified but user not found for ID: ${data.userId}`)
      throw new UnauthorizedException('User context required to record transaction')
    }

    if (isVerified && verifiedAmount !== undefined) {
      data.amount = verifiedAmount
    }

    const appliedCredit = Number((data as any).metadata?.appliedCredit || 0)
    const effectiveAmount = data.amount + appliedCredit

    const { result, pr, rentPortion, excess, paymentAmount } = await this.prisma.$transaction(async (txClient) => {
      let pr: any = null
      let excess = 0
      let remaining = effectiveAmount
      let rentPortion = 0
      let propertyId: number | undefined

      if (isVerified && data.type === 'RENT' && !data.paymentRequestId && data.userPropertyUuid) {
        const prop = await txClient.upward_user_property.findUnique({ where: { uuid: data.userPropertyUuid } })
        if (prop) {
          const matchingPRs = await txClient.upward_payment_request.findMany({
            where: { userId: user!.id, userPropertyId: prop.id, status: { in: ['PENDING', 'PARTIAL'] } }
          })
          if (matchingPRs.length > 0) {
            data.paymentRequestId = matchingPRs[0]?.id
          }
        }
      }

      if (isVerified && data.paymentRequestId) {
        pr = await this.paymentRequestRepo.findById(data.paymentRequestId, txClient)
        if (pr) {
          if (pr.status === 'PAID' && !data.settlementStatus) {
            data.settlementStatus = 'PENDING_REFUND'
            this.logger.warn(`Duplicate payment attempt detected for already settled request: ${pr.uuid}. Marking reference ${data.reference} for refund.`)
          }

          const ratesForExpected = await this.paymentConfig.getDynamicProcessingRates(pr.userId, pr.userPropertyId, pr.id)
          const hasLineItems = data.lineItemPayments && data.lineItemPayments.length > 0
          const hasBenefitsItem = data.lineItemPayments?.some(lp => lp.name === 'Upward Benefits')
          const matchesRentPlusTxFee = effectiveAmount === pr.amount + ratesForExpected.transactionFee
          const excludeBenefits = (data as any).metadata?.excludeBenefits === true ||
            (hasLineItems && !hasBenefitsItem) ||
            matchesRentPlusTxFee
          const activeBenefitsFee = (ratesForExpected.benefitsPaid || excludeBenefits) ? 0 : ratesForExpected.benefitsFee
          const dynamicFee = data.isManual ? 0 : (ratesForExpected.transactionFee + activeBenefitsFee)
          const expectedTotal = pr.amount + dynamicFee
          if (!pr.allowPartial && effectiveAmount < expectedTotal && !data.settlementStatus) {
            data.settlementStatus = 'PENDING_REFUND'
            this.logger.warn(`Full-Payment Violation: User paid ${effectiveAmount} instead of ${expectedTotal}. Marking reference ${data.reference} for refund.`)
          }

          const prItems = await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } })
          const rentRemaining = prItems.reduce((sum, item) => {
            if (item.name === 'Upward Benefits') return sum
            return sum + Math.max(0, item.totalAmount - item.amountPaid)
          }, 0)
          remaining = rentRemaining
        }
      }

      let upwardFeeAmount = 0
      if (data.lineItemPayments && Array.isArray(data.lineItemPayments)) {
        const fees = data.lineItemPayments.filter(lp =>
          lp.name === 'Upward Benefits'
        )
        if (fees.length > 0) {
          upwardFeeAmount = fees.reduce((sum, f) => sum + Number(f.amount || f.amountPaid || 0), 0)
        }
      }

      if (upwardFeeAmount === 0 && pr && !data.isManual) {
        try {
          const rates = await this.paymentConfig.getDynamicProcessingRates(pr.userId, pr.userPropertyId, pr.id)
          const txFee = rates.transactionFee
          const isBenefitsOptedIn = (data as any).metadata?.includeBenefits === true
          const excludeBenefits = (data as any).metadata?.excludeBenefits === true || !isBenefitsOptedIn
          const benFee = (rates.benefitsPaid || excludeBenefits) ? 0 : rates.benefitsFee
          upwardFeeAmount = txFee + benFee
        } catch (e: any) {
          this.logger.error(`Failed to resolve dynamic processing rates in RecordTransactionUseCase: ${e?.message}`)
        }
      }

      const paymentAmount = pr ? Math.min(effectiveAmount - upwardFeeAmount, remaining) + upwardFeeAmount : effectiveAmount
      excess = pr ? Math.max(0, effectiveAmount - upwardFeeAmount - remaining) : 0

      const isBenefitsOnly = data.type === 'BENEFITS_SUBSCRIPTION'

      const result = await this.txRepo.create({
        ...data,
        userId: user!.id!,
        amount: effectiveAmount,
        status: isVerified ? 'SUCCESS' : 'FAILED',
        narration: data.narration || pr?.description || (isBenefitsOnly ? 'Upward Benefits' : 'Property Payment'),
        landlordId: data.landlordId || pr?.subaccount?.uuid || undefined,
        settlementStatus: data.settlementStatus || (isBenefitsOnly ? 'SETTLED' : undefined),
      } as any, txClient)

      if (isVerified && result.status === 'SUCCESS' && result.settlementStatus === 'PENDING_REFUND') {
        const refundReason = (pr && pr.status === 'PAID') ? 'DUPLICATE_PAYMENT' : 'UNDERPAYMENT_VIOLATION';
        await txClient.upward_refund_log.create({
          data: {
            transactionId: result.id,
            userId: user!.id!,
            amount: effectiveAmount,
            currency: result.currency || 'NGN',
            reason: refundReason,
            status: 'FLAGGED',
            actionBy: 'SYSTEM',
            flaggedAt: new Date()
          }
        });
      }

      if (isVerified && result.status === 'SUCCESS' && result.settlementStatus !== 'PENDING_REFUND') {
        if (pr) {
          const settlementPortion = Math.max(0, paymentAmount - upwardFeeAmount)
          const newAmountPaid = (pr.amountPaid || 0) + settlementPortion
          const prItems = await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } })
          const totalRentOwed = prItems.reduce((sum: number, i: any) =>
            (i.name === 'Upward Benefits') ? sum : sum + i.totalAmount
            , 0)
          const newStatus = newAmountPaid >= totalRentOwed ? 'PAID' : 'PARTIAL'

          pr = await this.paymentRequestRepo.update(pr.id!, {
            amountPaid: Math.min(newAmountPaid, totalRentOwed),
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : undefined,
          }, txClient)
        }

        const distribution = await this.distributeAllocations.execute({
          transactionId: result.id,
          paymentRequestId: pr?.id,
          amount: effectiveAmount,
          upwardFeeAmount,
          lineItemPayments: data.lineItemPayments,
          manualLineItems: data.lineItems,
          narration: result.narration,
          sequentialFill: data.sequentialFill,
          txClient
        })
        rentPortion = distribution.rentPortion
        propertyId = pr?.userPropertyId
        if (!propertyId && data.userPropertyUuid) {
          const p = await txClient.upward_user_property.findUnique({ where: { uuid: data.userPropertyUuid } })
          propertyId = p?.id
        }

        const benefitsAllocated = (distribution.allocatedItems || []).reduce((sum: number, item: any) => {
          if (item?.name === 'Upward Benefits') {
            return sum + Number(item.amount || item.amountPaid || item.allocated || 0)
          }
          return sum
        }, 0)

        if (benefitsAllocated > 0) {
          await this.activateBenefits.execute({
            userId: user!.id!,
            userPropertyId: propertyId,
            transactionId: result.id,
            amountPaid: benefitsAllocated,
            currency: data.currency || 'NGN',
            source: data.type === 'BENEFITS_SUBSCRIPTION' ? 'STANDALONE' : 'RENT_CHECKOUT',
            txClient,
          })
        }

        let settledPeriod: any = null
        if (propertyId && rentPortion > 0) {
          settledPeriod = await this.settleProperty.execute({
            userId: user!.id!,
            propertyId,
            rentPortion,
            paymentRequestId: pr?.id,
            dueDate: pr?.dueDate,
            rentEndDate: pr?.rentEndDate,
            rentType: pr?.rentType,
            currency: data.currency,
            description: result.narration,
            txClient
          })
        }

        if (pr) {
          await this.syncPmStatus.execute({
            paymentRequestId: pr.id,
            rentPortion,
            periodStart: settledPeriod?.periodStart,
            periodEnd: settledPeriod?.periodEnd,
            txClient
          })
        } else if (data.userPropertyUuid && rentPortion > 0) {
          await this.syncPmStatus.executeForProperty({
            userPropertyUuid: data.userPropertyUuid,
            rentPortion,
            narration: result.narration,
            periodStart: settledPeriod?.periodStart,
            periodEnd: settledPeriod?.periodEnd,
            txClient
          })
        }

        try {
          await txClient.upward_notification.create({
            data: {
              userId: user!.id!,
              title: 'Payment Confirmed',
              message: `Your payment of ${result.currency || 'NGN'} ${result.amount.toLocaleString()} has been received and confirmed.`,
              type: 'PAYMENT',
              url: `/dashboard/receipts?id=${result.uuid}`,
            },
          })
        } catch (notifErr: any) {
          this.logger.warn(`Failed to create tenant payment notification: ${notifErr?.message}`)
        }

        await this.handleOverpayment.execute({
          userId: user!.id!,
          excess,
          reference: data.reference,
          currency: data.currency || 'NGN',
          paymentRequestId: pr?.id,
          propertyAddress: data.propertyAddress,
          futureCreditName: data.futureCreditName,
          parentTransactionId: result.id,
          txClient
        })

        if (appliedCredit > 0) {
          let remainingToConsume = appliedCredit
          const overpayments = await this.overpaymentRepo.findByUserIdAndStatus(user!.id!, 'AVAILABLE', txClient)
          for (const op of overpayments) {
            if (remainingToConsume <= 0) break
            const toConsume = Math.min(op.amount, remainingToConsume)
            const newAmount = op.amount - toConsume
            await this.overpaymentRepo.update(op.id, {
              amount: newAmount,
              status: newAmount <= 0 ? 'USED' : 'AVAILABLE'
            }, txClient)
            remainingToConsume -= toConsume
          }
        }

        // Snapshot receipt state on upward_transaction for instant, immutable receipts
        let freshPr: any = null
        if (pr?.id) {
          freshPr = await txClient.upward_payment_request.findUnique({ where: { id: pr.id } })
        }

        const activePr = freshPr || pr

        const propRecord = propertyId
          ? await txClient.upward_user_property.findUnique({ where: { id: propertyId } })
          : null

        let snapshotRentStart: Date | null = settledPeriod?.periodStart
          || (activePr?.rentStartDate ? new Date(activePr.rentStartDate) : null)
          || (propRecord?.rentStartDate ? new Date(propRecord.rentStartDate) : null)
        let snapshotRentEnd: Date | null = settledPeriod?.periodEnd
          || (activePr?.rentEndDate ? new Date(activePr.rentEndDate) : null)
          || (propRecord?.rentEndDate ? new Date(propRecord.rentEndDate) : null)
        let snapshotTotalInvoice: number | null = (propRecord?.rentAmount && propRecord.initialAmountPaid > 0)
          ? propRecord.rentAmount
          : (activePr?.amount || null)
        let snapshotHistoricalPaid: number | null = null
        let snapshotRemaining: number | null = null
        let snapshotIsPartial: boolean | null = null

        if (activePr) {
          const priorTxs = await txClient.upward_transaction.findMany({
            where: {
              paymentRequestId: activePr.id,
              status: 'SUCCESS',
              createdAt: { lte: result.createdAt },
            },
          })
          snapshotHistoricalPaid = priorTxs.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || result.amount || activePr.amountPaid || 0
          snapshotTotalInvoice = activePr.amount
          snapshotRemaining = Math.max(0, activePr.amount - (snapshotHistoricalPaid || 0))
          snapshotIsPartial = (snapshotRemaining || 0) > 0
        } else if (propertyId) {
          if (propRecord) {
            snapshotTotalInvoice = propRecord.rentAmount || null
            snapshotHistoricalPaid = propRecord.amountPaid || result.amount
            snapshotRemaining = propRecord.amountRemaining ?? 0
            snapshotIsPartial = (snapshotRemaining ?? 0) > 0
          }
        }

        await txClient.upward_transaction.update({
          where: { id: result.id },
          data: {
            rentStartDate: snapshotRentStart,
            rentEndDate: snapshotRentEnd,
            totalInvoiceAmount: snapshotTotalInvoice,
            historicalPaidToDate: snapshotHistoricalPaid,
            remainingBalance: snapshotRemaining,
            isPartial: snapshotIsPartial,
            tenancyPeriodId: settledPeriod?.tenancyPeriodId,
          } as any
        })
      }

      return { result, pr, rentPortion, excess, paymentAmount }
    }, { timeout: 20000 })

    if (isVerified && result.status === 'SUCCESS') {
      let userProperty: any = null
      if (pr && pr.userPropertyId) {
        userProperty = await this.prisma.upward_user_property.findUnique({
          where: { id: pr.userPropertyId },
          include: { company: true }
        })
      } else if (data.userPropertyUuid) {
        userProperty = await this.prisma.upward_user_property.findUnique({
          where: { uuid: data.userPropertyUuid },
          include: { company: true }
        })
      }

      const effectivePlatformId = userProperty?.platformId || userProperty?.company?.platformId || undefined

      this.eventBus.publish(new PaymentSucceededEvent({
        transactionId: result.id,
        userId: user!.id!,
        propertyId: userProperty?.id,
        externalUnitId: userProperty?.externalUnitId,
        platformId: effectivePlatformId,
        amount: paymentAmount,
        rentPortion: rentPortion,
        paymentRequestId: pr?.id,
        paymentRequestUuid: pr?.uuid,
        reference: result.reference!,
        currency: result.currency || 'NGN',
        email: user!.email!,
        narration: result.narration || 'Property Payment',
        excess: excess,
      }))
    }

    return result
  }
}
