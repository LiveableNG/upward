import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'

@Injectable()
export class GetMyRentVaultUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
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

    const currentBalanceKobo = vault.currentPrincipalKobo + vault.accruedYieldKobo
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

    return {
      status: 'success',
      data: {
        vault_id: vault.uuid,
        lock_status: currentLockStatus,
        current_balance_kobo: Number(currentBalanceKobo),
        principal_kobo: Number(vault.currentPrincipalKobo),
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
        emergency_advance: {
          has_active_loan: hasActiveLoan,
          active_loan_details: activeAdvance
            ? {
                advance_id: activeAdvance.uuid,
                borrowed_amount_kobo: Number(activeAdvance.borrowedAmountKobo),
                total_repayable_kobo: Number(activeAdvance.totalRepayableKobo),
                repayment_due_date: activeAdvance.repaymentDueDate.toISOString(),
                status: activeAdvance.status,
              }
            : null,
          max_borrowable_kobo: Number(maxBorrowableKobo),
        },
        savings_score: {
          total_score: score?.totalScore ?? 20,
          cadence_points: score?.cadencePoints ?? 0,
          velocity_points: score?.velocityPoints ?? 0,
          loan_discipline_points: score?.loanDisciplinePoints ?? 20,
        },
      },
    }
  }
}
