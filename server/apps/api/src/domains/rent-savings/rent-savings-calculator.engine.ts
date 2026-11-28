import {
  CadenceType,
  SavingsLockMode,
  SavingsPlanPattern,
  SavingsProductOption,
} from './rent-vault.types'

export type DepositClassification =
  | 'INITIAL_DEPOSIT'
  | 'MONTHLY_CONTRIBUTION'
  | 'PARTIAL_MONTHLY'
  | 'EXTRA_TOPUP'

export interface ClassifyDepositInput {
  currentPrincipalKobo: bigint
  initialDepositKobo: bigint
  plannedMonthlyDepositKobo: bigint
  currentMonthAppliedKobo: bigint
  depositAmountKobo: bigint
  explicitDepositKind?: 'MONTHLY' | 'EXTRA_TOPUP' | 'INITIAL_DEPOSIT' | null
}

export interface ClassifyDepositResult {
  classification: DepositClassification
  shouldRecalculateMonthlyTarget: boolean
  surplusForMonthKobo: bigint
}

export interface SimulationInput {
  targetAmountKobo: bigint
  contractualDueDate: Date
  initialDepositKobo?: bigint
  cadence: CadenceType
  productOption?: SavingsProductOption
  lockMode?: SavingsLockMode
  planPattern?: SavingsPlanPattern
  monthlyIncomeKobo?: bigint
  asOfDate?: Date
  paydayDayOfMonth?: number
  annualNetYieldRate?: number
  maxSavingsMonths?: number
  rentProtecMinMonths?: number
  insurancePremiumPct?: number
}

export type VaultOnTrackStatus = 'TARGET_REACHED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND'

export interface DynamicDailyTargetResult {
  activeCompoundingDays: number
  remainingScheduledDeposits: number
  dailyRate: number
  suggestedDepositTodayKobo: bigint
  catchUpTodayKobo: bigint
  spreadRemainingDepositKobo: bigint
  projectedBalanceAtUnlockKobo: bigint
  projectedRemainingYieldKobo: bigint
  onTrackStatus: VaultOnTrackStatus
  isTargetReachedEarly: boolean
}

export interface SimulationResult {
  daysRemaining: number
  activeCompoundingDays: number
  monthsRemaining: number
  periodicDepositKobo: bigint
  firstPeriodDepositKobo: bigint
  lastPeriodDepositKobo: bigint
  requiredInitialDepositKobo: bigint
  minimumInitialDepositKobo: bigint
  minimumInitialDepositPct: number
  numberOfPayments: number
  totalTenantContributionKobo: bigint
  projectedYieldKobo: bigint
  netAnnualYieldRate: number
  dailyYieldRate: number
  productOption: SavingsProductOption
  lockMode: SavingsLockMode
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
  public static readonly DEFAULT_ARM_SPREAD_DECIMAL = 0.0655 // ~16.55% ARM gross - 10.0% Rent Protec
  public static readonly RENT_PROTEC_TARGET_COST_DECIMAL = 0.0215 // 2.0% upfront premium + 0.15% safety buffer

  /**
   * Algebraic breakeven deposit ratio for Rent Protec coverage activation over
   * ACTUAL active compounding days (`T_active = max(1, daysToDueDate - 30)`):
   *   d_min(T_active) = clamp((2 * c_target) / (s * (T_active / 365)) - 1, 0.20, 0.45)
   *
   * - Guarantees zero loss / full spread recovery over actual compounding horizon T_active at spread s.
   * - Floor 20% ensures Upward always holds >= 10x the 2% upfront insurance premium.
   * - Examples at s = 6.55%, c_target = 2.15%:
   *   8-11 months (T_active >= 210d) -> 20%
   *   7 months    (T_active = 180d)  -> 33%
   *   6 months    (T_active = 150d)  -> 45% (clamped cap)
   */
  static getRentProtecActiveCompoundingDays(daysToDueDate: number): number {
    return Math.max(1, Math.round(daysToDueDate) - 30)
  }

  static getRentProtecActivationThresholdPct(
    activeCompoundingDays: number,
    spreadRateDecimal: number = RentSavingsCalculatorEngine.DEFAULT_ARM_SPREAD_DECIMAL,
    targetCostDecimal: number = RentSavingsCalculatorEngine.RENT_PROTEC_TARGET_COST_DECIMAL,
  ): number {
    const safeDays = Math.max(1, activeCompoundingDays)
    const safeSpread = Math.max(0.01, spreadRateDecimal)
    const rawRatio = (2 * targetCostDecimal) / (safeSpread * (safeDays / 365)) - 1
    const clampedRatio = Math.min(0.45, Math.max(0.2, rawRatio))
    return Math.round(clampedRatio * 100)
  }

