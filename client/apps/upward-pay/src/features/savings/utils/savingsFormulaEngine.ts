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

export interface EngineInputs {
  targetRentNaira: number
  planId: EnginePlanId
  months: number // active payment months n (1..11)
  upfrontDepositNaira: number
  enableExtraTopUp: boolean
  extraTopUpMonth: number // 1..n-1
  extraTopUpAmountNaira: number
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

export function computeSavingsEngine(inputs: EngineInputs): EngineCalculationResult {
  const targetRent = Math.max(0, Math.round(inputs.targetRentNaira || 0))
  const plan = ENGINE_PLANS[inputs.planId] ?? ENGINE_PLANS.FULL_LOCK
  const annualRatePct = plan.annualRatePct
  const annualRateDecimal = annualRatePct / 100
  const months = Math.min(11, Math.max(1, Math.round(inputs.months || 1)))

  // T-30 horizon: active saving days = n * 30, days until rent due = n * 30 + 30
  const savingDays = months * 30
  const daysUntilRent = savingDays + 30
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

  // Real-world daily ARM compounding test (r_a / 365 over savingDays)
  const dailyRate = annualRateDecimal / 365
  const calcDailyOutcome = (pmt: number, dayOffsetWithinMonth: number) => {
    let bal = effectiveUpfront * Math.pow(1 + dailyRate, savingDays)
    for (let k = 1; k <= months; k++) {
      const depositDay = 30 * k - dayOffsetWithinMonth
      const daysToCompound = Math.max(0, savingDays - depositDay)
      bal += pmt * Math.pow(1 + dailyRate, daysToCompound)
    }
    return bal
  }

  const paydaySpecs = [
    { label: 'End of Month', dayNote: '28th (Default payday)', offset: 0 },
    { label: 'Mid-Month', dayNote: '15th of each month', offset: 15 },
    { label: 'Start of Month', dayNote: '1st of each month', offset: 30 },
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
  }
}
