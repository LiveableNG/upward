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
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'
import { clampReminderDay } from '../../../domains/rent-savings/reminder-day'

@Injectable()
export class GetMyRentVaultUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
    @Optional()
    private readonly prisma?: PrismaService,
    @Optional()
    private readonly platformRates?: PlatformRatesService,
  ) {}

  async updatePaydayDay(userId: number, paydayDayOfMonth: number) {
    const vault = await this.rentVaultRepo.findActiveByUserId(userId)
    if (!vault) {
      throw new NotFoundException('No active rent vault found.')
    }
    const clampedDay = clampReminderDay(paydayDayOfMonth)
    if (this.prisma?.upward_rent_vault) {
      await this.prisma.upward_rent_vault.update({
        where: { id: vault.id },
        data: { paydayDayOfMonth: clampedDay },
      })
    }
    return {
      status: 'success',
      data: {
        vault_id: vault.uuid,
        preferred_payday_day: clampedDay,
      },
    }
  }

  async updateCadence(
    userId: number,
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY',
    options?: {
      productOption?: 'SAVE_AND_EARN' | 'RENT_PROTEC'
      planPattern?: 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'
      initialDepositKobo?: number
    },
  ) {
    const vault = await this.rentVaultRepo.findActiveByUserId(userId)
    if (vault && this.prisma) {
      const data: any = { cadence, preferredFundingMethod: 'DVA' }
      if (options?.productOption) {
        data.productOption = options.productOption
        const rates = this.platformRates ? await this.platformRates.getRates() : null
        data.appliedAnnualRatePct =
          options.productOption === 'RENT_PROTEC'
            ? (rates?.rentProtecRatePct ?? 10.0)
            : (rates?.savingsAnnualRatePct ?? 16.0)
        data.insurancePremiumPct =
          options.productOption === 'RENT_PROTEC' ? (rates?.insurancePremiumPct ?? 2.0) : 0
      }
      if (options?.planPattern) {
        data.planPattern = options.planPattern
      }
      if (options?.initialDepositKobo !== undefined) {
        data.initialDepositKobo = BigInt(Math.max(0, Math.round(options.initialDepositKobo)))
      }
      await this.prisma.upward_rent_vault.update({
        where: { id: vault.id },
        data,
      })
    }
  }

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

    const rates = this.platformRates ? await this.platformRates.getRates() : null
    const resolvedProductOptionEarly =
      (vault as any).productOption === 'RENT_PROTEC' ? 'RENT_PROTEC' : 'SAVE_AND_EARN'
    const resolvedLockModeEarly: 'LOCKED' | 'FLEXIBLE' =
      resolvedProductOptionEarly === 'RENT_PROTEC'
        ? 'LOCKED'
        : (vault as any).lockMode === 'FLEXIBLE'
          ? 'FLEXIBLE'
          : 'LOCKED'
    const annualYieldPctForLabels =
      (vault as any).appliedAnnualRatePct ??
      (resolvedProductOptionEarly === 'RENT_PROTEC'
        ? (rates?.rentProtecRatePct ?? 10.0)
        : resolvedLockModeEarly === 'FLEXIBLE'
          ? (rates?.flexibleSavingsAnnualRatePct ?? 12.0)
          : (rates?.savingsAnnualRatePct ?? 16.0))

    const unifiedTransactions = [
      ...vaultTransactions.map((tx: any) => {
        const depositCls = tx.metadata?.depositClassification
        const depositLabel =
          depositCls === 'INITIAL_DEPOSIT'
            ? 'Initial Deposit'
            : depositCls === 'MONTHLY_CONTRIBUTION'
              ? 'Monthly Contribution'
              : depositCls === 'PARTIAL_MONTHLY'
                ? 'Partial Monthly Contribution'
                : depositCls === 'EXTRA_TOPUP'
                  ? 'Extra Top-Up'
                  : 'Rent Vault Deposit'
        return {
          id: `vault_${tx.id}`,
          uuid: tx.uuid,
          type: tx.type,
          deposit_classification: depositCls || null,
          direction: [
            'SETTLEMENT_DISBURSEMENT',
            'BREAKOUT_PAYOUT',
            'LIQUIDATION_PENALTY',
            'PENALTY_DEDUCTION',
          ].includes(tx.type)
            ? 'DEBIT'
            : 'CREDIT',
          amount_kobo: Number(tx.amountKobo),
          source_label:
            tx.type === 'DEPOSIT'
              ? depositLabel
              : tx.type === 'YIELD_ACCRUAL'
                ? `Daily Compound Interest (${Number(annualYieldPctForLabels).toFixed(1)}% p.a.)`
                : tx.type === 'SETTLEMENT_DISBURSEMENT'
                  ? 'Landlord Rent Settlement'
                  : tx.type === 'CASHBACK'
                    ? 'Activation Cashback'
                    : tx.type === 'BREAKOUT_PAYOUT'
                      ? 'Savings Withdrawal'
                      : tx.type === 'LIQUIDATION_PENALTY'
                        ? 'Early Savings Withdrawal'
                        : 'Savings Activity',
          narration: tx.narration || 'Rent Savings Transaction',
          reference: tx.reference,
          receipt_url:
            tx.type === 'SETTLEMENT_DISBURSEMENT' ||
            tx.type === 'DEPOSIT' ||
            tx.type === 'BREAKOUT_PAYOUT' ||
            tx.type === 'LIQUIDATION_PENALTY'
              ? `/api/v1/payments/rent-deposit/receipt/${tx.uuid}?format=pdf`
              : null,
          created_at: tx.createdAt ? new Date(tx.createdAt).toISOString() : now.toISOString(),
        }
      }),
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
        receipt_url: tx.receiptUrl || `/api/v1/payments/rent-deposit/receipt/${tx.uuid}?format=pdf`,
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

    const activeAdvance = await this.rentAdvanceRepo.findActiveByVaultId(vault.id)
    const hasActiveLoan = !!activeAdvance && activeAdvance.status === 'ACTIVE'
    const maxBorrowableKobo = hasActiveLoan
      ? 0n
      : RentSavingsCalculatorEngine.calculateMaxAdvanceBorrowable(currentBalanceKobo)

    const score = await this.rentVaultRepo.findSavingsScoreByVaultId(vault.id)

    const rawCadence = score?.cadencePoints ?? 0
    const consistencyPoints = Math.min(50, Math.round((rawCadence / 40) * 50) || (currentBalanceKobo > 0n ? 15 : 10))
    const goalRatio = targetAmountNum > 0 ? currentBalanceNum / targetAmountNum : 0
    const goalPoints = Math.min(50, Math.round(goalRatio * 50))
    const totalScore = Math.min(100, consistencyPoints + goalPoints)

    const resolvedCadence = (
      ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(vault.cadence)
        ? vault.cadence
        : 'MONTHLY'
    ) as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
    const resolvedProductOption =
      (vault as any).productOption === 'RENT_PROTEC' ? 'RENT_PROTEC' : 'SAVE_AND_EARN'
    const resolvedPlanPattern = (
      ['EQUAL', 'INITIAL_DEPOSIT', 'STEP_UP', 'ACCELERATED'].includes((vault as any).planPattern)
        ? (vault as any).planPattern
        : 'INITIAL_DEPOSIT'
    ) as 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'

    let payLessProjection = {
      cadence: resolvedCadence,
      periodic_deposit_kobo: 0,
      number_of_payments: 0,
      total_tenant_contribution_kobo: Number(combinedPrincipalKobo),
      projected_yield_kobo: Number(vault.accruedYieldKobo),
      rent_discount_pct: 0,
    }

    const annualYieldPct = annualYieldPctForLabels
    const annualYieldDecimal = annualYieldPct / 100
    const dailyYieldRate = RentSavingsCalculatorEngine.getEffectiveDailyRate(annualYieldDecimal)
    const insurancePremiumPct =
      (vault as any).insurancePremiumPct ??
      (resolvedProductOption === 'RENT_PROTEC' ? (rates?.insurancePremiumPct ?? 2.0) : 0)

    const plannedInitialDepositKobo = BigInt((vault as any).initialDepositKobo ?? 0n)
    const storedPlannedMonthlyKobo = BigInt((vault as any).plannedMonthlyDepositKobo ?? 0n)
    const preferredPaydayDay = vault.paydayDayOfMonth ?? 28
    const activeCompoundingDaysForThreshold =
      RentSavingsCalculatorEngine.getRentProtecActiveCompoundingDays(daysRemaining)
    const minimumInitialDepositPct =
      resolvedProductOption === 'RENT_PROTEC'
        ? RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(
            activeCompoundingDaysForThreshold,
          )
        : 0
    const minimumInitialDepositKobo =
      resolvedProductOption === 'RENT_PROTEC'
        ? RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
            vault.targetAmountKobo,
            activeCompoundingDaysForThreshold,
          )
        : 0n

    if (daysRemaining > 0 && vault.targetAmountKobo > 0n) {
      try {
        const simInitialDepositKobo =
          currentBalanceKobo > 0n ? currentBalanceKobo : plannedInitialDepositKobo
        const sim = RentSavingsCalculatorEngine.simulate({
          targetAmountKobo: vault.targetAmountKobo,
          contractualDueDate: vault.contractualDueDate,
          initialDepositKobo: simInitialDepositKobo,
          cadence: resolvedCadence,
          productOption: resolvedProductOption,
          lockMode: resolvedLockModeEarly,
          planPattern: resolvedPlanPattern,
          asOfDate: now,
          paydayDayOfMonth: preferredPaydayDay,
          annualNetYieldRate: annualYieldDecimal,
          maxSavingsMonths: rates?.maxSavingsMonths ?? 11,
          rentProtecMinMonths: rates?.rentProtecMinMonths ?? 6,
          insurancePremiumPct,
        })
        const effectivePeriodicKobo =
          storedPlannedMonthlyKobo > 0n ? storedPlannedMonthlyKobo : sim.periodicDepositKobo
        const remainingPrincipalKobo = Number(effectivePeriodicKobo * BigInt(sim.numberOfPayments))
        const totalTenantContributionKobo =
          currentBalanceKobo > 0n
            ? Number(combinedPrincipalKobo) + remainingPrincipalKobo
            : Number(sim.totalTenantContributionKobo)
        const futureExpectedYieldKobo =
          daysRemaining <= 30 && currentBalanceKobo > 0n
            ? Number(currentBalanceKobo) * Math.pow(1 + dailyYieldRate, daysRemaining) -
              Number(currentBalanceKobo)
            : Number(sim.projectedYieldKobo)
        const projectedYieldKobo = Math.max(
          Number(vault.accruedYieldKobo),
          Math.round(Number(vault.accruedYieldKobo) + Math.max(0, futureExpectedYieldKobo)),
        )
        const rentDiscountPct =
          targetAmountNum > 0
            ? Math.round((projectedYieldKobo / targetAmountNum) * 1000) / 10
            : 0

        payLessProjection = {
          cadence: resolvedCadence,
          periodic_deposit_kobo: Number(effectivePeriodicKobo),
          number_of_payments: sim.numberOfPayments,
          total_tenant_contribution_kobo: totalTenantContributionKobo,
          projected_yield_kobo: projectedYieldKobo,
          rent_discount_pct: rentDiscountPct,
        }
      } catch {
        // Fallback if due date has passed
      }
    }

    const plannedMonthlyKobo =
      storedPlannedMonthlyKobo > 0n
        ? storedPlannedMonthlyKobo
        : BigInt(Math.max(0, Math.round(payLessProjection.periodic_deposit_kobo)))

    const { cycleStartUtc } = RentSavingsCalculatorEngine.getCurrentCycleWindowUtc(
      now,
      preferredPaydayDay,
    )
    let currentMonthPaidKobo = 0n
    for (const tx of vaultTransactions) {
      if (tx.type !== 'DEPOSIT') continue
      const txDate = tx.createdAt ? new Date(tx.createdAt) : null
      if (!txDate || txDate < cycleStartUtc) continue
      const cls = (tx.metadata as any)?.depositClassification
      if (cls === 'MONTHLY_CONTRIBUTION' || cls === 'PARTIAL_MONTHLY' || !cls) {
        currentMonthPaidKobo += BigInt(tx.amountKobo ?? 0)
      }
    }
    const currentMonthRemainingKobo =
      plannedMonthlyKobo > currentMonthPaidKobo ? plannedMonthlyKobo - currentMonthPaidKobo : 0n
    const currentMonthFulfilled =
      plannedMonthlyKobo > 0n && currentMonthPaidKobo >= plannedMonthlyKobo

    // Live exact-calendar dynamic daily target (reflects today's date, actual balance, plan pattern, and missed/early compounding)
    const dynamicDailyTarget =
      daysRemaining > 0 && vault.targetAmountKobo > 0n
        ? RentSavingsCalculatorEngine.calculateDynamicDailyTarget({
            targetAmountKobo: vault.targetAmountKobo,
            currentBalanceKobo,
            contractualDueDate: vault.contractualDueDate,
            annualNetYieldRate: annualYieldDecimal,
            plannedMonthlyKobo,
            planPattern: resolvedPlanPattern,
            initialDepositKobo: plannedInitialDepositKobo,
            paydayDayOfMonth: preferredPaydayDay,
            asOfDate: now,
            maxSavingsMonths: rates?.maxSavingsMonths ?? 11,
            currentMonthFulfilled,
          })
        : null

    const [latestConsent, latestArmKyc] = this.prisma
      ? await Promise.all([
          this.prisma.upward_savings_consent
            ?.findFirst({
              where: { userId },
              orderBy: { acceptedAt: 'desc' },
            })
            .catch(() => null),
          this.prisma.upward_kyc_verification
            ?.findFirst({
              where: {
                userId,
                ninHash: { not: null },
                meansOfIdDocKey: { not: null },
                utilityBillDocKey: { not: null },
              },
              orderBy: { createdAt: 'desc' },
              select: { id: true, addressVerificationStatus: true },
            })
            .catch(() => null),
        ])
      : [null, null]

    return {
      status: 'success',
      data: {
        vault_id: vault.uuid,
        lock_status: currentLockStatus,
        cadence: resolvedCadence,
        product_option: resolvedProductOption,
        lock_mode: resolvedLockModeEarly,
        plan_pattern: resolvedPlanPattern,
        initial_deposit_kobo: Number(plannedInitialDepositKobo),
        minimum_initial_deposit_kobo: Number(minimumInitialDepositKobo),
        minimum_initial_deposit_pct: minimumInitialDepositPct,
        planned_monthly_deposit_kobo: Number(plannedMonthlyKobo),
        suggested_deposit_today_kobo: dynamicDailyTarget
          ? Number(dynamicDailyTarget.suggestedDepositTodayKobo)
          : Number(currentMonthRemainingKobo > 0n ? currentMonthRemainingKobo : plannedMonthlyKobo),
        catch_up_today_kobo: dynamicDailyTarget
          ? Number(dynamicDailyTarget.catchUpTodayKobo)
          : Number(plannedMonthlyKobo),
        on_track_status: dynamicDailyTarget?.onTrackStatus ?? 'ON_TRACK',
        is_target_reached_early: dynamicDailyTarget?.isTargetReachedEarly ?? false,
        remaining_scheduled_deposits:
          dynamicDailyTarget?.remainingScheduledDeposits ?? payLessProjection.number_of_payments,
        active_compounding_days:
          dynamicDailyTarget?.activeCompoundingDays ?? Math.max(0, daysRemaining - 30),
        current_month_paid_kobo: Number(currentMonthPaidKobo),
        current_month_remaining_kobo: Number(currentMonthRemainingKobo),
        current_month_fulfilled: currentMonthFulfilled,
        preferred_payday_day: preferredPaydayDay,
        is_rent_protec: resolvedProductOption === 'RENT_PROTEC',
        insurance_premium_pct: insurancePremiumPct,
        has_completed_arm_kyc: Boolean(latestArmKyc),
        address_verification_status: latestArmKyc?.addressVerificationStatus || null,
        consent: latestConsent
          ? {
              consent_uuid: latestConsent.uuid,
              terms_version: latestConsent.termsVersion,
              consent_doc_version: latestConsent.consentDocVersion,
              fund_code: latestConsent.fundCode,
              fund_name: latestConsent.fundName,
              accepted_at: latestConsent.acceptedAt.toISOString(),
              has_document: true,
            }
          : null,
        current_balance_kobo: Number(currentBalanceKobo),
        principal_kobo: Number(combinedPrincipalKobo),
        vault_principal_kobo: Number(vault.currentPrincipalKobo),
        deposit_balance_kobo: Number(depositBalanceKobo),
        accrued_yield_kobo: Number(vault.accruedYieldKobo),
        annual_yield_rate_pct: annualYieldPct,
        daily_yield_rate: dailyYieldRate,
        days_to_unlock: daysToUnlock,
        days_remaining: daysRemaining,
        target_amount_kobo: Number(vault.targetAmountKobo),
        target_completion_percentage: targetCompletionPercentage,
        contractual_due_date: vault.contractualDueDate.toISOString().split('T')[0],
        unlock_date: vault.unlockDate.toISOString().split('T')[0],
        pay_less_projection: payLessProjection,
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
