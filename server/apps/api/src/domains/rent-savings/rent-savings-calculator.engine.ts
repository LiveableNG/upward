import {
  CadenceType,
  SavingsPlanPattern,
  SavingsProductOption,
} from './rent-vault.types'

export interface SimulationInput {
  targetAmountKobo: bigint
  contractualDueDate: Date
  initialDepositKobo?: bigint
  cadence: CadenceType
  productOption?: SavingsProductOption
  planPattern?: SavingsPlanPattern
  monthlyIncomeKobo?: bigint
  asOfDate?: Date
  annualNetYieldRate?: number
  maxSavingsMonths?: number
  rentProtecMinMonths?: number
  insurancePremiumPct?: number
}

export interface SimulationResult {
  daysRemaining: number
  monthsRemaining: number
  periodicDepositKobo: bigint
  firstPeriodDepositKobo: bigint
  lastPeriodDepositKobo: bigint
  requiredInitialDepositKobo: bigint
  numberOfPayments: number
  totalTenantContributionKobo: bigint
  projectedYieldKobo: bigint
  netAnnualYieldRate: number
  productOption: SavingsProductOption
  planPattern: SavingsPlanPattern
  isRentProtecEligible: boolean
  rentProtecIneligibilityReason?: string
  insurancePremiumKobo: bigint
  affordability: {
    rentToIncomeRatio: number
    isOverThreshold: boolean
    advisoryMessage?: string
  }
}

export class RentSavingsCalculatorEngine {
  /**
   * Safe Rent Protec coverage activation threshold (% of annual rent):
   * - 20% for 7+ months (>= 210 days): holds 10x the 2% upfront premium and
   *   earns 2.05%-3.55% spread at 6.55% spread rate (even on conservative deposit timing).
   * - 25% for 6 months (< 210 days): ensures full breakeven (>= 2.02% spread) on the shortest term.
   */
  static getRentProtecActivationThresholdPct(daysRemaining: number): number {
    return daysRemaining >= 210 ? 20 : 25
  }

  static getRentProtecActivationThresholdKobo(
    targetAmountKobo: bigint,
    daysRemaining: number,
  ): bigint {
    const pct = this.getRentProtecActivationThresholdPct(daysRemaining)
    return BigInt(Math.round(Number(targetAmountKobo) * (pct / 100)))
  }
  public static readonly ANNUAL_NET_YIELD = 0.16 // 16.0% p.a.
  public static readonly ANNUAL_BASE_EXIT_YIELD = 0.07 // 7.0% p.a. (Fair Exit)
  public static readonly DAYS_IN_YEAR = 365
  public static readonly DAILY_RATE =
    RentSavingsCalculatorEngine.ANNUAL_NET_YIELD / RentSavingsCalculatorEngine.DAYS_IN_YEAR
  public static readonly BASE_DAILY_RATE =
    RentSavingsCalculatorEngine.ANNUAL_BASE_EXIT_YIELD / RentSavingsCalculatorEngine.DAYS_IN_YEAR
  public static readonly ADVANCE_MAX_RATIO = 0.4 // 40% cap
  public static readonly ADVANCE_FACILITY_FEE_RATE = 0.035 // 3.5%
  public static readonly ADVANCE_LATE_FEE_DAILY_RATE = 0.001 // 0.1%/day
  public static readonly BREAKOUT_ADMIN_FEE_RATE = 0.015 // 1.5%

