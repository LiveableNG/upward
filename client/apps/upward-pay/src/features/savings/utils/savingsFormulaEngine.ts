import { getRentProtecMinimumDepositPct } from '../services/savingsService'

export type EnginePlanId = 'FULL_LOCK' | 'FLEXIBLE' | 'RENT_PROTEC'

export interface EnginePlanConfig {
  id: EnginePlanId
  label: string
  shortLabel: string
  annualRatePct: number
  description: string
  accessNote: string
}

export const ENGINE_PLANS: Record<EnginePlanId, EnginePlanConfig> = {
  FULL_LOCK: {
    id: 'FULL_LOCK',
    label: 'Full Lock (Save & Earn)',
    shortLabel: 'Full Lock',
    annualRatePct: 16,
    description: 'Highest return, locked until 30 days before rent day.',
    accessNote: 'Locked until T-30 unlock',
  },
  FLEXIBLE: {
    id: 'FLEXIBLE',
    label: 'Flexible (Save & Earn)',
    shortLabel: 'Flexible',
    annualRatePct: 12,
    description: 'Earn compound yield with flexible access anytime.',
    accessNote: 'Withdraw anytime, no fee',
  },
  RENT_PROTEC: {
    id: 'RENT_PROTEC',
    label: 'Rent Protec',
    shortLabel: 'Rent Protec',
    annualRatePct: 10,
    description: '10% p.a. compound yield + up to 100% annual rent coverage.',
    accessNote: 'Locked until T-30 · Min 6 mo to rent',
  },
}

export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export interface EngineInputs {
  targetRentNaira: number
  planId: EnginePlanId
  startDateIso: string // YYYY-MM-DD (e.g. '2026-01-17')
  rentDueDateIso: string // YYYY-MM-DD (e.g. '2027-01-01')
  upfrontDepositNaira: number
  enableExtraTopUp: boolean
  extraTopUpMonth: number // 1..n-1
  extraTopUpAmountNaira: number
  // Calendar timing comparison inputs
  depositDay?: number // 1..28 (default 28)
  payFirstMonthOnStartDay?: boolean // default false; true = annuity-due (ChatGPT assumption)
}

export interface CalendarDepositRow {
  step: number // 0 = Day 0 Upfront, 1..n = Monthly Deposits
  label: string
  dateLabel: string
  daysToCompound: number
  upwardDeposit: number
  upwardInterest: number
  upwardFutureValue: number
  delayedDeposit: number
  delayedInterest: number
  delayedFutureValue: number
  isFinalDeposit: boolean
  clampedToUnlock?: boolean
}

export interface CalendarScheduleResult {
  startDateIso: string
  rentDueDateIso: string
  unlockDateIso: string
  startDay: number
  depositDay: number
  payFirstMonthOnStartDay: boolean
  startDateLabel: string
  firstDepositDateLabel: string
  lastDepositDateLabel: string
  unlockDateLabel: string
  rentDueDateLabel: string
  daysUntilRent: number
  activeSavingDays: number
  extraBufferDays: number
  cappedAtMaxMonths: boolean
  lastDepositDaysToCompound: number
  lastDepositEarnsInterest: boolean
  lastDepositUpwardInterest: number
  upwardTotalAtUnlock: number
  upwardVariance: number
  delayedTotalAtUnlock: number
  delayedVariance: number
  rows: CalendarDepositRow[]
}

export interface LedgerRow {
  month: number // 0 = Day 0 Initial
  label: string
  openingBalance: number
  interestEarned: number
  monthlyDeposit: number
  extraTopUp: number
  closingBalance: number
  isTopUpMonth: boolean
  isReducedMonth: boolean
  isUnlockMonth: boolean
}

export interface GrowthFactorRow {
  paymentNumber: number
  monthsToGrow: number
  oneNairaBecomes: number
  extraInterest: number
}

export interface PaydayDailyTestRow {
  label: string
  dayNote: string
  upwardBalance: number
  upwardVariance: number
  delayedModelBalance: number
  delayedModelVariance: number
}