  static getRentProtecActivationThresholdKobo(
    targetAmountKobo: bigint,
    activeCompoundingDays: number,
    spreadRateDecimal: number = RentSavingsCalculatorEngine.DEFAULT_ARM_SPREAD_DECIMAL,
    targetCostDecimal: number = RentSavingsCalculatorEngine.RENT_PROTEC_TARGET_COST_DECIMAL,
  ): bigint {
    const pct = this.getRentProtecActivationThresholdPct(
      activeCompoundingDays,
      spreadRateDecimal,
      targetCostDecimal,
    )
    return BigInt(Math.round(Number(targetAmountKobo) * (pct / 100)))
  }

  /**
   * Computes the user's current contribution cycle window anchored to their chosen
   * `paydayDayOfMonth` (1..28) with a 5-day early-pay grace window:
   *   Cycle N = [payday(N) - 5 days, payday(N+1) - 5 days)
   *
   * Example (payday = 28th):
   * - Nov 23 .. Dec 22 belongs to the Nov 28 cycle, so paying on Nov 28 stays fulfilled on Dec 1.
   * - Dec 23 .. Jan 22 belongs to the Dec 28 cycle.
   */
  static getCurrentCycleWindowUtc(
    asOfDate: Date = new Date(),
    paydayDayOfMonth: number = 28,
  ): { cycleStartUtc: Date; cycleEndUtc: Date } {
    const clampedDay = Math.min(28, Math.max(1, Math.round(paydayDayOfMonth || 28)))
    const todayMs = this.toUtcMidnightMs(asOfDate)
    const year = asOfDate.getUTCFullYear()
    const month = asOfDate.getUTCMonth()
    const graceMs = 5 * this.DAY_MS

    const thisMonthCycleStartMs = Date.UTC(year, month, clampedDay) - graceMs
    const nextMonthCycleStartMs = Date.UTC(year, month + 1, clampedDay) - graceMs
    const prevMonthCycleStartMs = Date.UTC(year, month - 1, clampedDay) - graceMs

    if (todayMs >= nextMonthCycleStartMs) {
      return {
        cycleStartUtc: new Date(nextMonthCycleStartMs),
        cycleEndUtc: new Date(Date.UTC(year, month + 2, clampedDay) - graceMs),
      }
    }
    if (todayMs >= thisMonthCycleStartMs) {
      return {
        cycleStartUtc: new Date(thisMonthCycleStartMs),
        cycleEndUtc: new Date(nextMonthCycleStartMs),
      }
    }
    return {
      cycleStartUtc: new Date(prevMonthCycleStartMs),
      cycleEndUtc: new Date(thisMonthCycleStartMs),
    }
  }

  /**
   * Deterministic classification for incoming DVA / Paystack deposits.
   * - Keeps monthly installment predictable during normal monthly & split-monthly payments.
   * - Only recalculates (reduces) future monthly installments on explicit or post-fulfillment Extra Top-Ups.
   */
  static classifyDirectDeposit(input: ClassifyDepositInput): ClassifyDepositResult {
    const {
      currentPrincipalKobo,
      initialDepositKobo,
      plannedMonthlyDepositKobo,
      currentMonthAppliedKobo,
      depositAmountKobo,
      explicitDepositKind,
    } = input

    if (explicitDepositKind === 'EXTRA_TOPUP') {
      return {
        classification: 'EXTRA_TOPUP',
        shouldRecalculateMonthlyTarget: true,
        surplusForMonthKobo: 0n,
      }
    }

    if (
      explicitDepositKind === 'INITIAL_DEPOSIT' ||
      (currentPrincipalKobo === 0n && initialDepositKobo > 0n)
    ) {
      return {
        classification: 'INITIAL_DEPOSIT',
        shouldRecalculateMonthlyTarget:
          initialDepositKobo > 0n && depositAmountKobo > initialDepositKobo,
        surplusForMonthKobo:
          depositAmountKobo > initialDepositKobo ? depositAmountKobo - initialDepositKobo : 0n,
      }
    }

    if (plannedMonthlyDepositKobo <= 0n) {
      return {
        classification: 'MONTHLY_CONTRIBUTION',
        shouldRecalculateMonthlyTarget: false,
        surplusForMonthKobo: 0n,
      }
    }

    if (currentMonthAppliedKobo < plannedMonthlyDepositKobo) {
      const remainingForMonth = plannedMonthlyDepositKobo - currentMonthAppliedKobo
      if (depositAmountKobo >= remainingForMonth) {
        return {
          classification: 'MONTHLY_CONTRIBUTION',
          shouldRecalculateMonthlyTarget: false,
          surplusForMonthKobo: depositAmountKobo - remainingForMonth,
        }
      }
      return {
        classification: 'PARTIAL_MONTHLY',
        shouldRecalculateMonthlyTarget: false,
        surplusForMonthKobo: 0n,
      }
    }

    return {
      classification: 'EXTRA_TOPUP',
      shouldRecalculateMonthlyTarget: true,
      surplusForMonthKobo: 0n,
    }
  }