  /**
   * Calculates exact difference in calendar days between two dates
   */
  public static calculateDaysRemaining(dueDate: Date, asOfDate: Date = new Date()): number {
    const start = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate())
    const end = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    const diffTime = end.getTime() - start.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  /**
   * Executes the work-backwards simulation engine
   */
  public static simulate(input: SimulationInput): SimulationResult {
    const today = input.asOfDate || new Date()
    const rawDaysRemaining = this.calculateDaysRemaining(input.contractualDueDate, today)

    if (rawDaysRemaining <= 0) {
      throw new Error('Contractual due date must be strictly in the future.')
    }

    const maxMonths = Math.min(11, Math.max(1, input.maxSavingsMonths ?? 11))
    const minRentProtecMonths = Math.max(1, input.rentProtecMinMonths ?? 6)
    const productOption: SavingsProductOption = input.productOption ?? 'SAVE_AND_EARN'
    const planPattern: SavingsPlanPattern = input.planPattern ?? 'INITIAL_DEPOSIT'

    // Rent is released strictly 30 days before contractual due date.
    // Therefore, the maximum active savings horizon is (due date - 30 days), capped at <= 11 months (Kunle spec: user cannot save for 12 months).
    const savingsDaysRemaining = Math.max(1, rawDaysRemaining - 30)
    const rawMonths = Math.max(1, Math.floor(savingsDaysRemaining / 30))
    const monthsRemaining = Math.min(maxMonths, rawMonths)
    const daysRemaining = Math.min(savingsDaysRemaining, maxMonths * 30)

    const isRentProtecEligible = rawDaysRemaining >= minRentProtecMonths * 28
    const rentProtecIneligibilityReason = !isRentProtecEligible
      ? `Rent Protec requires at least ${minRentProtecMonths} months before your rent due date.`
      : undefined

    const targetAmount = Number(input.targetAmountKobo)
    const effectiveAnnualYield =
      input.annualNetYieldRate !== undefined &&
      Number.isFinite(input.annualNetYieldRate) &&
      input.annualNetYieldRate >= 0
        ? input.annualNetYieldRate
        : productOption === 'RENT_PROTEC'
          ? 0.1
          : 0.16

    // Exact monthly effective rate: r_m = (1 + r_a)^(1/12) - 1 (Section 3.4)
    const monthlyRate = Math.pow(1 + effectiveAnnualYield, 1 / 12) - 1

    // Required initial deposit when starting mid-lease or choosing RENT_PROTEC
    const missedMonths = Math.max(0, maxMonths - monthsRemaining)
    const forcedDepositRatio =
      productOption === 'RENT_PROTEC' && missedMonths > 0
        ? Math.min(0.45, Math.max(0.15, (missedMonths / maxMonths) * 0.5))
        : 0
    const requiredInitialDepositNum = Math.round(targetAmount * forcedDepositRatio)
    const providedInitialDeposit = Number(input.initialDepositKobo || 0n)
    const effectiveInitialDeposit =
      providedInitialDeposit > 0
        ? providedInitialDeposit
        : productOption === 'RENT_PROTEC'
          ? requiredInitialDepositNum
          : 0

    // Number of contribution periods based on cadence within <= 11-month window
    let numberOfPayments = monthsRemaining
    let periodRate = monthlyRate
    if (input.cadence === 'WEEKLY') {
      numberOfPayments = Math.max(1, Math.min(maxMonths * 4, Math.floor(daysRemaining / 7)))
      periodRate = Math.pow(1 + effectiveAnnualYield, 1 / 52) - 1
    } else if (input.cadence === 'QUARTERLY') {
      numberOfPayments = Math.max(1, Math.floor(monthsRemaining / 3))
      periodRate = Math.pow(1 + effectiveAnnualYield, 1 / 4) - 1
    } else if (input.cadence === 'DAILY') {
      numberOfPayments = Math.max(1, daysRemaining)
      periodRate = Math.pow(1 + effectiveAnnualYield, 1 / 365) - 1
    } else {
      numberOfPayments = Math.max(1, Math.min(maxMonths, monthsRemaining))
      periodRate = monthlyRate
    }

    // FV of initial deposit: S_0 * (1 + r)^n
    const fvInitial = effectiveInitialDeposit * Math.pow(1 + periodRate, numberOfPayments)
    const deficit = Math.max(0, targetAmount - fvInitial)

    // Compute weights w_i for each contribution period i = 1..n (end-of-period compounding)
    const weights: number[] = []
    for (let i = 1; i <= numberOfPayments; i++) {
      if (planPattern === 'STEP_UP') {
        // Start lower and increase by ~8% per step
        const stepFactor = input.cadence === 'WEEKLY' ? 0.02 : 0.08
        weights.push(Math.pow(1 + stepFactor, i - 1))
      } else if (planPattern === 'ACCELERATED') {
        // Front-load early contributions so more capital compounds longer
        const taperFactor = input.cadence === 'WEEKLY' ? 0.015 : 0.06
        weights.push(Math.max(0.4, 1 - taperFactor * (i - 1)))
      } else {
        weights.push(1)
      }
    }

    let weightedDiscountSum = 0
    for (let i = 1; i <= numberOfPayments; i++) {
      const periodsRemaining = Math.max(0, numberOfPayments - i)
      const w = weights[i - 1] ?? 1
      weightedDiscountSum += w * Math.pow(1 + periodRate, periodsRemaining)
    }

    const basePayment =
      deficit > 0 && weightedDiscountSum > 0 ? Math.ceil(deficit / weightedDiscountSum) : 0
    const schedulePayments = weights.map((w) => Math.max(0, Math.ceil(basePayment * w)))
    const firstPeriodDepositNum = schedulePayments[0] ?? 0
    const lastPeriodDepositNum = schedulePayments[schedulePayments.length - 1] ?? 0
    const totalPeriodicContributionNum = schedulePayments.reduce((sum, p) => sum + p, 0)

    const periodicDepositKobo = BigInt(firstPeriodDepositNum)
    const totalTenantContributionKobo = BigInt(
      effectiveInitialDeposit + totalPeriodicContributionNum,
    )

    const projectedYieldKobo =
      input.targetAmountKobo > totalTenantContributionKobo
        ? input.targetAmountKobo - totalTenantContributionKobo
        : 0n

    const insurancePct =
      productOption === 'RENT_PROTEC' ? (input.insurancePremiumPct ?? 2.0) : 0
    const insurancePremiumKobo = BigInt(Math.round(targetAmount * (insurancePct / 100)))

    // Affordability calculation
    let rentToIncomeRatio = 0
    let isOverThreshold = false
    let advisoryMessage: string | undefined

    if (input.monthlyIncomeKobo && input.monthlyIncomeKobo > 0n) {
      const monthlyIncomeNum = Number(input.monthlyIncomeKobo)
      const monthlyPaymentEquivalent =
        input.cadence === 'DAILY'
          ? firstPeriodDepositNum * 30
          : input.cadence === 'WEEKLY'
            ? firstPeriodDepositNum * 4.33
            : input.cadence === 'QUARTERLY'
              ? firstPeriodDepositNum / 3
              : firstPeriodDepositNum

      rentToIncomeRatio = Math.round((monthlyPaymentEquivalent / monthlyIncomeNum) * 1000) / 1000
      if (rentToIncomeRatio > 0.5) {
        isOverThreshold = true
        advisoryMessage =
          'Required deposit exceeds 50% of your declared net income. Consider contributing a larger upfront lump sum.'
      }
    }

    return {
      daysRemaining,
      monthsRemaining,
      periodicDepositKobo,
      firstPeriodDepositKobo: BigInt(firstPeriodDepositNum),
      lastPeriodDepositKobo: BigInt(lastPeriodDepositNum),
      requiredInitialDepositKobo: BigInt(effectiveInitialDeposit),
      numberOfPayments,
      totalTenantContributionKobo,
      projectedYieldKobo,
      netAnnualYieldRate: effectiveAnnualYield,
      productOption,
      planPattern,
      isRentProtecEligible,
      rentProtecIneligibilityReason,
      insurancePremiumKobo,
      affordability: {
        rentToIncomeRatio,
        isOverThreshold,
        advisoryMessage,
      },
    }
  }

