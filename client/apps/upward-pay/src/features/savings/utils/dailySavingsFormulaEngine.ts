import {
  ENGINE_PLANS,
  MONTH_LABELS,
  computeSavingsEngine,
  parseIsoDateUtc,
  toIsoDateUtc,
  type EnginePlanId,
} from './savingsFormulaEngine'
import { getRentProtecMinimumDepositPct } from '../services/savingsService'

export interface DailyEngineInputs {
  targetRentNaira: number
  planId: EnginePlanId
  startDateIso: string
  rentDueDateIso: string
  upfrontDepositNaira: number
  depositDay: number // 1..28
  payFirstMonthOnStartDay: boolean
  // Extra top-up on a specific date
  enableExtraTopUp: boolean
  extraTopUpDateIso: string
  extraTopUpAmountNaira: number
  // Dynamic catch-up / delay / missed deposit simulation
  simDepositIndex: number // 1..n
  simDelayDays: number // -15 (early) .. +35 (late)
  simMissedFullDeposit: boolean
  simPartialAmountNaira: number | null // optional custom deposit instead of scheduled
}

export interface DailyDepositRow {
  step: number // 0 = Day 0 Upfront, 1..n = Scheduled deposits
  label: string
  dateIso: string
  dateLabel: string
  daysSincePrevious: number
  daysToUnlock: number
  depositAmount: number
  extraTopUpBefore: number
  interestEarnedInPeriod: number
  lifetimeInterestFromDeposit: number
  futureValueAtUnlock: number
  closingBalanceAfterDeposit: number
  oneNairaBecomes: number
  isFinalDeposit: boolean
  isReducedAfterTopUp: boolean
}

export interface DynamicCatchUpResult {
  depositIndex: number
  scheduledDateIso: string
  scheduledDateLabel: string
  actualDateIso: string
  actualDateLabel: string
  delayDays: number
  missedFullDeposit: boolean
  balanceOnActualDateBeforeDeposit: number
  scheduledDepositNaira: number
  /** Amount to deposit TODAY (actualDate) so all remaining future deposits stay unchanged */
  catchUpTodayAmountNaira: number
  catchUpDeltaVsScheduledNaira: number
  missedInterestEffectNaira: number
  /** New uniform amount across today + remaining paydays if spreading the adjustment */
  spreadRemainingDepositNaira: number
  spreadDeltaPerMonthNaira: number
  remainingDepositsCount: number
  daysToUnlockFromActualDate: number
  /** If user keeps paying original scheduled amount late without adjusting, how short/over they end up */
  unadjustedBalanceAtUnlock: number
  unadjustedVarianceAtUnlock: number
}

export interface TwoTenantDateProof {
  tenantAStartLabel: string
  tenantBStartLabel: string
  dayDifference: number
  oldMonthlyBothDeposit: number
  tenantAOldRealBalance: number
  tenantBOldRealBalance: number
  tenantBOldShortfall: number
  tenantADailyDeposit: number
  tenantBDailyDeposit: number
  dailyDepositDifference: number
  tenantADailyBalance: number
  tenantBDailyBalance: number
}

export interface MonthlyVsDailyComparison {
  monthlyEngineDeposit: number
  dailyEngineDeposit: number
  monthlyDepositDelta: number // daily - monthly
  monthlyEngineTotalCash: number
  dailyEngineTotalCash: number
  totalCashDelta: number
  monthlyEngineProjectedInterest: number
  dailyEngineProjectedInterest: number
  /** What happens on the EXACT same calendar dates if the user actually pays the old Monthly amount and earns real daily compounding */
  oldMonthlyRealBalanceAtUnlock: number
  oldMonthlyRealVariance: number
  dailyRealBalanceAtUnlock: number
  dailyRealVariance: number
}