  /**
   * Recomputes the remaining periodic contribution using exact calendar-day compounding:
   *   r_d = (1 + r_a)^(1/365) - 1
   * By default caps at currentPlannedMonthlyKobo (never increases on Extra Top-Ups due to rounding);
   * set `allowIncrease: true` for dynamic catch-up when a saver is behind schedule.
   */
  static recalculateMonthlyTargetKobo(params: {
    targetAmountKobo: bigint
    currentBalanceKobo: bigint
    contractualDueDate: Date
    annualNetYieldRate: number
    currentPlannedMonthlyKobo?: bigint
    asOfDate?: Date
    paydayDayOfMonth?: number
    maxSavingsMonths?: number
    currentMonthAlreadyFulfilled?: boolean
    allowIncrease?: boolean
  }): bigint {
    const {
      targetAmountKobo,
      currentBalanceKobo,
      contractualDueDate,
      annualNetYieldRate,
      currentPlannedMonthlyKobo = 0n,
      asOfDate = new Date(),
      paydayDayOfMonth = 28,
      maxSavingsMonths = 11,
      currentMonthAlreadyFulfilled = false,
      allowIncrease = false,
    } = params

    if (currentBalanceKobo >= targetAmountKobo) return 0n

    const startUtcMs = this.toUtcMidnightMs(asOfDate)
    const dueUtcMs = this.toUtcMidnightMs(contractualDueDate)
    const unlockUtcMs = dueUtcMs - 30 * this.DAY_MS
    const activeDays = Math.max(0, Math.round((unlockUtcMs - startUtcMs) / this.DAY_MS))
    const dailyRate = this.getEffectiveDailyRate(annualNetYieldRate)

    const fvCurrent = Number(currentBalanceKobo) * Math.pow(1 + dailyRate, activeDays)
    const deficit = Math.max(0, Number(targetAmountKobo) - fvCurrent)
    if (deficit <= 0) return 0n

    const allScheduledDates = this.buildScheduledDepositDatesUtc({
      startMs: startUtcMs,
      unlockMs: unlockUtcMs,
      cadence: 'MONTHLY',
      paydayDayOfMonth,
      maxMonths: Math.min(11, Math.max(1, maxSavingsMonths)),
    })

    const futureDates =
      currentMonthAlreadyFulfilled && allScheduledDates.length > 1
        ? allScheduledDates.slice(1)
        : allScheduledDates

    let dailyGrowthSum = 0
    for (const depMs of futureDates) {
      const daysToUnlock = Math.max(0, Math.round((unlockUtcMs - depMs) / this.DAY_MS))
      dailyGrowthSum += Math.pow(1 + dailyRate, daysToUnlock)
    }

    const recomputed = dailyGrowthSum > 0 ? BigInt(Math.ceil(deficit / dailyGrowthSum)) : 0n
    if (!allowIncrease && currentPlannedMonthlyKobo > 0n && recomputed > currentPlannedMonthlyKobo) {
      return currentPlannedMonthlyKobo
    }
    return recomputed
  }