  /**
   * Daily yield calculation on active balance
   */
  public static calculateDailyYield(balanceKobo: bigint): bigint {
    if (balanceKobo <= 0n) return 0n
    const dailyYield = Number(balanceKobo) * this.DAILY_RATE
    return BigInt(Math.max(1, Math.round(dailyYield)))
  }

  /**
   * Calculates maximum borrowable emergency advance (capped at 40%)
   */
  public static calculateMaxAdvanceBorrowable(currentBalanceKobo: bigint): bigint {
    if (currentBalanceKobo <= 0n) return 0n
    return BigInt(Math.floor(Number(currentBalanceKobo) * this.ADVANCE_MAX_RATIO))
  }

  /**
   * Calculates emergency advance terms (3.5% facility fee and total repayable)
   */
  public static calculateAdvanceTerms(requestedAmountKobo: bigint, currentBalanceKobo: bigint) {
    const maxBorrowable = this.calculateMaxAdvanceBorrowable(currentBalanceKobo)
    if (requestedAmountKobo > maxBorrowable) {
      throw new Error(
        `Requested amount exceeds maximum 40% borrowing limit of ₦${(Number(maxBorrowable) / 100).toLocaleString()}`,
      )
    }
    const facilityFeeKobo = BigInt(
      Math.round(Number(requestedAmountKobo) * this.ADVANCE_FACILITY_FEE_RATE),
    )
    const totalRepayableKobo = requestedAmountKobo + facilityFeeKobo
    return {
      borrowedAmountKobo: requestedAmountKobo,
      facilityFeeKobo,
      totalRepayableKobo,
    }
  }

