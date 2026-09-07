import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  RENT_DEPOSIT_BALANCE_REPOSITORY,
  IRentDepositBalanceRepository,
} from '../../../domains/payments/rent-deposit.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { SettlePropertyBalanceUseCase } from './settle-property.use-case'
import { SyncPmPaymentStatusUseCase } from './sync-pm-status.use-case'

@Injectable()
export class ApplyRentDepositToPaymentRequestUseCase {
  private readonly logger = new Logger(ApplyRentDepositToPaymentRequestUseCase.name)

  constructor(
    @Inject(RENT_DEPOSIT_BALANCE_REPOSITORY)
    private readonly depositRepo: IRentDepositBalanceRepository,
    private readonly prisma: PrismaService,
    private readonly settleProperty: SettlePropertyBalanceUseCase,
    private readonly syncPmStatus: SyncPmPaymentStatusUseCase,
  ) {}

  async execute(params: {
    userUuid: string
    paymentRequestUuid: string
    amountToApply: number
    lineItemAllocations?: Array<{ lineItemId: number; amount: number }>
    narration?: string
  }) {
    const { userUuid, paymentRequestUuid, amountToApply, lineItemAllocations, narration } = params

    if (!amountToApply || amountToApply <= 0) {
      throw new BadRequestException('Amount to apply must be greater than zero')
    }

    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userUuid },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const pr = await this.prisma.upward_payment_request.findUnique({
      where: { uuid: paymentRequestUuid },
      include: {
        user: true,
        userProperty: true,
        lineItemRecords: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!pr) {
      throw new NotFoundException('Payment request not found')
    }

    if (pr.userId !== user.id) {
      throw new BadRequestException('You are not authorized to settle this payment request')
    }

    const effectiveUserId = user.id

    if (pr.status === 'PAID') {
      throw new BadRequestException('This payment request is already fully paid')
    }

    if (!pr.userPropertyId) {
      throw new BadRequestException('Payment request is not associated with a property')
    }

    const depositBalance = await this.depositRepo.findByUserAndProperty(
      effectiveUserId,
      pr.userPropertyId,
    )

    if (!depositBalance || depositBalance.balance <= 0) {
      throw new BadRequestException('You do not have an available Rent Deposit Balance for this property')
    }

    const currentBalance = depositBalance.balance
    if (amountToApply > currentBalance) {
      throw new BadRequestException(
        `Amount to apply (₦${amountToApply.toLocaleString()}) exceeds available balance (₦${currentBalance.toLocaleString()})`
      )
    }

    const currentPaid = pr.amountPaid || 0
    const remainingOwed = Math.max(0, pr.amount - currentPaid)

    if (amountToApply > remainingOwed) {
      throw new BadRequestException(
        `Amount to apply (₦${amountToApply.toLocaleString()}) cannot exceed the remaining bill balance of ₦${remainingOwed.toLocaleString()}`
      )
    }

    // Validate lineItemAllocations sum if provided
    if (lineItemAllocations && lineItemAllocations.length > 0) {
      const sumAlloc = lineItemAllocations.reduce((s, a) => s + (Number(a.amount) || 0), 0)
      if (Math.abs(sumAlloc - amountToApply) > 0.01) {
        throw new BadRequestException(
          `Line item allocations sum (₦${sumAlloc.toLocaleString()}) must match total amount applied (₦${amountToApply.toLocaleString()})`
        )
      }
    }

    return this.prisma.$transaction(async (txClient: any) => {
      const balanceBefore = depositBalance.balance
      const balanceAfter = balanceBefore - amountToApply

      const reference = `RD_DEBIT_${pr.uuid.slice(0, 8)}_${Date.now()}`

      const debitTx = await this.depositRepo.createTransaction(
        {
          depositBalanceId: depositBalance.id,
          userId: effectiveUserId,
          userPropertyId: pr.userPropertyId!,
          paymentRequestId: pr.id,
          type: 'DEBIT',
          amount: amountToApply,
          balanceBefore,
          balanceAfter,
          source: 'PR_APPLICATION',
          status: 'SUCCESS',
          reference,
          narration: narration || `Applied to Rent Payment Request (${pr.description || pr.uuid.slice(0, 8)})`,
        },
        txClient,
      )

      await this.depositRepo.updateBalance(depositBalance.id, balanceAfter, txClient)

      // Update line items
      let rentPortion = 0
      if (lineItemAllocations && lineItemAllocations.length > 0) {
        for (const alloc of lineItemAllocations) {
          if (!alloc.amount || alloc.amount <= 0) continue
          const lineItem = pr.lineItemRecords?.find((i: any) => i.id === alloc.lineItemId)
          if (lineItem) {
            const newPaid = (lineItem.amountPaid || 0) + alloc.amount
            const newStatus = newPaid >= lineItem.totalAmount ? 'PAID' : 'PARTIAL'
            await txClient.upward_payment_line_item.update({
              where: { id: lineItem.id },
              data: {
                amountPaid: newPaid,
                status: newStatus,
              },
            })
            if (!['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(lineItem.name)) {
              rentPortion += alloc.amount
            }
          }
        }
      } else {
        // Sequential distribution across line items
        let remainingToDistribute = amountToApply
        for (const item of (pr.lineItemRecords || [])) {
          if (remainingToDistribute <= 0) break
          const itemRemaining = Math.max(0, item.totalAmount - (item.amountPaid || 0))
          if (itemRemaining <= 0) continue

          const allocated = Math.min(itemRemaining, remainingToDistribute)
          const newPaid = (item.amountPaid || 0) + allocated
          const newStatus = newPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'

          await txClient.upward_payment_line_item.update({
            where: { id: item.id },
            data: {
              amountPaid: newPaid,
              status: newStatus,
            },
          })

          if (!['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(item.name)) {
            rentPortion += allocated
          }
          remainingToDistribute -= allocated
        }
      }

      const newTotalPaid = currentPaid + amountToApply
      const isFullySettled = newTotalPaid >= pr.amount
      const newStatus = isFullySettled ? 'PAID' : 'PARTIAL'

      await txClient.upward_payment_request.update({
        where: { id: pr.id },
        data: {
          amountPaid: newTotalPaid,
          status: newStatus,
          paidAt: isFullySettled ? new Date() : pr.paidAt,
        },
      })

      // Sync PM status and property settlement for rent portion
      try {
        await this.syncPmStatus.execute({
          paymentRequestId: pr.id,
          rentPortion: amountToApply,
          txClient,
        })

        await this.settleProperty.execute({
          userId: effectiveUserId,
          propertyId: pr.userPropertyId!,
          rentPortion: amountToApply,
          paymentRequestId: pr.id,
          dueDate: pr.dueDate,
          rentEndDate: pr.rentEndDate ?? undefined,
          rentType: pr.rentType ?? undefined,
          currency: pr.currency,
          description: `Rent Deposit applied to PR #${pr.uuid.slice(0, 8)}`,
          txClient,
        })
      } catch (syncErr: any) {
        this.logger.warn(`Secondary sync warning during deposit application: ${syncErr.message}`)
      }

      await txClient.upward_notification.create({
        data: {
          userId: effectiveUserId,
          title: isFullySettled ? 'Rent Invoice Fully Paid' : 'Rent Deposit Applied',
          message: `₦${amountToApply.toLocaleString()} from your Rent Deposit Balance was applied to your invoice. Remaining invoice balance: ₦${Math.max(0, pr.amount - newTotalPaid).toLocaleString()}.`,
          type: 'PAYMENT',
          url: `/dashboard/payment?id=${pr.uuid}`,
        },
      })

      this.logger.log(
        `Applied ₦${amountToApply} from Rent Deposit (Balance: ${balanceAfter}) to PR ${pr.uuid}. New PR Status: ${newStatus}`
      )

      return {
        success: true,
        amountApplied: amountToApply,
        remainingInvoiceBalance: Math.max(0, pr.amount - newTotalPaid),
        newDepositBalance: balanceAfter,
        paymentRequestStatus: newStatus,
        transactionReference: reference,
      }
    })
  }
}