  /**
   * Computes exact dynamic daily stay-on-plan & catch-up contribution based on today's date,
   * live vault balance, exact days remaining to T-30 unlock, and remaining scheduled paydays.
   */
  static calculateDynamicDailyTarget(params: {
    targetAmountKobo: bigint
    currentBalanceKobo: bigint
    contractualDueDate: Date
    annualNetYieldRate: number
    plannedMonthlyKobo?: bigint
    planPattern?: SavingsPlanPattern
    initialDepositKobo?: bigint
    paydayDayOfMonth?: number
    asOfDate?: Date
    maxSavingsMonths?: number
    currentMonthFulfilled?: boolean
  }): DynamicDailyTargetResult {
    const {
      targetAmountKobo,
      currentBalanceKobo,
      contractualDueDate,
      annualNetYieldRate,
      plannedMonthlyKobo = 0n,
      planPattern = 'EQUAL',
      initialDepositKobo = 0n,
      paydayDayOfMonth = 28,
      asOfDate = new Date(),
      maxSavingsMonths = 11,
      currentMonthFulfilled = false,
    } = params

    const startUtcMs = this.toUtcMidnightMs(asOfDate)
    const dueUtcMs = this.toUtcMidnightMs(contractualDueDate)
    const unlockUtcMs = dueUtcMs - 30 * this.DAY_MS
    const activeCompoundingDays = Math.max(0, Math.round((unlockUtcMs - startUtcMs) / this.DAY_MS))
    const dailyRate = this.getEffectiveDailyRate(annualNetYieldRate)
    const todayFactor = Math.pow(1 + dailyRate, activeCompoundingDays)
    const fvCurrent = Number(currentBalanceKobo) * todayFactor

    if (currentBalanceKobo >= targetAmountKobo || fvCurrent >= Number(targetAmountKobo)) {
      const projectedBal = BigInt(Math.round(fvCurrent))
      return {
        activeCompoundingDays,
        remainingScheduledDeposits: 0,
        dailyRate,
        suggestedDepositTodayKobo: 0n,
        catchUpTodayKobo: 0n,
        spreadRemainingDepositKobo: 0n,
        projectedBalanceAtUnlockKobo: projectedBal,
        projectedRemainingYieldKobo:
          projectedBal > currentBalanceKobo ? projectedBal - currentBalanceKobo : 0n,
        onTrackStatus: 'TARGET_REACHED',
        isTargetReachedEarly: currentBalanceKobo >= targetAmountKobo && activeCompoundingDays > 0,
      }
    }

    const scheduledDates = this.buildScheduledDepositDatesUtc({
      startMs: startUtcMs,
      unlockMs: unlockUtcMs,
      cadence: 'MONTHLY',
      paydayDayOfMonth,
      maxMonths: Math.min(11, Math.max(1, maxSavingsMonths)),
    })

    // Remaining future scheduled paydays strictly after today (or after current month if already fulfilled)
    const effectiveFutureDates =
      currentMonthFulfilled && scheduledDates.length > 1
        ? scheduledDates.slice(1)
        : scheduledDates

    // INITIAL_DEPOSIT Day-1 / Pre-Upfront Handling:
    // If the user chose an upfront deposit plan (e.g. ₦500k upfront + ₦120k/mo) and has not
    // finished funding their upfront deposit yet (e.g. starting with ₦0 or ₦12k cashback),
    // suggest completing the remaining upfront deposit rather than falsely flagging them BEHIND.
    if (
      planPattern === 'INITIAL_DEPOSIT' &&
      initialDepositKobo > 0n &&
      currentBalanceKobo < initialDepositKobo &&
      activeCompoundingDays > 0
    ) {
      const remainingInitialKobo = initialDepositKobo - currentBalanceKobo
      let futureGrowthSum = 0
      for (const depMs of effectiveFutureDates) {
        const d = Math.max(0, Math.round((unlockUtcMs - depMs) / this.DAY_MS))
        futureGrowthSum += Math.pow(1 + dailyRate, d)
      }
      const fvWithInitial = Number(initialDepositKobo) * todayFactor
      const deficitAfterInitial = Math.max(0, Number(targetAmountKobo) - fvWithInitial)
      const neededMonthlyAfterInitial =
        futureGrowthSum > 0 ? BigInt(Math.ceil(deficitAfterInitial / futureGrowthSum)) : 0n
      const baselineMonthly =
        plannedMonthlyKobo > 0n ? plannedMonthlyKobo : neededMonthlyAfterInitial
      const projectedWithInitialAndMonthly =
        fvWithInitial + Number(baselineMonthly) * futureGrowthSum
      const projectedBalanceAtUnlockKobo = BigInt(Math.round(projectedWithInitialAndMonthly))
      const totalAdditionalPrincipal =
        remainingInitialKobo + baselineMonthly * BigInt(effectiveFutureDates.length)
      const projectedRemainingYieldKobo =
        projectedBalanceAtUnlockKobo > currentBalanceKobo + totalAdditionalPrincipal
          ? projectedBalanceAtUnlockKobo - currentBalanceKobo - totalAdditionalPrincipal
          : 0n

      return {
        activeCompoundingDays,
        remainingScheduledDeposits: effectiveFutureDates.length,
        dailyRate,
        suggestedDepositTodayKobo: remainingInitialKobo,
        catchUpTodayKobo: remainingInitialKobo,
        spreadRemainingDepositKobo: neededMonthlyAfterInitial,
        projectedBalanceAtUnlockKobo,
        projectedRemainingYieldKobo,
        onTrackStatus: 'ON_TRACK',
        isTargetReachedEarly: false,
      }
    }

    // Option A: If depositing TODAY plus all remaining future scheduled paydays after the next one
    const tailDatesAfterToday =
      effectiveFutureDates.length > 1 ? effectiveFutureDates.slice(1) : []
    const getWeight = (idx: number) =>
      planPattern === 'STEP_UP'
        ? Math.pow(1.08, idx)
        : planPattern === 'ACCELERATED'
          ? Math.max(0.4, 1 - 0.06 * idx)
          : 1

    let tailGrowthSum = 0
    let weightedTailSum = 0
    for (let i = 0; i < tailDatesAfterToday.length; i++) {
      const depMs = tailDatesAfterToday[i] ?? unlockUtcMs
      const d = Math.max(0, Math.round((unlockUtcMs - depMs) / this.DAY_MS))
      const factor = Math.pow(1 + dailyRate, d)
      tailGrowthSum += factor
      weightedTailSum += getWeight(i + 1) * factor
    }

    const deficitAtUnlock = Math.max(0, Number(targetAmountKobo) - fvCurrent)

    // Uniform (or pattern-weighted) spread across (deposit today + tail scheduled paydays)
    const spreadDenomToday =
      planPattern === 'STEP_UP' || planPattern === 'ACCELERATED'
        ? todayFactor + weightedTailSum
        : todayFactor + tailGrowthSum
    const spreadRemainingDepositKobo =
      spreadDenomToday > 0 ? BigInt(Math.ceil(deficitAtUnlock / spreadDenomToday)) : 0n

    // Catch-up today keeping all future tail deposits fixed at `plannedMonthlyKobo`
    const baselineMonthly =
      plannedMonthlyKobo > 0n ? plannedMonthlyKobo : spreadRemainingDepositKobo
    const fvTailAtBaseline = Number(baselineMonthly) * tailGrowthSum
    const gapForToday = Math.max(0, deficitAtUnlock - fvTailAtBaseline)
    const catchUpTodayKobo =
      todayFactor > 0 ? BigInt(Math.ceil(gapForToday / todayFactor)) : 0n

    // Determine on-track status by comparing baseline plan outcome vs target rent
    let scheduledGrowthSum = 0
    for (let i = 0; i < effectiveFutureDates.length; i++) {
      const depMs = effectiveFutureDates[i] ?? unlockUtcMs
      const d = Math.max(0, Math.round((unlockUtcMs - depMs) / this.DAY_MS))
      scheduledGrowthSum += getWeight(i) * Math.pow(1 + dailyRate, d)
    }
    const projectedAtBaseline = fvCurrent + Number(baselineMonthly) * scheduledGrowthSum
    const varianceNaira = (projectedAtBaseline - Number(targetAmountKobo)) / 100

    let onTrackStatus: VaultOnTrackStatus = 'ON_TRACK'
    if (varianceNaira < -1_000) {
      onTrackStatus = 'BEHIND'
    } else if (varianceNaira > 10_000) {
      onTrackStatus = 'AHEAD'
    }

    const suggestedDepositTodayKobo =
      currentMonthFulfilled
        ? 0n
        : spreadRemainingDepositKobo

    const projectedAtDynamic =
      fvCurrent +
      Number(suggestedDepositTodayKobo) * todayFactor +
      Number(spreadRemainingDepositKobo) *
        (planPattern === 'STEP_UP' || planPattern === 'ACCELERATED'
          ? weightedTailSum
          : tailGrowthSum)
    const projectedBalanceAtUnlockKobo = BigInt(Math.round(projectedAtDynamic))
    let totalAdditionalPrincipal = suggestedDepositTodayKobo
    for (let i = 0; i < tailDatesAfterToday.length; i++) {
      totalAdditionalPrincipal += BigInt(
        Math.ceil(Number(spreadRemainingDepositKobo) * getWeight(i + 1)),
      )
    }
    const projectedRemainingYieldKobo =
      projectedBalanceAtUnlockKobo > currentBalanceKobo + totalAdditionalPrincipal
        ? projectedBalanceAtUnlockKobo - currentBalanceKobo - totalAdditionalPrincipal
        : 0n

    return {
      activeCompoundingDays,
      remainingScheduledDeposits: effectiveFutureDates.length,
      dailyRate,
      suggestedDepositTodayKobo,
      catchUpTodayKobo,
      spreadRemainingDepositKobo,
      projectedBalanceAtUnlockKobo,
      projectedRemainingYieldKobo,
      onTrackStatus,
      isTargetReachedEarly: false,
    }
  }