export interface DailyEngineCalculationResult {
  targetRent: number
  planId: EnginePlanId
  annualRatePct: number
  annualRateDecimal: number
  dailyRate: number
  effectiveAnnualYieldPct: number
  startDateIso: string
  startDateLabel: string
  rentDueDateIso: string
  rentDueDateLabel: string
  unlockDateIso: string
  unlockDateLabel: string
  daysUntilRent: number
  activeCompoundingDays: number
  depositDay: number
  payFirstMonthOnStartDay: boolean
  numberOfDeposits: number
  // Rent Protec
  isRentProtecEligible: boolean
  minUpfrontPct: number
  minUpfrontNaira: number
  requestedUpfront: number
  effectiveUpfront: number
  upfrontClampedToFloor: boolean
  // Core daily math
  upfrontGrowthFactor: number
  fvUpfront: number
  upfrontInterest: number
  fundingGap: number
  dailyGrowthFactor: number
  rawDeposit: number
  scheduledDeposit: number
  plainSplitDeposit: number
  depositSavingsFromInterest: number
  // Top-up results
  topUpApplied: boolean
  topUpDateIso: string
  topUpDateLabel: string
  topUpDaysToUnlock: number
  topUpAmount: number
  topUpFutureValue: number
  reducedDepositAfterTopUp: number
  depositDropAfterTopUp: number
  // Target-reached early check
  reachedTargetEarly: boolean
  earlyTargetDateLabel: string | null
  extraInterestIfKeptToUnlock: number
  // Totals
  totalUserContribution: number
  totalInterestEarned: number
  effectiveDiscountPct: number
  closingBalanceAtUnlock: number
  balanceVariance: number
  // Detailed outputs
  rows: DailyDepositRow[]
  dynamicCatchUp: DynamicCatchUpResult
  comparison: MonthlyVsDailyComparison
  twoTenantProof: TwoTenantDateProof
}

const DAY_MS = 86_400_000

function formatUtcDate(ms: number, includeYear = false): string {
  const d = new Date(ms)
  const base = `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`
  return includeYear ? `${base}, ${d.getUTCFullYear()}` : base
}

/**
 * Exact effective daily compounding rate:
 *   r_d = (1 + r_a)^(1/365) - 1
 * Guarantees 365 days of daily compounding equals exactly r_a p.a.
 */
export function getDailyCompoundingRate(annualRateDecimal: number): number {
  const safeRate = Math.max(0, annualRateDecimal)
  return Math.pow(1 + safeRate, 1 / 365) - 1
}

/**
 * Generates exact calendar deposit dates between startMs and unlockMs,
 * anchored to preferred depositDay (1..28) and capped at maxDeposits (11).
 */
export function buildScheduledDepositDatesMs(params: {
  startMs: number
  unlockMs: number
  depositDay: number
  payFirstMonthOnStartDay: boolean
  maxDeposits?: number
}): number[] {
  const { startMs, unlockMs, depositDay, payFirstMonthOnStartDay, maxDeposits = 11 } = params
  const startDate = new Date(startMs)
  const startYear = startDate.getUTCFullYear()
  const startMonth = startDate.getUTCMonth()
  const startDay = startDate.getUTCDate()

  const clampedDay = Math.min(28, Math.max(1, Math.round(depositDay || 28)))
  const effectivePayDay = payFirstMonthOnStartDay ? Math.min(28, startDay) : clampedDay
  const firstMonthOffset = payFirstMonthOnStartDay ? 0 : clampedDay > startDay ? 0 : 1

  const dates: number[] = []
  for (let i = 0; i < 24 && dates.length < maxDeposits; i++) {
    const candidateMs = Date.UTC(startYear, startMonth + firstMonthOffset + i, effectivePayDay)
    if (candidateMs < startMs) continue
    if (candidateMs > unlockMs) break
    dates.push(candidateMs)
  }

  // Fallback for very short timelines (< 1 month to unlock): 1 deposit on unlockMs
  if (dates.length === 0) {
    dates.push(unlockMs)
  }

  return dates
}

