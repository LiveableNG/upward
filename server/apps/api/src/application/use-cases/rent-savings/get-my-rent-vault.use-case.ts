import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetMyRentVaultUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  async execute(userId: number) {
    const vault = await this.rentVaultRepo.findActiveByUserId(userId)
    if (!vault) {
      throw new NotFoundException('No active rent vault found.')
    }

    const now = new Date()
    const daysToUnlock = Math.max(
      0,
      Math.ceil((vault.unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    )
    const daysRemaining = RentSavingsCalculatorEngine.calculateDaysRemaining(
      vault.contractualDueDate,
      now,
    )

    // Check if vault has reached T-30 window and should be updated to SETTLEMENT_READY
    let currentLockStatus = vault.lockStatus
    if (daysToUnlock === 0 && currentLockStatus === 'LOCKED') {
      currentLockStatus = 'SETTLEMENT_READY'
      await this.rentVaultRepo.update(vault.id, { lockStatus: 'SETTLEMENT_READY' })
    }

    // Consolidate Rent Deposit Balance & Transactions into Rent Vault view
    let depositBalanceKobo = 0n
    let depositTransactions: any[] = []
    if (this.prisma) {
      try {
        const depositBalances = await this.prisma.upward_rent_deposit_balance.findMany({
          where: { userId },
        })
        const totalDepositNaira = depositBalances.reduce((sum, b) => sum + (b.balance || 0), 0)
        depositBalanceKobo = BigInt(Math.round(totalDepositNaira * 100))

        depositTransactions = await this.prisma.upward_rent_deposit_transaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
      } catch {
        // Non-blocking fallback
      }
    }

    let vaultTransactions: any[] = []
    if (typeof this.rentVaultRepo.findTransactionsByVaultId === 'function') {
      try {
        vaultTransactions = (await this.rentVaultRepo.findTransactionsByVaultId(vault.id, 30)) || []
      } catch {
        vaultTransactions = []
      }
    }

    const unifiedTransactions = [
      ...vaultTransactions.map((tx: any) => ({
        id: `vault_${tx.id}`,
        uuid: tx.uuid,
        type: tx.type,
        direction: ['SETTLEMENT_DISBURSEMENT', 'BREAKOUT_PAYOUT', 'PENALTY_DEDUCTION'].includes(tx.type)
          ? 'DEBIT'
          : 'CREDIT',
        amount_kobo: Number(tx.amountKobo),
        source_label:
          tx.type === 'DEPOSIT'
            ? 'Rent Vault Deposit'
            : tx.type === 'YIELD_ACCRUAL'
              ? 'Daily Compound Yield (14.5% p.a.)'
              : tx.type === 'SETTLEMENT_DISBURSEMENT'
                ? 'Landlord Rent Settlement'
                : tx.type === 'CASHBACK'
                  ? 'Early-Bird Rent Cashback'
                  : tx.type === 'BREAKOUT_PAYOUT'
                    ? 'Early Withdrawal'
                    : 'Savings Activity',
        narration: tx.narration || 'Rent Savings Transaction',
        reference: tx.reference,
        receipt_url:
          tx.type === 'SETTLEMENT_DISBURSEMENT'
            ? `/api/v1/rent-vaults/${vault.uuid}/receipt.pdf`
            : null,
        created_at: tx.createdAt ? new Date(tx.createdAt).toISOString() : now.toISOString(),
      })),
      ...depositTransactions.map((tx: any) => ({
        id: `dep_${tx.id}`,
        uuid: tx.uuid,
        type: tx.type === 'DEBIT' ? 'DEPOSIT_APPLIED' : 'DEPOSIT_CREDIT',
        direction: tx.type === 'DEBIT' ? 'DEBIT' : 'CREDIT',
        amount_kobo: Math.round((tx.amount || 0) * 100),
        source_label:
          tx.source === 'DVA_INFLOW'
            ? 'Virtual Account Top-Up'
            : tx.source === 'OVERPAYMENT_EXCESS'
              ? 'Invoice Settlement Excess'
              : tx.source === 'PR_APPLICATION'
                ? 'Applied to Rent Invoice'
                : 'Rent Deposit Credit',
        narration: tx.narration || 'Rent Deposit Transaction',
        reference: tx.reference,
        receipt_url: tx.receiptUrl || `/api/v1/payments/rent-deposit/receipt/${tx.uuid}`,
        created_at: tx.createdAt ? new Date(tx.createdAt).toISOString() : now.toISOString(),
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const combinedPrincipalKobo = vault.currentPrincipalKobo + depositBalanceKobo
    const currentBalanceKobo = combinedPrincipalKobo + vault.accruedYieldKobo
    const targetAmountNum = Number(vault.targetAmountKobo)
    const currentBalanceNum = Number(currentBalanceKobo)

    const targetCompletionPercentage =
      targetAmountNum > 0
        ? Math.min(100, Math.round((currentBalanceNum / targetAmountNum) * 1000) / 10)
        : 0

    // Check active loan
    const activeAdvance = await this.rentAdvanceRepo.findActiveByVaultId(vault.id)
    const hasActiveLoan = !!activeAdvance && activeAdvance.status === 'ACTIVE'
    const maxBorrowableKobo = hasActiveLoan
      ? 0n
      : RentSavingsCalculatorEngine.calculateMaxAdvanceBorrowable(currentBalanceKobo)

    // Fetch savings score
    const score = await this.rentVaultRepo.findSavingsScoreByVaultId(vault.id)

    // Readjusted scoring (without loan discipline): 50 pts Regular Saving + 50 pts Target Progress = 100 pts
    const rawCadence = score?.cadencePoints ?? 0
    const consistencyPoints = Math.min(50, Math.round((rawCadence / 40) * 50) || (currentBalanceKobo > 0n ? 15 : 10))
    const goalRatio = targetAmountNum > 0 ? currentBalanceNum / targetAmountNum : 0
    const goalPoints = Math.min(50, Math.round(goalRatio * 50))
    const totalScore = Math.min(100, consistencyPoints + goalPoints)

    return {
      status: 'success',
      data: {
        vault_id: vault.uuid,
        lock_status: currentLockStatus,
        current_balance_kobo: Number(currentBalanceKobo),
        principal_kobo: Number(combinedPrincipalKobo),
        vault_principal_kobo: Number(vault.currentPrincipalKobo),
        deposit_balance_kobo: Number(depositBalanceKobo),
        accrued_yield_kobo: Number(vault.accruedYieldKobo),
        daily_yield_rate: RentSavingsCalculatorEngine.DAILY_RATE,
        days_to_unlock: daysToUnlock,
        days_remaining: daysRemaining,
        target_amount_kobo: Number(vault.targetAmountKobo),
        target_completion_percentage: targetCompletionPercentage,
        contractual_due_date: vault.contractualDueDate.toISOString().split('T')[0],
        unlock_date: vault.unlockDate.toISOString().split('T')[0],
        dedicated_account: vault.dvaAccountNumber
          ? {
              bank_name: vault.dvaBankName,
              account_number: vault.dvaAccountNumber,
              account_name: vault.dvaAccountName,
              assignment_status: vault.dvaAssignmentStatus,
            }
          : null,
        emergency_advance: null,
        savings_score: {
          total_score: totalScore,
          cadence_points: consistencyPoints,
          velocity_points: goalPoints,
          consistency_points: consistencyPoints,
          goal_points: goalPoints,
          loan_discipline_points: 0,
        },
        transactions: unifiedTransactions,
      },
    }
  }
}