  public static readonly DAY_MS = 86_400_000
  public static readonly ANNUAL_NET_YIELD = 0.16 // 16.0% p.a. (Full Lock Save & Earn)
  public static readonly ANNUAL_FLEXIBLE_YIELD = 0.12 // 12.0% p.a. (Flexible Save & Earn)
  public static readonly ANNUAL_BASE_EXIT_YIELD = 0.07 // 7.0% p.a. (Fair Exit)
  public static readonly DAYS_IN_YEAR = 365

  /**
   * Canonical effective daily compounding rate:
   *   r_d = (1 + r_a)^(1/365) - 1
   * Guarantees 365 days of daily compounding equals exactly r_a p.a.
   */
  public static getEffectiveDailyRate(annualRateDecimal: number): number {
    const safeRate = Math.max(0, annualRateDecimal)
    return Math.pow(1 + safeRate, 1 / this.DAYS_IN_YEAR) - 1
  }

  public static readonly DAILY_RATE = RentSavingsCalculatorEngine.getEffectiveDailyRate(
    RentSavingsCalculatorEngine.ANNUAL_NET_YIELD,
  )
  public static readonly BASE_DAILY_RATE = RentSavingsCalculatorEngine.getEffectiveDailyRate(
    RentSavingsCalculatorEngine.ANNUAL_BASE_EXIT_YIELD,
  )
  public static readonly BASE_BREAKOUT_YIELD = RentSavingsCalculatorEngine.ANNUAL_BASE_EXIT_YIELD // 7.0% p.a. (Rent Protec)
  public static readonly FULL_LOCK_EARLY_EXIT_ANNUAL_RATE = 0.1 // 10.0% p.a. (Full Lock early exit)
  public static readonly FULL_LOCK_EARLY_EXIT_ADMIN_FEE_RATE = 0.0 // 0% admin fee (Full Lock)
  public static readonly ADVANCE_MAX_RATIO = 0.4 // 40% cap
  public static readonly ADVANCE_FACILITY_FEE_RATE = 0.035 // 3.5%
  public static readonly ADVANCE_LATE_FEE_DAILY_RATE = 0.001 // 0.1%/day
  public static readonly BREAKOUT_ADMIN_FEE_RATE = 0.015 // 1.5% (Rent Protec only)