export function computeDailySavingsEngine(
  inputs: DailyEngineInputs,
): DailyEngineCalculationResult {
  const targetRent = Math.max(0, Math.round(inputs.targetRentNaira || 0))
  const plan = ENGINE_PLANS[inputs.planId] ?? ENGINE_PLANS.FULL_LOCK
  const annualRatePct = plan.annualRatePct
  const annualRateDecimal = annualRatePct / 100

  const defaultStartMs = Date.UTC(2026, 10, 1) // Nov 1, 2026
  const defaultRentMs = Date.UTC(2027, 10, 1) // Nov 1, 2027
  const startMs = parseIsoDateUtc(inputs.startDateIso, defaultStartMs)
  const rawRentMs = parseIsoDateUtc(inputs.rentDueDateIso, defaultRentMs)
  const rentDueMs = rawRentMs > startMs + 35 * DAY_MS ? rawRentMs : startMs + 60 * DAY_MS
  const unlockMs = rentDueMs - 30 * DAY_MS

  const daysUntilRent = Math.max(1, Math.round((rentDueMs - startMs) / DAY_MS))
  const activeCompoundingDays = Math.max(1, Math.round((unlockMs - startMs) / DAY_MS))
  const isRentProtecEligible = daysUntilRent >= 6 * 28

  const dailyRate = getDailyCompoundingRate(annualRateDecimal)
  const effectiveAnnualYieldPct = (Math.pow(1 + dailyRate, 365) - 1) * 100

  // Rent Protec activation threshold using activeCompoundingDays (exact unlock horizon)
  const minUpfrontPct =
    inputs.planId === 'RENT_PROTEC' ? getRentProtecMinimumDepositPct(activeCompoundingDays) : 0
  const minUpfrontNaira =
    inputs.planId === 'RENT_PROTEC' ? Math.round(targetRent * (minUpfrontPct / 100)) : 0

  const requestedUpfront = Math.max(0, Math.min(targetRent, Math.round(inputs.upfrontDepositNaira || 0)))
  const effectiveUpfront =
    inputs.planId === 'RENT_PROTEC'
      ? Math.min(targetRent, Math.max(requestedUpfront, minUpfrontNaira))
      : requestedUpfront
  const upfrontClampedToFloor =
    inputs.planId === 'RENT_PROTEC' && requestedUpfront < minUpfrontNaira

  const depositDay = Math.min(28, Math.max(1, Math.round(inputs.depositDay || 28)))
  const payFirstMonthOnStartDay = Boolean(inputs.payFirstMonthOnStartDay)

  const depositDatesMs = buildScheduledDepositDatesMs({
    startMs,
    unlockMs,
    depositDay,
    payFirstMonthOnStartDay,
    maxDeposits: 11,
  })
  const numberOfDeposits = depositDatesMs.length

  // Exact daily Future Value of upfront deposit over activeCompoundingDays
  const upfrontGrowthFactor = Math.pow(1 + dailyRate, activeCompoundingDays)
  const fvUpfront = effectiveUpfront * upfrontGrowthFactor
  const upfrontInterest = Math.max(0, fvUpfront - effectiveUpfront)
  const fundingGap = Math.max(0, targetRent - fvUpfront)

  // Exact daily growth factor across all scheduled deposit dates: sum_{k=1..n} (1 + r_d)^{d_k}
  let dailyGrowthFactor = 0
  const daysToUnlockPerStep: number[] = []
  for (const depMs of depositDatesMs) {
    const d = Math.max(0, Math.round((unlockMs - depMs) / DAY_MS))
    daysToUnlockPerStep.push(d)
    dailyGrowthFactor += Math.pow(1 + dailyRate, d)
  }

  const rawDeposit = fundingGap > 0 && dailyGrowthFactor > 0 ? fundingGap / dailyGrowthFactor : 0
  const scheduledDeposit = rawDeposit > 0 ? Math.ceil(rawDeposit) : 0
  const plainSplitDeposit =
    fundingGap > 0 && numberOfDeposits > 0 ? Math.ceil(fundingGap / numberOfDeposits) : 0
  const depositSavingsFromInterest = Math.max(0, plainSplitDeposit - scheduledDeposit)

  // Optional Extra Top-Up on an exact calendar date (compounds from its exact date!)
  const rawTopUpMs = parseIsoDateUtc(
    inputs.extraTopUpDateIso,
    depositDatesMs[Math.min(2, numberOfDeposits - 1)] ?? startMs + 60 * DAY_MS,
  )
  const clampedTopUpMs = Math.min(unlockMs, Math.max(startMs, rawTopUpMs))
  const topUpAmount = Math.max(0, Math.round(inputs.extraTopUpAmountNaira || 0))
  const topUpApplied = Boolean(inputs.enableExtraTopUp && topUpAmount > 0 && scheduledDeposit > 0)
  const topUpDaysToUnlock = Math.max(0, Math.round((unlockMs - clampedTopUpMs) / DAY_MS))
  const topUpFutureValue = topUpApplied
    ? topUpAmount * Math.pow(1 + dailyRate, topUpDaysToUnlock)
    : 0

  // Simulate exact day-by-day compounding across the calendar timeline (including optional top-up)
  const rows: DailyDepositRow[] = [
    {
      step: 0,
      label: 'Upfront (Day 0)',
      dateIso: toIsoDateUtc(startMs),
      dateLabel: formatUtcDate(startMs, true),
      daysSincePrevious: 0,
      daysToUnlock: activeCompoundingDays,
      depositAmount: effectiveUpfront,
      extraTopUpBefore: 0,
      interestEarnedInPeriod: 0,
      lifetimeInterestFromDeposit: upfrontInterest,
      futureValueAtUnlock: fvUpfront,
      closingBalanceAfterDeposit: effectiveUpfront,
      oneNairaBecomes: upfrontGrowthFactor,
      isFinalDeposit: false,
      isReducedAfterTopUp: false,
    },
  ]

  let runningBalance = effectiveUpfront
  let prevEventMs = startMs
  let currentDeposit = scheduledDeposit
  let reducedDepositAfterTopUp = scheduledDeposit
  let topUpProcessed = false
  let totalCashPaid = effectiveUpfront
  let totalInterestEarned = 0
  let reachedTargetEarly = effectiveUpfront >= targetRent && targetRent > 0
  let earlyTargetDateLabel: string | null = reachedTargetEarly ? formatUtcDate(startMs) : null

  for (let i = 0; i < numberOfDeposits; i++) {
    const depMs = depositDatesMs[i]
    const daysToUnlock = daysToUnlockPerStep[i]
    let extraBefore = 0

    // If extra top-up falls between prevEventMs and depMs, compound up to top-up date, credit it, and dynamically recalculate remaining deposits!
    if (topUpApplied && !topUpProcessed && clampedTopUpMs <= depMs) {
      const daysToTopUp = Math.max(0, Math.round((clampedTopUpMs - prevEventMs) / DAY_MS))
      const interestBeforeTopUp = runningBalance * (Math.pow(1 + dailyRate, daysToTopUp) - 1)
      runningBalance += interestBeforeTopUp + topUpAmount
      totalInterestEarned += interestBeforeTopUp
      totalCashPaid += topUpAmount
      extraBefore = topUpAmount
      prevEventMs = clampedTopUpMs
      topUpProcessed = true

      if (!reachedTargetEarly && runningBalance >= targetRent && clampedTopUpMs < unlockMs) {
        reachedTargetEarly = true
        earlyTargetDateLabel = formatUtcDate(clampedTopUpMs)
      }

      // Dynamic daily recalculation for deposits i..n-1
      const fvNow = runningBalance * Math.pow(1 + dailyRate, topUpDaysToUnlock)
      const remGap = Math.max(0, targetRent - fvNow)
      let remFactor = 0
      for (let j = i; j < numberOfDeposits; j++) {
        remFactor += Math.pow(1 + dailyRate, daysToUnlockPerStep[j])
      }
      currentDeposit = remGap > 0 && remFactor > 0 ? Math.ceil(remGap / remFactor) : 0
      reducedDepositAfterTopUp = currentDeposit
    }

    const daysSincePrev = Math.max(0, Math.round((depMs - prevEventMs) / DAY_MS))
    const periodInterest = runningBalance * (Math.pow(1 + dailyRate, daysSincePrev) - 1)
    runningBalance += periodInterest + currentDeposit
    totalInterestEarned += periodInterest
    totalCashPaid += currentDeposit
    prevEventMs = depMs

    if (!reachedTargetEarly && runningBalance >= targetRent && depMs < unlockMs) {
      reachedTargetEarly = true
      earlyTargetDateLabel = formatUtcDate(depMs)
    }

    const factor = Math.pow(1 + dailyRate, daysToUnlock)
    const depFv = currentDeposit * factor
    const depLifetimeInt = depFv - currentDeposit

    rows.push({
      step: i + 1,
      label: i === numberOfDeposits - 1 ? `Deposit #${i + 1} (Final)` : `Deposit #${i + 1}`,
      dateIso: toIsoDateUtc(depMs),
      dateLabel: formatUtcDate(depMs),
      daysSincePrevious: daysSincePrev,
      daysToUnlock,
      depositAmount: currentDeposit,
      extraTopUpBefore: extraBefore,
      interestEarnedInPeriod: periodInterest,
      lifetimeInterestFromDeposit: depLifetimeInt,
      futureValueAtUnlock: depFv,
      closingBalanceAfterDeposit: runningBalance,
      oneNairaBecomes: factor,
      isFinalDeposit: i === numberOfDeposits - 1,
      isReducedAfterTopUp: topUpProcessed && currentDeposit < scheduledDeposit,
    })
  }

  // Handle top-up if placed after the final scheduled deposit (before unlockMs)
  if (topUpApplied && !topUpProcessed) {
    const daysToTopUp = Math.max(0, Math.round((clampedTopUpMs - prevEventMs) / DAY_MS))
    const intBefore = runningBalance * (Math.pow(1 + dailyRate, daysToTopUp) - 1)
    runningBalance += intBefore + topUpAmount
    totalInterestEarned += intBefore
    totalCashPaid += topUpAmount
    prevEventMs = clampedTopUpMs
    topUpProcessed = true
  }

  // Compound remaining days between last event and unlockMs (this is the exact "11th month" / post-final-deposit yield!)
  const finalTailDays = Math.max(0, Math.round((unlockMs - prevEventMs) / DAY_MS))
  let tailInterest = 0
  if (finalTailDays > 0) {
    tailInterest = runningBalance * (Math.pow(1 + dailyRate, finalTailDays) - 1)
    runningBalance += tailInterest
    totalInterestEarned += tailInterest
  }

  const closingBalanceAtUnlock = runningBalance
  const balanceVariance = closingBalanceAtUnlock - targetRent
  const extraInterestIfKeptToUnlock = reachedTargetEarly
    ? Math.max(0, closingBalanceAtUnlock - targetRent)
    : 0
  const depositDropAfterTopUp = Math.max(0, scheduledDeposit - reducedDepositAfterTopUp)
  const effectiveDiscountPct =
    targetRent > 0 ? Math.round((totalInterestEarned / targetRent) * 1000) / 10 : 0

  // Dynamic Catch-Up / Late / Early / Missed Deposit Simulation at checkpoint simDepositIndex
  const safeSimIdx = Math.min(numberOfDeposits, Math.max(1, Math.round(inputs.simDepositIndex || 1)))
  const simScheduledMs = depositDatesMs[safeSimIdx - 1]
  const delayDays = Math.min(35, Math.max(-15, Math.round(inputs.simDelayDays || 0)))
  const rawActualMs = simScheduledMs + delayDays * DAY_MS
  const prevStepMs = safeSimIdx === 1 ? startMs : depositDatesMs[safeSimIdx - 2]
  const actualMs = Math.min(unlockMs, Math.max(prevStepMs, rawActualMs))
  const effectiveDelayDays = Math.round((actualMs - simScheduledMs) / DAY_MS)

  // Compute exact balance on actualMs right BEFORE making deposit #safeSimIdx (assuming deposits 1..safeSimIdx-1 were on schedule)
  let simBal = effectiveUpfront
  let simCursorMs = startMs
  for (let i = 0; i < safeSimIdx - 1; i++) {
    const depMs = depositDatesMs[i]
    const d = Math.max(0, Math.round((depMs - simCursorMs) / DAY_MS))
    simBal = simBal * Math.pow(1 + dailyRate, d) + scheduledDeposit
    simCursorMs = depMs
  }
  const daysToActual = Math.max(0, Math.round((actualMs - simCursorMs) / DAY_MS))
  const balanceOnActualDateBeforeDeposit = simBal * Math.pow(1 + dailyRate, daysToActual)
  const daysToUnlockFromActualDate = Math.max(0, Math.round((unlockMs - actualMs) / DAY_MS))

  // Future value of current balance + future scheduled deposits (safeSimIdx+1 .. n)
  const fvCurrentBalanceAtUnlock =
    balanceOnActualDateBeforeDeposit * Math.pow(1 + dailyRate, daysToUnlockFromActualDate)

  let futureDepositsGrowthSum = 0
  for (let j = safeSimIdx; j < numberOfDeposits; j++) {
    futureDepositsGrowthSum += Math.pow(1 + dailyRate, daysToUnlockPerStep[j])
  }

  const missedFull = Boolean(inputs.simMissedFullDeposit)
  const actualFactor = Math.pow(1 + dailyRate, daysToUnlockFromActualDate)

  // Option A: Keep future monthly deposits unchanged at `scheduledDeposit`, pay `catchUpTodayAmountNaira` today
  const fvRemainingScheduled = scheduledDeposit * futureDepositsGrowthSum
  const gapForToday = Math.max(0, targetRent - fvCurrentBalanceAtUnlock - fvRemainingScheduled)
  const catchUpTodayAmountNaira =
    missedFull
      ? 0
      : gapForToday > 0 && actualFactor > 0
        ? Math.ceil(gapForToday / actualFactor)
        : 0

  // Option B: Spread remaining deficit evenly across today (unless missed) + remaining future deposits
  const spreadDenominator = (missedFull ? 0 : actualFactor) + futureDepositsGrowthSum
  const remainingDepositsCount = (missedFull ? 0 : 1) + (numberOfDeposits - safeSimIdx)
  const totalDeficitNow = Math.max(0, targetRent - fvCurrentBalanceAtUnlock)
  const spreadRemainingDepositNaira =
    totalDeficitNow > 0 && spreadDenominator > 0
      ? Math.ceil(totalDeficitNow / spreadDenominator)
      : 0

  // If user pays original `scheduledDeposit` on `actualMs` (or 0 if missed), what balance do they actually hit?
  const unadjustedDepositMade = missedFull ? 0 : scheduledDeposit
  const unadjustedBalanceAtUnlock =
    fvCurrentBalanceAtUnlock + unadjustedDepositMade * actualFactor + fvRemainingScheduled
  const unadjustedVarianceAtUnlock = unadjustedBalanceAtUnlock - targetRent

  const catchUpDeltaVsScheduledNaira = missedFull
    ? -scheduledDeposit
    : catchUpTodayAmountNaira - scheduledDeposit
  const missedInterestEffectNaira = missedFull
    ? Math.max(0, targetRent - unadjustedBalanceAtUnlock - scheduledDeposit)
    : Math.abs(unadjustedVarianceAtUnlock)

  const dynamicCatchUp: DynamicCatchUpResult = {
    depositIndex: safeSimIdx,
    scheduledDateIso: toIsoDateUtc(simScheduledMs),
    scheduledDateLabel: formatUtcDate(simScheduledMs),
    actualDateIso: toIsoDateUtc(actualMs),
    actualDateLabel: formatUtcDate(actualMs),
    delayDays: effectiveDelayDays,
    missedFullDeposit: missedFull,
    balanceOnActualDateBeforeDeposit,
    scheduledDepositNaira: scheduledDeposit,
    catchUpTodayAmountNaira,
    catchUpDeltaVsScheduledNaira,
    missedInterestEffectNaira,
    spreadRemainingDepositNaira,
    spreadDeltaPerMonthNaira: spreadRemainingDepositNaira - scheduledDeposit,
    remainingDepositsCount,
    daysToUnlockFromActualDate,
    unadjustedBalanceAtUnlock,
    unadjustedVarianceAtUnlock,
  }

  // Direct comparison with Old Monthly Engine (computeSavingsEngine) using identical inputs
  const oldMonthly = computeSavingsEngine({
    targetRentNaira: targetRent,
    planId: inputs.planId,
    startDateIso: toIsoDateUtc(startMs),
    rentDueDateIso: toIsoDateUtc(rentDueMs),
    upfrontDepositNaira: requestedUpfront,
    enableExtraTopUp: false,
    extraTopUpMonth: 4,
    extraTopUpAmountNaira: 0,
    depositDay,
    payFirstMonthOnStartDay,
  })

  // What balance does the old Monthly Engine ACTUALLY yield on these exact calendar dates under daily compounding?
  let oldRealBalance = oldMonthly.effectiveUpfront * Math.pow(1 + dailyRate, activeCompoundingDays)
  for (let i = 0; i < Math.min(oldMonthly.months, depositDatesMs.length); i++) {
    oldRealBalance +=
      oldMonthly.monthlyDeposit * Math.pow(1 + dailyRate, daysToUnlockPerStep[i])
  }

  const comparison: MonthlyVsDailyComparison = {
    monthlyEngineDeposit: oldMonthly.monthlyDeposit,
    dailyEngineDeposit: scheduledDeposit,
    monthlyDepositDelta: scheduledDeposit - oldMonthly.monthlyDeposit,
    monthlyEngineTotalCash: oldMonthly.totalUserContribution,
    dailyEngineTotalCash: totalCashPaid,
    totalCashDelta: totalCashPaid - oldMonthly.totalUserContribution,
    monthlyEngineProjectedInterest: oldMonthly.totalInterestEarned,
    dailyEngineProjectedInterest: totalInterestEarned,
    oldMonthlyRealBalanceAtUnlock: oldRealBalance,
    oldMonthlyRealVariance: oldRealBalance - targetRent,
    dailyRealBalanceAtUnlock: closingBalanceAtUnlock,
    dailyRealVariance: balanceVariance,
  }

  // MoteleJesu's 2-Tenant Proof (Start Day 1 vs Start Day 20 of the same tenancy month)
  const startMonthStartMs = Date.UTC(
    new Date(startMs).getUTCFullYear(),
    new Date(startMs).getUTCMonth(),
    1,
  )
  const tenantAStartMs = startMonthStartMs
  const tenantBStartMs = startMonthStartMs + 19 * DAY_MS // 20th of the same month
  const proofUnlockMs = unlockMs > tenantBStartMs + 30 * DAY_MS ? unlockMs : tenantAStartMs + 335 * DAY_MS
  const proofRentDueMs = proofUnlockMs + 30 * DAY_MS

  const solveForStart = (sMs: number) => {
    const activeDays = Math.max(1, Math.round((proofUnlockMs - sMs) / DAY_MS))
    const depDates = buildScheduledDepositDatesMs({
      startMs: sMs,
      unlockMs: proofUnlockMs,
      depositDay,
      payFirstMonthOnStartDay: false,
      maxDeposits: 11,
    })
    const upFv = effectiveUpfront * Math.pow(1 + dailyRate, activeDays)
    let gSum = 0
    for (const dm of depDates) {
      gSum += Math.pow(1 + dailyRate, Math.max(0, Math.round((proofUnlockMs - dm) / DAY_MS)))
    }
    const pmt = gSum > 0 ? Math.ceil(Math.max(0, targetRent - upFv) / gSum) : 0
    const finalBal = upFv + pmt * gSum
    const oldCalc = computeSavingsEngine({
      targetRentNaira: targetRent,
      planId: inputs.planId,
      startDateIso: toIsoDateUtc(sMs),
      rentDueDateIso: toIsoDateUtc(proofRentDueMs),
      upfrontDepositNaira: effectiveUpfront,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 0,
      depositDay,
      payFirstMonthOnStartDay: false,
    })
    let oldRealBal = effectiveUpfront * Math.pow(1 + dailyRate, activeDays)
    for (let i = 0; i < Math.min(oldCalc.months, depDates.length); i++) {
      oldRealBal +=
        oldCalc.monthlyDeposit *
        Math.pow(1 + dailyRate, Math.max(0, Math.round((proofUnlockMs - depDates[i]) / DAY_MS)))
    }
    return { pmt, finalBal, oldPmt: oldCalc.monthlyDeposit, oldRealBal }
  }

  const tenantA = solveForStart(tenantAStartMs)
  const tenantB = solveForStart(tenantBStartMs)

  const twoTenantProof: TwoTenantDateProof = {
    tenantAStartLabel: formatUtcDate(tenantAStartMs, true),
    tenantBStartLabel: formatUtcDate(tenantBStartMs, true),
    dayDifference: 19,
    oldMonthlyBothDeposit: tenantA.oldPmt,
    tenantAOldRealBalance: tenantA.oldRealBal,
    tenantBOldRealBalance: tenantB.oldRealBal,
    tenantBOldShortfall: tenantB.oldRealBal - targetRent,
    tenantADailyDeposit: tenantA.pmt,
    tenantBDailyDeposit: tenantB.pmt,
    dailyDepositDifference: tenantB.pmt - tenantA.pmt,
    tenantADailyBalance: tenantA.finalBal,
    tenantBDailyBalance: tenantB.finalBal,
  }

  return {
    targetRent,
    planId: inputs.planId,
    annualRatePct,
    annualRateDecimal,
    dailyRate,
    effectiveAnnualYieldPct,
    startDateIso: toIsoDateUtc(startMs),
    startDateLabel: formatUtcDate(startMs, true),
    rentDueDateIso: toIsoDateUtc(rentDueMs),
    rentDueDateLabel: formatUtcDate(rentDueMs, true),
    unlockDateIso: toIsoDateUtc(unlockMs),
    unlockDateLabel: formatUtcDate(unlockMs, true),
    daysUntilRent,
    activeCompoundingDays,
    depositDay,
    payFirstMonthOnStartDay,
    numberOfDeposits,
    isRentProtecEligible,
    minUpfrontPct,
    minUpfrontNaira,
    requestedUpfront,
    effectiveUpfront,
    upfrontClampedToFloor,
    upfrontGrowthFactor,
    fvUpfront,
    upfrontInterest,
    fundingGap,
    dailyGrowthFactor,
    rawDeposit,
    scheduledDeposit,
    plainSplitDeposit,
    depositSavingsFromInterest,
    topUpApplied,
    topUpDateIso: toIsoDateUtc(clampedTopUpMs),
    topUpDateLabel: formatUtcDate(clampedTopUpMs),
    topUpDaysToUnlock,
    topUpAmount,
    topUpFutureValue,
    reducedDepositAfterTopUp,
    depositDropAfterTopUp,
    reachedTargetEarly,
    earlyTargetDateLabel,
    extraInterestIfKeptToUnlock,
    totalUserContribution: totalCashPaid,
    totalInterestEarned,
    effectiveDiscountPct,
    closingBalanceAtUnlock,
    balanceVariance,
    rows,
    dynamicCatchUp,
    comparison,
    twoTenantProof,
  }
}
