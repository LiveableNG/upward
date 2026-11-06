import { CadenceType } from './rent-vault.types'

export interface SimulationInput {
  targetAmountKobo: bigint
  contractualDueDate: Date
  initialDepositKobo?: bigint
  cadence: CadenceType
  monthlyIncomeKobo?: bigint
  asOfDate?: Date
}

export interface SimulationResult {
  daysRemaining: number
  periodicDepositKobo: bigint
  numberOfPayments: number
  totalTenantContributionKobo: bigint
  projectedYieldKobo: bigint
  netAnnualYieldRate: number
  affordability: {
    rentToIncomeRatio: number
    isOverThreshold: boolean
    advisoryMessage?: string
  }
}

export class RentSavingsCalculatorEngine {
  public static readonly ANNUAL_NET_YIELD = 0.145 // 14.5% p.a.
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
    const daysRemaining = this.calculateDaysRemaining(input.contractualDueDate, today)

    if (daysRemaining <= 0) {
      throw new Error('Contractual due date must be strictly in the future.')
    }

    const initialDeposit = Number(input.initialDepositKobo || 0n)
    const targetAmount = Number(input.targetAmountKobo)

    // Future value of initial deposit
    const fvInitial = initialDeposit * Math.pow(1 + this.DAILY_RATE, daysRemaining)
    const deficit = Math.max(0, targetAmount - fvInitial)

    let cadenceStepDays = 30
    if (input.cadence === 'DAILY') {
      cadenceStepDays = 1
    } else if (input.cadence === 'WEEKLY') {
      cadenceStepDays = 7
    } else {
      // MONTHLY: adapt to runway length
      if (daysRemaining <= 45) {
        cadenceStepDays = Math.max(1, Math.floor(daysRemaining / 2))
      } else {
        cadenceStepDays = 30
      }
    }

    const numberOfPayments = Math.max(1, Math.floor(daysRemaining / cadenceStepDays))

    // Sum of compound discount factors: sum_{j=1}^{k} (1 + r)^{N - j * Delta_d}
    let denominator = 0
    for (let j = 1; j <= numberOfPayments; j++) {
      const exponent = Math.max(0, daysRemaining - j * cadenceStepDays)
      denominator += Math.pow(1 + this.DAILY_RATE, exponent)
    }

    const periodicPaymentNum = deficit > 0 && denominator > 0 ? Math.ceil(deficit / denominator) : 0
    const periodicDepositKobo = BigInt(Math.max(0, periodicPaymentNum))
    const totalPeriodicContribution = periodicDepositKobo * BigInt(numberOfPayments)
    const totalTenantContributionKobo = (input.initialDepositKobo || 0n) + totalPeriodicContribution

    // Projected yield
    const projectedYieldKobo =
      input.targetAmountKobo > totalTenantContributionKobo
        ? input.targetAmountKobo - totalTenantContributionKobo
        : 0n

    // Affordability calculation
    let rentToIncomeRatio = 0
    let isOverThreshold = false
    let advisoryMessage: string | undefined

    if (input.monthlyIncomeKobo && input.monthlyIncomeKobo > 0n) {
      const monthlyIncomeNum = Number(input.monthlyIncomeKobo)
      // Normalize periodic payment to monthly equivalent
      const monthlyPaymentEquivalent =
        input.cadence === 'DAILY'
          ? periodicPaymentNum * 30
          : input.cadence === 'WEEKLY'
            ? periodicPaymentNum * 4.33
            : periodicPaymentNum

      rentToIncomeRatio = Math.round((monthlyPaymentEquivalent / monthlyIncomeNum) * 1000) / 1000
      if (rentToIncomeRatio > 0.5) {
        isOverThreshold = true
        advisoryMessage =
          'Required deposit exceeds 50% of your declared net income. Consider contributing a larger upfront lump sum.'
      }
    }

    return {
      daysRemaining,
      periodicDepositKobo,
      numberOfPayments,
      totalTenantContributionKobo,
      projectedYieldKobo,
      netAnnualYieldRate: this.ANNUAL_NET_YIELD,
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