  private static toUtcMidnightMs(d: Date): number {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }

  /**
   * Generates exact UTC calendar deposit timestamps between startMs and unlockMs,
   * anchored to preferred paydayDayOfMonth (1..28) and capped at maxMonths (11).
   */
  public static buildScheduledDepositDatesUtc(params: {
    startMs: number
    unlockMs: number
    cadence: CadenceType
    paydayDayOfMonth?: number
    maxMonths?: number
  }): number[] {
    const { startMs, unlockMs, cadence, paydayDayOfMonth = 28, maxMonths = 11 } = params
    const safeUnlockMs = Math.max(startMs, unlockMs)

    if (cadence === 'DAILY') {
      const days = Math.max(1, Math.round((safeUnlockMs - startMs) / this.DAY_MS))
      const dates: number[] = []
      for (let i = 1; i <= days; i++) {
        dates.push(Math.min(safeUnlockMs, startMs + i * this.DAY_MS))
      }
      return dates
    }

    if (cadence === 'WEEKLY') {
      const maxWeeks = Math.max(1, maxMonths * 4)
      const dates: number[] = []
      for (let i = 1; i <= maxWeeks; i++) {
        const candidate = startMs + i * 7 * this.DAY_MS
        if (candidate > safeUnlockMs) break
        dates.push(candidate)
      }
      return dates.length > 0 ? dates : [safeUnlockMs]
    }

    const startDate = new Date(startMs)
    const startYear = startDate.getUTCFullYear()
    const startMonth = startDate.getUTCMonth()
    const startDay = startDate.getUTCDate()
    const clampedDay = Math.min(28, Math.max(1, Math.round(paydayDayOfMonth || 28)))
    const firstMonthOffset = clampedDay > startDay ? 0 : 1
    const monthStep = cadence === 'QUARTERLY' ? 3 : 1
    const maxCount = cadence === 'QUARTERLY' ? Math.max(1, Math.floor(maxMonths / 3)) : Math.min(11, Math.max(1, maxMonths))

    const dates: number[] = []
    for (let i = 0; i < 24 && dates.length < maxCount; i++) {
      const candidateMs = Date.UTC(startYear, startMonth + firstMonthOffset + i * monthStep, clampedDay)
      if (candidateMs < startMs) continue
      if (candidateMs > safeUnlockMs) break
      dates.push(candidateMs)
    }

    return dates.length > 0 ? dates : [safeUnlockMs]
  }

  /**
   * Calculates exact difference in calendar days between two dates
   */
  public static calculateDaysRemaining(dueDate: Date, asOfDate: Date = new Date()): number {
    const start = this.toUtcMidnightMs(asOfDate)
    const end = this.toUtcMidnightMs(dueDate)
    const diffTime = end - start
    return Math.max(0, Math.round(diffTime / this.DAY_MS))
  }