export interface TimingModelComparison {
  upwardMonthly: number
  delayedMonthly: number
  monthlyDifference: number
  upwardBalanceAtUnlock: number
  delayedBalanceAtUnlock: number
  delayedShortfallAtUnlock: number
  delayedExtraMonthInterest: number
  delayedFv0: number
  delayedGrowthFactor: number
  paydayTests: PaydayDailyTestRow[]
}

export interface EngineCalculationResult {
  targetRent: number
  annualRatePct: number
  annualRateDecimal: number
  monthlyRate: number
  months: number
  savingDays: number
  daysUntilRent: number
  isRentProtecEligible: boolean
  minUpfrontPct: number
  minUpfrontNaira: number
  requestedUpfront: number
  effectiveUpfront: number
  upfrontClampedToFloor: boolean
  fvUpfront: number
  upfrontInterest: number
  fundingGap: number
  growthFactor: number
  rawMonthlyDeposit: number
  monthlyDeposit: number
  plainSplitMonthly: number
  monthlySavingsFromInterest: number
  // Top-up results
  topUpApplied: boolean
  topUpMonth: number
  topUpAmount: number
  reducedMonthlyDeposit: number
  monthlyDropAfterTopUp: number
  // Totals (reflecting top-up if active)
  totalUserContribution: number
  totalInterestEarned: number
  interestCoveredOfRent: number
  effectiveDiscountPct: number
  closingBalanceAtUnlock: number
  // Detailed tables
  ledger: LedgerRow[]
  growthFactorBreakdown: GrowthFactorRow[]
  comparison: TimingModelComparison
  calendarSchedule: CalendarScheduleResult
}

export function formatNaira(value: number, showSign = false): string {
  const rounded = Math.round(value)
  const absFormatted = Math.abs(rounded).toLocaleString('en-US')
  if (showSign) {
    if (rounded > 0) return `+₦${absFormatted}`
    if (rounded < 0) return `−₦${absFormatted}`
  }
  return rounded < 0 ? `−₦${absFormatted}` : `₦${absFormatted}`
}

const DAY_MS = 86_400_000

export function parseIsoDateUtc(iso: string, fallbackMs: number): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim())
  if (!m) return fallbackMs
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const ms = Date.UTC(year, month, day)
  return Number.isFinite(ms) ? ms : fallbackMs
}