  /**
   * Calculates late penalty for overdue advance (0.1%/day after 30 days)
   */
  public static calculateAdvanceLatePenalty(
    unpaidBalanceKobo: bigint,
    daysOverdue: number,
  ): bigint {
    if (unpaidBalanceKobo <= 0n || daysOverdue <= 0) return 0n
    const penalty = Number(unpaidBalanceKobo) * this.ADVANCE_LATE_FEE_DAILY_RATE * daysOverdue
    return BigInt(Math.round(penalty))
  }

  /**
   * Recalculates fair exit early breakout payout (7.0% p.a. yield & 1.5% admin fee)
   */
  public static calculateFairBreakout(principalKobo: bigint, daysHeld: number) {
    if (principalKobo <= 0n) {
      return {
        principalKobo: 0n,
        recalculatedYieldKobo: 0n,
        adminFeeKobo: 0n,
        netPayoutKobo: 0n,
      }
    }

    const principalNum = Number(principalKobo)
    // Recalculate yield at 7.0% p.a.
    const compoundFactor = Math.pow(1 + this.BASE_DAILY_RATE, Math.max(0, daysHeld))
    const totalWithBaseYield = principalNum * compoundFactor
    const recalculatedYieldKobo = BigInt(Math.max(0, Math.round(totalWithBaseYield - principalNum)))

    // 1.5% admin fee on principal
    const adminFeeKobo = BigInt(Math.round(principalNum * this.BREAKOUT_ADMIN_FEE_RATE))
    const netPayoutKobo = principalKobo + recalculatedYieldKobo - adminFeeKobo

    return {
      principalKobo,
      recalculatedYieldKobo,
      adminFeeKobo,
      netPayoutKobo: netPayoutKobo > 0n ? netPayoutKobo : 0n,
    }
  }

  /**
   * Calculates gamified rent cashback and early-bird bonus
   */
  public static calculateCashback(
    targetAmountKobo: bigint,
    daysToLeaseExpiry: number,
  ): { cashbackKobo: bigint; earlyBirdApplied: boolean; percentageRate: number } {
    const targetNum = Number(targetAmountKobo)

    // Base cashback percentage
    let baseRate = 0.0055 // Default 0.55%
    if (targetNum <= 150_000_000) {
      // Everyday saver (< ₦1.5M): 0.65%
      baseRate = 0.0065
    } else if (targetNum >= 500_000_000) {
      // Luxury saver (> ₦5M): 0.30%
      baseRate = 0.003
    } else {
      // Standard saver: 0.50%
      baseRate = 0.005
    }

    // Early-bird bonus: settled in first 10 days of T-30 window (20 to 30 days before due date)
    const earlyBirdApplied = daysToLeaseExpiry >= 20 && daysToLeaseExpiry <= 30
    const finalRate = earlyBirdApplied ? baseRate * 1.2 : baseRate
    const cashbackKobo = BigInt(Math.round(targetNum * finalRate))

    return {
      cashbackKobo,
      earlyBirdApplied,
      percentageRate: finalRate,
    }
  }
}