  /**
   * Executes the exact calendar-day compounding work-backwards simulation engine:
   *   r_d = (1 + r_a)^(1/365) - 1
   *   FV_0 = D * (1 + r_d)^{daysToUnlock}
   *   P = ceil((R - FV_0) / sum_{k=1..n} w_k * (1 + r_d)^{daysToUnlock_k})
   */
  public static simulate(input: SimulationInput): SimulationResult {
    const today = input.asOfDate || new Date()
    const startUtcMs = this.toUtcMidnightMs(today)
    const dueUtcMs = this.toUtcMidnightMs(input.contractualDueDate)
    const rawDaysRemaining = Math.max(0, Math.round((dueUtcMs - startUtcMs) / this.DAY_MS))

    if (rawDaysRemaining <= 0) {
      throw new Error('Contractual due date must be strictly in the future.')
    }

    const maxMonths = Math.min(11, Math.max(1, input.maxSavingsMonths ?? 11))
    const minRentProtecMonths = Math.max(1, input.rentProtecMinMonths ?? 6)
    const productOption: SavingsProductOption = input.productOption ?? 'SAVE_AND_EARN'
    const lockMode: SavingsLockMode =
      productOption === 'RENT_PROTEC'
        ? 'LOCKED'
        : input.lockMode === 'FLEXIBLE'
          ? 'FLEXIBLE'
          : 'LOCKED'
    const planPattern: SavingsPlanPattern = input.planPattern ?? 'INITIAL_DEPOSIT'

    // Rent is released strictly 30 days before contractual due date.
    const unlockUtcMs = Math.max(startUtcMs, dueUtcMs - 30 * this.DAY_MS)
    const activeCompoundingDays = Math.max(1, Math.round((unlockUtcMs - startUtcMs) / this.DAY_MS))
    const savingsDaysRemaining = activeCompoundingDays
    const rawMonths = Math.max(1, Math.floor(savingsDaysRemaining / 30))
    const monthsRemaining = Math.min(maxMonths, rawMonths)
    const daysRemaining = Math.min(savingsDaysRemaining, maxMonths * 31)

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
          : lockMode === 'FLEXIBLE'
            ? 0.12
            : 0.16

    // Canonical exact effective daily compounding rate: r_d = (1 + r_a)^(1/365) - 1
    const dailyRate = this.getEffectiveDailyRate(effectiveAnnualYield)

    // Formula-derived minimum upfront deposit for RENT_PROTEC over actual activeCompoundingDays
    // (20% for 8-11mo, 33% for 7mo, 45% for 6mo)
    const minimumInitialDepositPct =
      productOption === 'RENT_PROTEC'
        ? this.getRentProtecActivationThresholdPct(activeCompoundingDays)
        : 0
    const requiredInitialDepositNum =
      productOption === 'RENT_PROTEC'
        ? Math.round(targetAmount * (minimumInitialDepositPct / 100))
        : 0
    const providedInitialDeposit = Number(input.initialDepositKobo || 0n)
    const effectiveInitialDeposit =
      productOption === 'RENT_PROTEC'
        ? Math.max(providedInitialDeposit, requiredInitialDepositNum)
        : providedInitialDeposit > 0
          ? providedInitialDeposit
          : 0

    // Exact calendar deposit schedule anchored to paydayDayOfMonth (default 28th)
    const scheduledDatesMs = this.buildScheduledDepositDatesUtc({
      startMs: startUtcMs,
      unlockMs: unlockUtcMs,
      cadence: input.cadence,
      paydayDayOfMonth: input.paydayDayOfMonth ?? 28,
      maxMonths,
    })
    const numberOfPayments = scheduledDatesMs.length

    // Exact daily FV of initial deposit over activeCompoundingDays
    const fvInitial = effectiveInitialDeposit * Math.pow(1 + dailyRate, activeCompoundingDays)
    const deficit = Math.max(0, targetAmount - fvInitial)

    // Compute weights w_i for each scheduled deposit i = 1..n
    const weights: number[] = []
    for (let i = 1; i <= numberOfPayments; i++) {
      if (planPattern === 'STEP_UP') {
        const stepFactor = input.cadence === 'WEEKLY' ? 0.02 : 0.08
        weights.push(Math.pow(1 + stepFactor, i - 1))
      } else if (planPattern === 'ACCELERATED') {
        const taperFactor = input.cadence === 'WEEKLY' ? 0.015 : 0.06
        weights.push(Math.max(0.4, 1 - taperFactor * (i - 1)))
      } else {
        weights.push(1)
      }
    }

    let weightedDiscountSum = 0
    const daysToUnlockPerPayment: number[] = []
    for (let i = 0; i < numberOfPayments; i++) {
      const depMs = scheduledDatesMs[i] ?? unlockUtcMs
      const daysToUnlock = Math.max(0, Math.round((unlockUtcMs - depMs) / this.DAY_MS))
      daysToUnlockPerPayment.push(daysToUnlock)
      const w = weights[i] ?? 1
      weightedDiscountSum += w * Math.pow(1 + dailyRate, daysToUnlock)
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

    let totalFutureValueNum = fvInitial
    for (let i = 0; i < numberOfPayments; i++) {
      totalFutureValueNum +=
        (schedulePayments[i] ?? 0) * Math.pow(1 + dailyRate, daysToUnlockPerPayment[i] ?? 0)
    }
    const projectedYieldKobo = BigInt(
      Math.max(0, Math.round(totalFutureValueNum - Number(totalTenantContributionKobo))),
    )

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
      activeCompoundingDays,
      monthsRemaining: numberOfPayments,
      periodicDepositKobo,
      firstPeriodDepositKobo: BigInt(firstPeriodDepositNum),
      lastPeriodDepositKobo: BigInt(lastPeriodDepositNum),
      requiredInitialDepositKobo: BigInt(effectiveInitialDeposit),
      minimumInitialDepositKobo: BigInt(requiredInitialDepositNum),
      minimumInitialDepositPct,
      numberOfPayments,
      totalTenantContributionKobo,
      projectedYieldKobo,
      netAnnualYieldRate: effectiveAnnualYield,
      dailyYieldRate: dailyRate,
      productOption,
      lockMode,
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
   * Daily yield calculation on active balance at the given effective annual rate
   * (defaults to 16.0% p.a. Full Lock). Does not inflate dust balances.
   */
  public static calculateDailyYield(
    balanceKobo: bigint,
    annualRateDecimal: number = this.ANNUAL_NET_YIELD,
  ): bigint {
    if (balanceKobo <= 0n) return 0n
    const dailyRate =
      annualRateDecimal === this.ANNUAL_NET_YIELD
        ? this.DAILY_RATE
        : this.getEffectiveDailyRate(annualRateDecimal)
    const dailyYield = Math.round(Number(balanceKobo) * dailyRate)
    return dailyYield > 0 ? BigInt(dailyYield) : 0n
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
   * Replays each individual principal deposit from its exact UTC deposit date to `asOfDate`
   * using canonical effective daily compounding at `recalculationAnnualRateDecimal`.
   *
   * Eliminates single-`daysHeld` over-payment when a user deposits incrementally over months.
   * Reconciles deposit sum against `currentPrincipalKobo` (attributing any legacy/untracked
   * principal to `vaultCreatedAt`, or proportionally scaling if partial principal was reduced).
   */
  public static calculatePerDepositEarlyExit(params: {
    deposits: Array<{ amountKobo: bigint; depositedAt: Date }>
    currentPrincipalKobo: bigint
    vaultCreatedAt: Date
    asOfDate?: Date
    recalculationAnnualRateDecimal: number
    adminFeeRateDecimal: number
  }): {
    principalKobo: bigint
    recalculatedYieldKobo: bigint
    adminFeeKobo: bigint
    netPayoutKobo: bigint
    depositCount: number
    weightedDaysHeld: number
    recalculationAnnualRatePct: number
    adminFeeRatePct: number
  } {
    const {
      deposits,
      currentPrincipalKobo,
      vaultCreatedAt,
      recalculationAnnualRateDecimal,
      adminFeeRateDecimal,
    } = params
    const asOf = params.asOfDate ?? new Date()
    const ratePct = Math.round(Math.max(0, recalculationAnnualRateDecimal) * 1000) / 10
    const feePct = Math.round(Math.max(0, adminFeeRateDecimal) * 1000) / 10

    if (currentPrincipalKobo <= 0n) {
      return {
        principalKobo: 0n,
        recalculatedYieldKobo: 0n,
        adminFeeKobo: 0n,
        netPayoutKobo: 0n,
        depositCount: 0,
        weightedDaysHeld: 0,
        recalculationAnnualRatePct: ratePct,
        adminFeeRatePct: feePct,
      }
    }

    const asOfUtcMs = this.toUtcMidnightMs(asOf)
    const dailyRate = this.getEffectiveDailyRate(Math.max(0, recalculationAnnualRateDecimal))
    const validDeposits = deposits.filter((d) => d.amountKobo > 0n)

    let depositSumNum = 0
    for (const dep of validDeposits) {
      depositSumNum += Number(dep.amountKobo)
    }

    const targetPrincipalNum = Number(currentPrincipalKobo)
    const effectiveEntries: Array<{ amountNum: number; depositedAt: Date }> = []

    if (validDeposits.length === 0 || depositSumNum <= 0) {
      effectiveEntries.push({ amountNum: targetPrincipalNum, depositedAt: vaultCreatedAt })
    } else if (depositSumNum > targetPrincipalNum) {
      const scale = targetPrincipalNum / depositSumNum
      for (const dep of validDeposits) {
        effectiveEntries.push({
          amountNum: Number(dep.amountKobo) * scale,
          depositedAt: dep.depositedAt,
        })
      }
    } else {
      for (const dep of validDeposits) {
        effectiveEntries.push({
          amountNum: Number(dep.amountKobo),
          depositedAt: dep.depositedAt,
        })
      }
      const unattributed = targetPrincipalNum - depositSumNum
      if (unattributed >= 1) {
        effectiveEntries.push({ amountNum: unattributed, depositedAt: vaultCreatedAt })
      }
    }

    let totalYieldNum = 0
    let weightedDaysSum = 0
    for (const entry of effectiveEntries) {
      const depUtcMs = this.toUtcMidnightMs(entry.depositedAt)
      const daysHeld = Math.max(0, Math.round((asOfUtcMs - depUtcMs) / this.DAY_MS))
      weightedDaysSum += entry.amountNum * daysHeld
      if (daysHeld > 0 && dailyRate > 0) {
        const compoundFactor = Math.pow(1 + dailyRate, daysHeld) - 1
        totalYieldNum += entry.amountNum * compoundFactor
      }
    }

    const recalculatedYieldKobo = BigInt(Math.max(0, Math.round(totalYieldNum)))
    const adminFeeKobo =
      adminFeeRateDecimal > 0
        ? BigInt(Math.round(targetPrincipalNum * Math.max(0, adminFeeRateDecimal)))
        : 0n
    const grossPayoutKobo = currentPrincipalKobo + recalculatedYieldKobo
    const netPayoutKobo = grossPayoutKobo > adminFeeKobo ? grossPayoutKobo - adminFeeKobo : 0n
    const weightedDaysHeld =
      targetPrincipalNum > 0 ? Math.round(weightedDaysSum / targetPrincipalNum) : 0

    return {
      principalKobo: currentPrincipalKobo,
      recalculatedYieldKobo,
      adminFeeKobo,
      netPayoutKobo,
      depositCount: effectiveEntries.length,
      weightedDaysHeld,
      recalculationAnnualRatePct: ratePct,
      adminFeeRatePct: feePct,
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