export function toIsoDateUtc(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDaysToIso(iso: string, days: number): string {
  const base = parseIsoDateUtc(iso, Date.UTC(2026, 0, 17))
  return toIsoDateUtc(base + days * DAY_MS)
}

export function addMonthsToIso(iso: string, deltaMonths: number): string {
  const base = parseIsoDateUtc(iso, Date.UTC(2026, 0, 17))
  const d = new Date(base)
  const targetYear = d.getUTCFullYear()
  const targetMonth = d.getUTCMonth() + deltaMonths
  const origDay = d.getUTCDate()
  // Clamp to last day of target month (e.g., Jan 31 + 1m -> Feb 28)
  const lastDayOfTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return toIsoDateUtc(Date.UTC(targetYear, targetMonth, Math.min(origDay, lastDayOfTarget)))
}

function formatUtcDate(ms: number, includeYear = false): string {
  const d = new Date(ms)
  const base = `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`
  return includeYear ? `${base}, ${d.getUTCFullYear()}` : base
}

export function computeSavingsEngine(inputs: EngineInputs): EngineCalculationResult {
  const targetRent = Math.max(0, Math.round(inputs.targetRentNaira || 0))
  const plan = ENGINE_PLANS[inputs.planId] ?? ENGINE_PLANS.FULL_LOCK
  const annualRatePct = plan.annualRatePct
  const annualRateDecimal = annualRatePct / 100

  // Exact date-driven duration matching RentSavingsCalculatorEngine.simulate():
  // unlockDate = rentDueDate - 30 days
  // activeSavingDays = max(1, daysUntilRent - 30)
  // n = clamp(floor(activeSavingDays / 30), 1, 11)
  const defaultStartMs = Date.UTC(2026, 0, 17)
  const defaultRentMs = Date.UTC(2027, 0, 1)
  const startMs = parseIsoDateUtc(inputs.startDateIso, defaultStartMs)
  const rawRentMs = parseIsoDateUtc(inputs.rentDueDateIso, defaultRentMs)
  const rentDueMs = rawRentMs > startMs + 30 * DAY_MS ? rawRentMs : startMs + 60 * DAY_MS
  const unlockMs = rentDueMs - 30 * DAY_MS

  const daysUntilRent = Math.max(1, Math.round((rentDueMs - startMs) / DAY_MS))
  const savingDays = Math.max(1, daysUntilRent - 30)
  const rawMonths = Math.max(1, Math.floor(savingDays / 30))
  const cappedAtMaxMonths = rawMonths > 11
  const months = Math.min(11, rawMonths)
  const extraBufferDays = Math.max(0, savingDays - months * 30)
  const isRentProtecEligible = daysUntilRent >= 6 * 28 // matches RentSavingsCalculatorEngine

  // Effective monthly compound rate: I = (1 + r_a)^(1/12) - 1
  const monthlyRate = Math.pow(1 + annualRateDecimal, 1 / 12) - 1

  // Rent Protec breakeven upfront floor
  const minUpfrontPct =
    inputs.planId === 'RENT_PROTEC' ? getRentProtecMinimumDepositPct(daysUntilRent) : 0
  const minUpfrontNaira =
    inputs.planId === 'RENT_PROTEC' ? Math.round(targetRent * (minUpfrontPct / 100)) : 0

  const requestedUpfront = Math.max(0, Math.min(targetRent, Math.round(inputs.upfrontDepositNaira || 0)))
  const effectiveUpfront =
    inputs.planId === 'RENT_PROTEC'
      ? Math.min(targetRent, Math.max(requestedUpfront, minUpfrontNaira))
      : requestedUpfront
  const upfrontClampedToFloor =
    inputs.planId === 'RENT_PROTEC' && requestedUpfront < minUpfrontNaira

  // Step 2: Future value of upfront deposit over n months
  const fvUpfront = effectiveUpfront * Math.pow(1 + monthlyRate, months)
  const upfrontInterest = Math.max(0, fvUpfront - effectiveUpfront)

  // Step 3: Remaining funding gap
  const fundingGap = Math.max(0, targetRent - fvUpfront)

  // Step 4: Ordinary annuity growth factor F = sum_{k=1..n} (1 + I)^(n - k)
  const growthFactorBreakdown: GrowthFactorRow[] = []
  let growthFactor = 0
  for (let k = 1; k <= months; k++) {
    const monthsToGrow = months - k
    const oneNairaBecomes = Math.pow(1 + monthlyRate, monthsToGrow)
    growthFactor += oneNairaBecomes
    growthFactorBreakdown.push({
      paymentNumber: k,
      monthsToGrow,
      oneNairaBecomes,
      extraInterest: oneNairaBecomes - 1,
    })
  }

  // Step 5: Fixed monthly deposit rounded up
  const rawMonthlyDeposit = fundingGap > 0 && growthFactor > 0 ? fundingGap / growthFactor : 0
  const monthlyDeposit = rawMonthlyDeposit > 0 ? Math.ceil(rawMonthlyDeposit) : 0
  const plainSplitMonthly = fundingGap > 0 ? Math.ceil(fundingGap / months) : 0
  const monthlySavingsFromInterest = Math.max(0, plainSplitMonthly - monthlyDeposit)

  // Extra top-up simulation
  const topUpMonth = Math.min(Math.max(1, months - 1), Math.max(1, Math.round(inputs.extraTopUpMonth || 1)))
  const topUpAmount = Math.max(0, Math.round(inputs.extraTopUpAmountNaira || 0))
  const topUpApplied = Boolean(inputs.enableExtraTopUp && topUpAmount > 0 && months > 1 && monthlyDeposit > 0)

  // Build month-by-month ledger (with optional mid-plan extra top-up recalculation)
  const ledger: LedgerRow[] = [
    {
      month: 0,
      label: 'Initial (Day 0)',
      openingBalance: 0,
      interestEarned: 0,
      monthlyDeposit: effectiveUpfront,
      extraTopUp: 0,
      closingBalance: effectiveUpfront,
      isTopUpMonth: false,
      isReducedMonth: false,
      isUnlockMonth: false,
    },
  ]

  let runningBalance = effectiveUpfront
  let activeMonthly = monthlyDeposit
  let reducedMonthlyDeposit = monthlyDeposit
  let totalInterestEarned = 0
  let totalCashPaid = effectiveUpfront

  for (let m = 1; m <= months; m++) {
    const openingBalance = runningBalance
    const interestEarned = openingBalance * monthlyRate
    const isTopUpMonth = topUpApplied && m === topUpMonth
    const extraHere = isTopUpMonth ? topUpAmount : 0
    const depositThisMonth = activeMonthly

    const closingBalance = openingBalance + interestEarned + depositThisMonth + extraHere
    totalInterestEarned += interestEarned
    totalCashPaid += depositThisMonth + extraHere

    ledger.push({
      month: m,
      label: m === months ? `Month ${m} (Unlock)` : `Month ${m}`,
      openingBalance,
      interestEarned,
      monthlyDeposit: depositThisMonth,
      extraTopUp: extraHere,
      closingBalance,
      isTopUpMonth,
      isReducedMonth: topUpApplied && m > topUpMonth && activeMonthly < monthlyDeposit,
      isUnlockMonth: m === months,
    })

    runningBalance = closingBalance

    // After an Extra Top-Up completes the month, recompute remaining months (capped at original M)
    if (isTopUpMonth && m < months) {
      const remainingMonths = months - m
      if (runningBalance >= targetRent) {
        activeMonthly = 0
      } else {
        const fvNow = runningBalance * Math.pow(1 + monthlyRate, remainingMonths)
        const remainingGap = Math.max(0, targetRent - fvNow)
        let remFactor = 0
        for (let j = 1; j <= remainingMonths; j++) {
          remFactor += Math.pow(1 + monthlyRate, remainingMonths - j)
        }
        const recomputed = remainingGap > 0 && remFactor > 0 ? Math.ceil(remainingGap / remFactor) : 0
        activeMonthly = Math.min(monthlyDeposit, recomputed)
      }
      reducedMonthlyDeposit = activeMonthly
    }
  }

  const monthlyDropAfterTopUp = Math.max(0, monthlyDeposit - reducedMonthlyDeposit)
  const closingBalanceAtUnlock = runningBalance
  const interestCoveredOfRent = Math.max(0, targetRent - totalCashPaid)
  const effectiveDiscountPct =
    targetRent > 0 ? Math.round((interestCoveredOfRent / targetRent) * 1000) / 10 : 0

  // Timing model comparison: Standard Unlock (Month n) vs. Delayed-Unlock (+1 Idle Month)
  const delayedFv0 = effectiveUpfront * Math.pow(1 + monthlyRate, months + 1)
  const delayedGap = Math.max(0, targetRent - delayedFv0)
  const delayedGrowthFactor = (1 + monthlyRate) * growthFactor
  const delayedMonthly =
    delayedGap > 0 && delayedGrowthFactor > 0 ? Math.ceil(delayedGap / delayedGrowthFactor) : 0

  const upwardBalanceAtUnlock = effectiveUpfront * Math.pow(1 + monthlyRate, months) + monthlyDeposit * growthFactor
  const delayedBalanceAtUnlock =
    effectiveUpfront * Math.pow(1 + monthlyRate, months) + delayedMonthly * growthFactor
  const delayedShortfallAtUnlock = Math.max(0, targetRent - delayedBalanceAtUnlock)
  const delayedExtraMonthInterest = delayedBalanceAtUnlock * monthlyRate

  // Exact effective daily rate consistent with effective monthly rate I = (1 + r_a)^(1/12) - 1
  const dailyRate = Math.pow(1 + annualRateDecimal, 1 / 365) - 1
  const calcDailyOutcome = (pmt: number, dayOffsetWithinMonth: number) => {
    const horizonDays = months * (365 / 12)
    let bal = effectiveUpfront * Math.pow(1 + dailyRate, horizonDays)
    for (let k = 1; k <= months; k++) {
      const depositDayInPlan = (365 / 12) * k - dayOffsetWithinMonth
      const daysToCompound = Math.max(0, horizonDays - depositDayInPlan)
      bal += pmt * Math.pow(1 + dailyRate, daysToCompound)
    }
    return bal
  }

  const paydaySpecs = [
    { label: 'Same Day / End of Month', dayNote: '0 days left on final deposit', offset: 0 },
    { label: 'Mid-Cycle (15 days early)', dayNote: '15 days left on final deposit', offset: 15 },
    { label: 'Pay Month 1 on Day 0', dayNote: '30 days left (ChatGPT assumption)', offset: 365 / 12 },
  ]

  const paydayTests: PaydayDailyTestRow[] = paydaySpecs.map((spec) => {
    const upwardBalance = calcDailyOutcome(monthlyDeposit, spec.offset)
    const delayedModelBalance = calcDailyOutcome(delayedMonthly, spec.offset)
    return {
      label: spec.label,
      dayNote: spec.dayNote,
      upwardBalance,
      upwardVariance: upwardBalance - targetRent,
      delayedModelBalance,
      delayedModelVariance: delayedModelBalance - targetRent,
    }
  })

  // Exact calendar-date simulator using Start Date, Rent Due Date, Unlock Date (T-30), and Monthly Deposit Day
  const startDateObj = new Date(startMs)
  const startYear = startDateObj.getUTCFullYear()
  const startMonth = startDateObj.getUTCMonth()
  const startDay = startDateObj.getUTCDate()
  const depositDay = Math.min(28, Math.max(1, Math.round(inputs.depositDay ?? 28)))
  const payFirstMonthOnStartDay = Boolean(inputs.payFirstMonthOnStartDay)

  const effectiveCompoundingHorizonMs = cappedAtMaxMonths
    ? startMs + months * 30 * DAY_MS
    : unlockMs
  const effectiveHorizonDays = Math.max(
    1,
    Math.round((effectiveCompoundingHorizonMs - startMs) / DAY_MS),
  )

  const upfrontFactor = Math.pow(1 + dailyRate, effectiveHorizonDays)
  const upfrontFv = effectiveUpfront * upfrontFactor
  const calendarRows: CalendarDepositRow[] = [
    {
      step: 0,
      label: 'Upfront (Day 0)',
      dateLabel: formatUtcDate(startMs, true),
      daysToCompound: effectiveHorizonDays,
      upwardDeposit: effectiveUpfront,
      upwardInterest: upfrontFv - effectiveUpfront,
      upwardFutureValue: upfrontFv,
      delayedDeposit: effectiveUpfront,
      delayedInterest: upfrontFv - effectiveUpfront,
      delayedFutureValue: upfrontFv,
      isFinalDeposit: false,
    },
  ]

  let calUpwardTotal = upfrontFv
  let calDelayedTotal = upfrontFv
  let firstDepositDateLabel = formatUtcDate(startMs)
  let lastDepositDateLabel = formatUtcDate(effectiveCompoundingHorizonMs)
  let lastDepositDaysToCompound = 0
  let lastDepositUpwardInterest = 0

  // Determine the month offset for Deposit #1:
  // - If paying Month 1 on Day 0 (annuity-due / ChatGPT assumption): Deposit #k lands on startMonth + (k - 1), same day as start.
  // - Otherwise, Deposit #1 is the first occurrence of depositDay strictly AFTER startMs:
  //   - If depositDay > startDay (e.g. start Jan 17, pay 28th) -> Deposit #1 is Jan 28 (monthOffset = 0).
  //   - If depositDay <= startDay (e.g. start Jan 1 & pay 1st, OR start Jan 17 & pay 17th/1st) -> Deposit #1 is next month (monthOffset = 1).
  const firstMonthOffset = payFirstMonthOnStartDay ? 0 : depositDay > startDay ? 0 : 1
  const effectivePayDay = payFirstMonthOnStartDay ? Math.min(28, startDay) : depositDay

  for (let k = 1; k <= months; k++) {
    const rawDepMs = Date.UTC(startYear, startMonth + firstMonthOffset + (k - 1), effectivePayDay)
    const clampedToUnlock = rawDepMs > effectiveCompoundingHorizonMs
    const depMs = clampedToUnlock ? effectiveCompoundingHorizonMs : rawDepMs
    const daysToCompound = Math.max(
      0,
      Math.round((effectiveCompoundingHorizonMs - depMs) / DAY_MS),
    )
    const factor = Math.pow(1 + dailyRate, daysToCompound)
    const upFv = monthlyDeposit * factor
    const delFv = delayedMonthly * factor
    const upInt = upFv - monthlyDeposit
    const delInt = delFv - delayedMonthly
    const dateLabel = formatUtcDate(depMs)

    calUpwardTotal += upFv
    calDelayedTotal += delFv

    if (k === 1) firstDepositDateLabel = dateLabel
    if (k === months) {
      lastDepositDateLabel = dateLabel
      lastDepositDaysToCompound = daysToCompound
      lastDepositUpwardInterest = upInt
    }

    calendarRows.push({
      step: k,
      label: k === months ? `Deposit #${k} (Final)` : `Deposit #${k}`,
      dateLabel: clampedToUnlock ? `${dateLabel} (by unlock)` : dateLabel,
      daysToCompound,
      upwardDeposit: monthlyDeposit,
      upwardInterest: upInt,
      upwardFutureValue: upFv,
      delayedDeposit: delayedMonthly,
      delayedInterest: delInt,
      delayedFutureValue: delFv,
      isFinalDeposit: k === months,
      clampedToUnlock,
    })
  }

  const calendarSchedule: CalendarScheduleResult = {
    startDateIso: toIsoDateUtc(startMs),
    rentDueDateIso: toIsoDateUtc(rentDueMs),
    unlockDateIso: toIsoDateUtc(unlockMs),
    startDay,
    depositDay: effectivePayDay,
    payFirstMonthOnStartDay,
    startDateLabel: formatUtcDate(startMs, true),
    firstDepositDateLabel,
    lastDepositDateLabel,
    unlockDateLabel: formatUtcDate(unlockMs, true),
    rentDueDateLabel: formatUtcDate(rentDueMs, true),
    daysUntilRent,
    activeSavingDays: savingDays,
    extraBufferDays,
    cappedAtMaxMonths,
    lastDepositDaysToCompound,
    lastDepositEarnsInterest: lastDepositDaysToCompound > 0,
    lastDepositUpwardInterest,
    upwardTotalAtUnlock: calUpwardTotal,
    upwardVariance: calUpwardTotal - targetRent,
    delayedTotalAtUnlock: calDelayedTotal,
    delayedVariance: calDelayedTotal - targetRent,
    rows: calendarRows,
  }

  return {
    targetRent,
    annualRatePct,
    annualRateDecimal,
    monthlyRate,
    months,
    savingDays,
    daysUntilRent,
    isRentProtecEligible,
    minUpfrontPct,
    minUpfrontNaira,
    requestedUpfront,
    effectiveUpfront,
    upfrontClampedToFloor,
    fvUpfront,
    upfrontInterest,
    fundingGap,
    growthFactor,
    rawMonthlyDeposit,
    monthlyDeposit,
    plainSplitMonthly,
    monthlySavingsFromInterest,
    topUpApplied,
    topUpMonth,
    topUpAmount,
    reducedMonthlyDeposit,
    monthlyDropAfterTopUp,
    totalUserContribution: totalCashPaid,
    totalInterestEarned,
    interestCoveredOfRent,
    effectiveDiscountPct,
    closingBalanceAtUnlock,
    ledger,
    growthFactorBreakdown,
    comparison: {
      upwardMonthly: monthlyDeposit,
      delayedMonthly,
      monthlyDifference: Math.max(0, monthlyDeposit - delayedMonthly),
      upwardBalanceAtUnlock,
      delayedBalanceAtUnlock,
      delayedShortfallAtUnlock,
      delayedExtraMonthInterest,
      delayedFv0,
      delayedGrowthFactor,
      paydayTests,
    },
    calendarSchedule,
  }
}
