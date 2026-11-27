'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  GitCompare,
  Info,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Table2,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import {
  ENGINE_PLANS,
  computeSavingsEngine,
  formatNaira,
  type EnginePlanId,
} from '../utils/savingsFormulaEngine'
import '../styles/savings-engine.css'

const engineFormSchema = z.object({
  targetRentNaira: z.coerce.number().min(100_000, 'Minimum rent is ₦100,000').max(50_000_000, 'Maximum rent is ₦50,000,000'),
  planId: z.enum(['FULL_LOCK', 'FLEXIBLE', 'RENT_PROTEC']),
  months: z.coerce.number().min(1).max(11),
  upfrontDepositNaira: z.coerce.number().min(0),
  enableExtraTopUp: z.boolean(),
  extraTopUpMonth: z.coerce.number().min(1).max(10),
  extraTopUpAmountNaira: z.coerce.number().min(0).max(50_000_000),
})

type EngineFormValues = z.infer<typeof engineFormSchema>

interface PresetScenario {
  id: string
  label: string
  values: EngineFormValues
}

const PRESETS: PresetScenario[] = [
  {
    id: 'meeting-example',
    label: '₦4M · Full Lock · 10 mo',
    values: {
      targetRentNaira: 4_000_000,
      planId: 'FULL_LOCK',
      months: 10,
      upfrontDepositNaira: 1_200_000,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 200_000,
    },
  },
  {
    id: 'zero-upfront',
    label: '₦2M · ₦0 Upfront',
    values: {
      targetRentNaira: 2_000_000,
      planId: 'FULL_LOCK',
      months: 10,
      upfrontDepositNaira: 0,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 150_000,
    },
  },
  {
    id: 'rent-protec-10',
    label: '₦2M · Rent Protec (10 mo)',
    values: {
      targetRentNaira: 2_000_000,
      planId: 'RENT_PROTEC',
      months: 10,
      upfrontDepositNaira: 400_000,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 150_000,
    },
  },
  {
    id: 'rent-protec-6',
    label: '₦3M · Rent Protec (6 mo)',
    values: {
      targetRentNaira: 3_000_000,
      planId: 'RENT_PROTEC',
      months: 5,
      upfrontDepositNaira: 990_000,
      enableExtraTopUp: false,
      extraTopUpMonth: 2,
      extraTopUpAmountNaira: 200_000,
    },
  },
  {
    id: 'flexible-8',
    label: '₦2.5M · Flexible (8 mo)',
    values: {
      targetRentNaira: 2_500_000,
      planId: 'FLEXIBLE',
      months: 8,
      upfrontDepositNaira: 500_000,
      enableExtraTopUp: false,
      extraTopUpMonth: 3,
      extraTopUpAmountNaira: 200_000,
    },
  },
]

type SymbolKey = 'M' | 'R' | 'ra' | 'I' | 'n' | 'D' | 'FV0' | 'G' | 'F'

const SYMBOL_ORDER: Array<{ key: SymbolKey; label: string }> = [
  { key: 'M', label: 'M' },
  { key: 'R', label: 'R' },
  { key: 'ra', label: 'rₐ' },
  { key: 'I', label: 'I' },
  { key: 'n', label: 'n' },
  { key: 'D', label: 'D' },
  { key: 'FV0', label: 'FV₀' },
  { key: 'G', label: 'G' },
  { key: 'F', label: 'F' },
]

export function SavingsFormulaEnginePage() {
  const [activePresetId, setActivePresetId] = useState<string>('meeting-example')
  const [formulaView, setFormulaView] = useState<'symbols' | 'numbers'>('symbols')
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolKey>('I')
  const [ledgerTab, setLedgerTab] = useState<'ledger' | 'factor'>('ledger')
  const [showComparison, setShowComparison] = useState<boolean>(true)

  const {
    register,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EngineFormValues>({
    resolver: zodResolver(engineFormSchema),
    defaultValues: PRESETS[0].values,
    mode: 'onChange',
  })

  const watched = useWatch({ control })

  const calc = useMemo(() => {
    return computeSavingsEngine({
      targetRentNaira: Number(watched.targetRentNaira) || 0,
      planId: (watched.planId as EnginePlanId) || 'FULL_LOCK',
      months: Number(watched.months) || 10,
      upfrontDepositNaira: Number(watched.upfrontDepositNaira) || 0,
      enableExtraTopUp: Boolean(watched.enableExtraTopUp),
      extraTopUpMonth: Number(watched.extraTopUpMonth) || 4,
      extraTopUpAmountNaira: Number(watched.extraTopUpAmountNaira) || 0,
    })
  }, [watched])

  const handleApplyPreset = (preset: PresetScenario) => {
    setActivePresetId(preset.id)
    reset(preset.values)
  }

  const handlePlanSelect = (planId: EnginePlanId) => {
    setActivePresetId('')
    setValue('planId', planId, { shouldValidate: true })
  }

  const handleUpfrontPctChip = (pct: number) => {
    setActivePresetId('')
    const amount = Math.round((calc.targetRent * pct) / 100)
    setValue('upfrontDepositNaira', amount, { shouldValidate: true })
  }

  const symbolDetails: Record<
    SymbolKey,
    { name: string; liveValue: string; equation: string; explanation: string }
  > = {
    M: {
      name: 'Fixed Monthly Deposit',
      liveValue: `${formatNaira(calc.monthlyDeposit)} / month`,
      equation: `M = ceil(G / F) = ceil(${formatNaira(calc.fundingGap)} / ${calc.growthFactor.toFixed(4)}) = ${formatNaira(calc.monthlyDeposit)}`,
      explanation:
        'The fixed monthly deposit required so your upfront deposit, monthly deposits, and compound interest hit 100% of target rent at unlock. Rounded up (ceil) so fractional naira never cause a shortfall.',
    },
    R: {
      name: 'Target Annual Rent',
      liveValue: formatNaira(calc.targetRent),
      equation: `R = ${formatNaira(calc.targetRent)} (User Input)`,
      explanation:
        'The exact rent amount needed in your vault on unlock day (30 days before your landlord due date).',
    },
    ra: {
      name: 'Annual Net Yield Rate',
      liveValue: `${calc.annualRatePct}% p.a. (${calc.annualRateDecimal.toFixed(2)})`,
      equation: `r_a = ${calc.annualRateDecimal.toFixed(2)} (${ENGINE_PLANS[(watched.planId as EnginePlanId) || 'FULL_LOCK'].shortLabel})`,
      explanation:
        'The effective annual compound rate credited to 100% of your vault balance with zero fee deductions: 16% Full Lock, 12% Flexible, or 10% Rent Protec.',
    },
    I: {
      name: 'Effective Monthly Interest Rate',
      liveValue: `${(calc.monthlyRate * 100).toFixed(4)}% / month`,
      equation: `I = (1 + ${calc.annualRateDecimal.toFixed(2)})^(1/12) - 1 = ${calc.monthlyRate.toFixed(6)}`,
      explanation: `Derived from (1 + I)^12 = 1 + r_a so compounding 12 times reproduces exactly ${calc.annualRatePct}%. Dividing ${calc.annualRatePct}% by 12 would overstate the annual return.`,
    },
    n: {
      name: 'Active Payment Months (T-30 Rule)',
      liveValue: `${calc.months} months (${calc.savingDays} saving days)`,
      equation: `n = min(11, floor((${calc.daysUntilRent} days - 30) / 30)) = ${calc.months}`,
      explanation:
        'Vaults unlock 30 days before rent day so funds are ready for the landlord. Active saving is capped at 11 months.',
    },
    D: {
      name: 'Upfront (Initial) Deposit',
      liveValue: formatNaira(calc.effectiveUpfront),
      equation:
        watched.planId === 'RENT_PROTEC'
          ? `p_min = clamp((2 * 2.15%) / (6.55% * ${calc.daysUntilRent}/365) - 1, 20%, 45%) = ${calc.minUpfrontPct}% -> min ${formatNaira(calc.minUpfrontNaira)}`
          : `D = ${formatNaira(calc.effectiveUpfront)} (Day 0 lump sum)`,
      explanation:
        watched.planId === 'RENT_PROTEC'
          ? 'Deposited on Day 0. Rent Protec enforces a breakeven minimum upfront floor (20%–45% depending on days to rent) so rent insurance activates immediately.'
          : 'Lump sum deposited on Day 0. Because it compounds across every saving month, a larger upfront deposit sharply lowers your monthly payment.',
    },
    FV0: {
      name: 'Future Value of Upfront Deposit',
      liveValue: formatNaira(calc.fvUpfront),
      equation: `FV_0 = ${formatNaira(calc.effectiveUpfront)} * (1 + ${calc.monthlyRate.toFixed(6)})^${calc.months} = ${formatNaira(calc.fvUpfront)}`,
      explanation: `Your Day 0 deposit grows by +${formatNaira(calc.upfrontInterest)} of compound interest over ${calc.months} months before unlock.`,
    },
    G: {
      name: 'Remaining Funding Gap',
      liveValue: formatNaira(calc.fundingGap),
      equation: `G = max(0, ${formatNaira(calc.targetRent)} - ${formatNaira(calc.fvUpfront)}) = ${formatNaira(calc.fundingGap)}`,
      explanation:
        'The portion of your rent still to be funded by your monthly deposits and the compound interest those monthly deposits earn.',
    },
    F: {
      name: 'Annuity Growth Factor',
      liveValue: calc.growthFactor.toFixed(4),
      equation: `F = ((1 + ${calc.monthlyRate.toFixed(6)})^${calc.months} - 1) / ${calc.monthlyRate.toFixed(6)} = ${calc.growthFactor.toFixed(4)}`,
      explanation: `Total future value of saving ₦1 at the end of each of the ${calc.months} months (${calc.months} payments + ${(calc.growthFactor - calc.months).toFixed(3)} of compound interest). Dividing G by F instead of ${calc.months} saves you ${formatNaira(calc.monthlySavingsFromInterest)}/mo.`,
    },
  }

  const activeSym = symbolDetails[selectedSymbol]

  // Composition bar percentages
  const safeDenom = Math.max(1, calc.closingBalanceAtUnlock)
  const upfrontPctBar = (calc.effectiveUpfront / safeDenom) * 100
  const monthlyCash = Math.max(0, calc.totalUserContribution - calc.effectiveUpfront)
  const monthlyPctBar = (monthlyCash / safeDenom) * 100
  const interestPctBar = Math.max(0, 100 - upfrontPctBar - monthlyPctBar)

  return (
    <div className="savings-engine">
      {/* Top Bar */}
      <header className="savings-engine__topbar">
        <div className="savings-engine__topbar-inner">
          <Link href="/" className="savings-engine__brand">
            <UpwardLogo size={26} color="var(--clay)" />
            <span className="savings-engine__brand-name">Upward</span>
            <span className="savings-engine__brand-tag">Savings Formula Engine</span>
          </Link>

          <div className="savings-engine__topbar-actions">
            <button
              type="button"
              className="savings-engine__btn savings-engine__btn--ghost"
              onClick={() => handleApplyPreset(PRESETS[0])}
            >
              <RotateCcw size={14} />
              <span>Reset Example</span>
            </button>
            <Link
              href="/dashboard/savings"
              className="savings-engine__btn savings-engine__btn--primary"
            >
              <span>Open Rent Savings</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main className="savings-engine__container">
        {/* Hero */}
        <section className="savings-engine__hero">
          <h1 className="savings-engine__title">Interactive Rent Savings Formula Engine</h1>
          <p className="savings-engine__subtitle">
            Play with rent, plan rate, saving months, upfront deposit, and extra top-ups to see
            exactly how every symbol in Upward&rsquo;s formula calculates your fixed monthly deposit.
          </p>

          <div className="savings-engine__presets">
            <span className="savings-engine__presets-label">Try a preset:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`savings-engine__preset-chip ${
                  activePresetId === preset.id ? 'savings-engine__preset-chip--active' : ''
                }`}
                onClick={() => handleApplyPreset(preset)}
              >
                <Sparkles size={12} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Main Workspace */}
        <div className="savings-engine__workspace">
          {/* LEFT: Interactive Inputs */}
          <section className="savings-engine__card savings-engine__card--sticky">
            <div className="savings-engine__card-header">
              <div className="savings-engine__card-title">
                <span className="savings-engine__card-icon">
                  <Sliders size={16} />
                </span>
                <span>Formula Inputs</span>
              </div>
              <span className="savings-engine__badge savings-engine__badge--clay">Live Sync</span>
            </div>

            <form onSubmit={(e) => e.preventDefault()} noValidate>
              {/* Target Rent R */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-head">
                  <label className="savings-engine__label" htmlFor="targetRentNaira">
                    <span className="savings-engine__sym-tag">R</span>
                    <span>Target Annual Rent</span>
                  </label>
                  <span className="savings-engine__value-badge">
                    {formatNaira(calc.targetRent)}
                  </span>
                </div>
                <div className="savings-engine__input-wrap">
                  <span className="savings-engine__input-prefix">₦</span>
                  <input
                    id="targetRentNaira"
                    type="number"
                    step={50_000}
                    min={100_000}
                    max={50_000_000}
                    className={`savings-engine__input ${
                      errors.targetRentNaira ? 'savings-engine__input--error' : ''
                    }`}
                    {...register('targetRentNaira', {
                      onChange: () => setActivePresetId(''),
                    })}
                  />
                </div>
                {errors.targetRentNaira && (
                  <p className="savings-engine__error">{errors.targetRentNaira.message}</p>
                )}
                <input
                  type="range"
                  className="savings-engine__slider"
                  min={500_000}
                  max={15_000_000}
                  step={100_000}
                  value={Math.min(15_000_000, Math.max(500_000, calc.targetRent))}
                  onChange={(e) => {
                    setActivePresetId('')
                    setValue('targetRentNaira', Number(e.target.value), { shouldValidate: true })
                  }}
                />
                <div className="savings-engine__slider-scale">
                  <span>₦500k</span>
                  <span>₦5M</span>
                  <span>₦10M</span>
                  <span>₦15M</span>
                </div>
              </div>

              {/* Savings Plan r_a */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-head">
                  <span className="savings-engine__label">
                    <span className="savings-engine__sym-tag">rₐ</span>
                    <span>Savings Plan &amp; Yearly Rate</span>
                  </span>
                  <span className="savings-engine__value-badge">
                    I = {(calc.monthlyRate * 100).toFixed(4)}%/mo
                  </span>
                </div>
                <div className="savings-engine__plan-grid">
                  {(['FULL_LOCK', 'FLEXIBLE', 'RENT_PROTEC'] as EnginePlanId[]).map((pid) => {
                    const plan = ENGINE_PLANS[pid]
                    const isSelected = watched.planId === pid
                    return (
                      <button
                        key={pid}
                        type="button"
                        className={`savings-engine__plan-btn ${
                          isSelected ? 'savings-engine__plan-btn--active' : ''
                        }`}
                        onClick={() => handlePlanSelect(pid)}
                      >
                        <div className="savings-engine__plan-rate">{plan.annualRatePct}%</div>
                        <div className="savings-engine__plan-name">{plan.shortLabel}</div>
                      </button>
                    )
                  })}
                </div>
                <div className="savings-engine__hint">
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    {ENGINE_PLANS[(watched.planId as EnginePlanId) || 'FULL_LOCK'].description}
                  </span>
                </div>
              </div>

              {/* Active Months n */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-head">
                  <label className="savings-engine__label" htmlFor="months">
                    <span className="savings-engine__sym-tag">n</span>
                    <span>Active Payment Months</span>
                  </label>
                  <span className="savings-engine__value-badge">
                    {calc.months} {calc.months === 1 ? 'month' : 'months'}
                  </span>
                </div>
                <input
                  id="months"
                  type="range"
                  className="savings-engine__slider"
                  min={1}
                  max={11}
                  step={1}
                  value={calc.months}
                  onChange={(e) => {
                    setActivePresetId('')
                    const nextMonths = Number(e.target.value)
                    setValue('months', nextMonths, { shouldValidate: true })
                    if ((Number(watched.extraTopUpMonth) || 1) >= nextMonths) {
                      setValue('extraTopUpMonth', Math.max(1, nextMonths - 1))
                    }
                  }}
                />
                <div className="savings-engine__slider-scale">
                  <span>1 mo</span>
                  <span>6 mo</span>
                  <span>10 mo</span>
                  <span>11 mo max</span>
                </div>
                <div className="savings-engine__hint">
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    T&minus;30 Rule: Rent due in <strong>~{calc.daysUntilRent} days</strong>{' '}
                    &rarr; unlocks 30 days early ({calc.savingDays} active saving days) &rarr;{' '}
                    <strong>n = {calc.months}</strong>.
                  </span>
                </div>
                {watched.planId === 'RENT_PROTEC' && !calc.isRentProtecEligible && (
                  <div className="savings-engine__hint savings-engine__hint--warn">
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Rent Protec requires at least 6 months before rent due date (n &ge; 5 active
                      months).
                    </span>
                  </div>
                )}
              </div>

              {/* Upfront Deposit D */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-head">
                  <label className="savings-engine__label" htmlFor="upfrontDepositNaira">
                    <span className="savings-engine__sym-tag">D</span>
                    <span>Upfront Deposit (Day 0)</span>
                  </label>
                  <span className="savings-engine__value-badge">
                    {calc.targetRent > 0
                      ? `${Math.round((calc.effectiveUpfront / calc.targetRent) * 100)}% of rent`
                      : '0%'}
                  </span>
                </div>
                <div className="savings-engine__input-wrap">
                  <span className="savings-engine__input-prefix">₦</span>
                  <input
                    id="upfrontDepositNaira"
                    type="number"
                    step={50_000}
                    min={0}
                    max={calc.targetRent}
                    className="savings-engine__input"
                    {...register('upfrontDepositNaira', {
                      onChange: () => setActivePresetId(''),
                    })}
                  />
                </div>
                <div className="savings-engine__chip-row">
                  {[0, 20, 30, 40, 50].map((pct) => {
                    const isDisabled =
                      watched.planId === 'RENT_PROTEC' && pct < calc.minUpfrontPct
                    const currentPct =
                      calc.targetRent > 0
                        ? Math.round((calc.effectiveUpfront / calc.targetRent) * 100)
                        : 0
                    return (
                      <button
                        key={pct}
                        type="button"
                        disabled={isDisabled}
                        style={isDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                        className={`savings-engine__mini-chip ${
                          currentPct === pct ? 'savings-engine__mini-chip--active' : ''
                        }`}
                        onClick={() => handleUpfrontPctChip(pct)}
                      >
                        {pct}%
                      </button>
                    )
                  })}
                </div>
                {watched.planId === 'RENT_PROTEC' && (
                  <div className="savings-engine__hint savings-engine__hint--teal">
                    <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Rent Protec activation floor: <strong>{calc.minUpfrontPct}%</strong> (
                      {formatNaira(calc.minUpfrontNaira)}).
                      {calc.upfrontClampedToFloor
                        ? ' Applied automatically to guarantee coverage.'
                        : ' Coverage activates immediately on Day 1.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Extra Top-Up Simulator */}
              <div className="savings-engine__topup-box">
                <div
                  className="savings-engine__toggle-row"
                  onClick={() =>
                    setValue('enableExtraTopUp', !watched.enableExtraTopUp)
                  }
                >
                  <div>
                    <div className="savings-engine__label">
                      <TrendingDown size={15} color="var(--skin-teal)" />
                      <span>Simulate an Extra Top-Up</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      See how mid-plan extra cash lowers future monthly deposits
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(watched.enableExtraTopUp)}
                    className={`savings-engine__switch ${
                      watched.enableExtraTopUp ? 'savings-engine__switch--on' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setValue('enableExtraTopUp', !watched.enableExtraTopUp)
                    }}
                  >
                    <span className="savings-engine__switch-knob" />
                  </button>
                </div>

                {watched.enableExtraTopUp && calc.months > 1 && (
                  <div className="savings-engine__topup-controls">
                    <div>
                      <div className="savings-engine__field-head">
                        <span className="savings-engine__label">Top-Up Month</span>
                        <span className="savings-engine__value-badge">
                          Month {calc.topUpMonth}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="savings-engine__slider"
                        min={1}
                        max={Math.max(1, calc.months - 1)}
                        step={1}
                        value={calc.topUpMonth}
                        onChange={(e) => setValue('extraTopUpMonth', Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <div className="savings-engine__field-head">
                        <label
                          className="savings-engine__label"
                          htmlFor="extraTopUpAmountNaira"
                        >
                          Extra Top-Up Amount
                        </label>
                        <span className="savings-engine__value-badge">
                          +{formatNaira(calc.topUpAmount)}
                        </span>
                      </div>
                      <div className="savings-engine__input-wrap">
                        <span className="savings-engine__input-prefix">₦</span>
                        <input
                          id="extraTopUpAmountNaira"
                          type="number"
                          step={25_000}
                          min={0}
                          max={calc.targetRent}
                          className="savings-engine__input"
                          {...register('extraTopUpAmountNaira')}
                        />
                      </div>
                    </div>

                    {calc.topUpApplied && (
                      <div className="savings-engine__hint savings-engine__hint--teal" style={{ marginTop: 0 }}>
                        <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>
                          After Month {calc.topUpMonth}, your monthly deposit drops from{' '}
                          <strong>{formatNaira(calc.monthlyDeposit)}</strong> to{' '}
                          <strong>{formatNaira(calc.reducedMonthlyDeposit)}</strong> (
                          <strong>&minus;{formatNaira(calc.monthlyDropAfterTopUp)}/mo</strong>).
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* RIGHT: Live Results & Classroom Formula Breakdown */}
          <div className="savings-engine__results-stack">
            {/* Hero KPIs */}
            <div className="savings-engine__kpi-grid">
              <div className="savings-engine__kpi savings-engine__kpi--primary">
                <div className="savings-engine__kpi-label">Fixed Monthly Deposit (M)</div>
                <div className="savings-engine__kpi-value">
                  {formatNaira(calc.monthlyDeposit)}
                </div>
                <div className="savings-engine__kpi-sub">
                  {calc.topUpApplied
                    ? `Drops to ${formatNaira(calc.reducedMonthlyDeposit)}/mo after Month ${calc.topUpMonth}`
                    : `For ${calc.months} months (saves ${formatNaira(calc.monthlySavingsFromInterest)}/mo vs. plain split)`}
                </div>
              </div>

              <div className="savings-engine__kpi">
                <div className="savings-engine__kpi-label">Total Cash You Pay</div>
                <div className="savings-engine__kpi-value">
                  {formatNaira(calc.totalUserContribution)}
                </div>
                <div className="savings-engine__kpi-sub">
                  Upfront {formatNaira(calc.effectiveUpfront)} +{' '}
                  {formatNaira(Math.max(0, calc.totalUserContribution - calc.effectiveUpfront))}{' '}
                  deposits
                </div>
              </div>

              <div className="savings-engine__kpi">
                <div className="savings-engine__kpi-label">Interest Pays For You</div>
                <div className="savings-engine__kpi-value savings-engine__kpi-value--green">
                  +{formatNaira(calc.totalInterestEarned)}
                </div>
                <div className="savings-engine__kpi-sub">
                  <strong>{calc.effectiveDiscountPct}%</strong> effective discount on{' '}
                  {formatNaira(calc.targetRent)} rent
                </div>
              </div>
            </div>

            {/* Rent Funding Composition Bar */}
            <div className="savings-engine__card" style={{ padding: '14px 18px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <span>How Your {formatNaira(calc.targetRent)} Rent Is Funded</span>
                <span style={{ color: '#15803d' }}>
                  Unlock Balance: {formatNaira(calc.closingBalanceAtUnlock)}
                </span>
              </div>
              <div className="savings-engine__bar-wrap">
                <div className="savings-engine__bar">
                  <div
                    className="savings-engine__bar-seg--upfront"
                    style={{ width: `${upfrontPctBar}%` }}
                  />
                  <div
                    className="savings-engine__bar-seg--monthly"
                    style={{ width: `${monthlyPctBar}%` }}
                  />
                  <div
                    className="savings-engine__bar-seg--interest"
                    style={{ width: `${interestPctBar}%` }}
                  />
                </div>
                <div className="savings-engine__bar-legend">
                  <span className="savings-engine__legend-item">
                    <span
                      className="savings-engine__dot"
                      style={{ background: 'var(--dark)' }}
                    />
                    Upfront: <strong>{formatNaira(calc.effectiveUpfront)}</strong>
                  </span>
                  <span className="savings-engine__legend-item">
                    <span
                      className="savings-engine__dot"
                      style={{ background: 'var(--clay)' }}
                    />
                    Monthly + Top-Ups: <strong>{formatNaira(monthlyCash)}</strong>
                  </span>
                  <span className="savings-engine__legend-item">
                    <span className="savings-engine__dot" style={{ background: '#16a34a' }} />
                    Compound Interest:{' '}
                    <strong style={{ color: '#15803d' }}>
                      +{formatNaira(calc.totalInterestEarned)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Classroom Formula Breakdown */}
            <section className="savings-engine__card">
              <div className="savings-engine__card-header">
                <div className="savings-engine__card-title">
                  <span className="savings-engine__card-icon">
                    <Calculator size={16} />
                  </span>
                  <span>Live Formula Breakdown</span>
                </div>

                <div className="savings-engine__mode-tabs">
                  <button
                    type="button"
                    className={`savings-engine__mode-tab ${
                      formulaView === 'symbols' ? 'savings-engine__mode-tab--active' : ''
                    }`}
                    onClick={() => setFormulaView('symbols')}
                  >
                    Symbols
                  </button>
                  <button
                    type="button"
                    className={`savings-engine__mode-tab ${
                      formulaView === 'numbers' ? 'savings-engine__mode-tab--active' : ''
                    }`}
                    onClick={() => setFormulaView('numbers')}
                  >
                    Live Numbers
                  </button>
                </div>
              </div>

              <div className="savings-engine__formula-board">
                {formulaView === 'symbols' ? (
                  <div className="savings-engine__math">
                    <span className="savings-engine__math-var">M</span>
                    <span>=</span>
                    <span className="savings-engine__ceil">
                      <span className="savings-engine__ceil-l" />
                      <span className="savings-engine__frac">
                        <span className="savings-engine__frac-num">
                          max(0,&nbsp; <span className="savings-engine__math-var">R</span> &minus;{' '}
                          <span className="savings-engine__math-var">D</span>(1 +{' '}
                          <span className="savings-engine__math-var">I</span>)
                          <sup>
                            <span className="savings-engine__math-var">n</span>
                          </sup>
                          )
                        </span>
                        <span className="savings-engine__frac-den">
                          <span className="savings-engine__frac savings-engine__frac--inner">
                            <span className="savings-engine__frac-num">
                              (1 + <span className="savings-engine__math-var">I</span>)
                              <sup>
                                <span className="savings-engine__math-var">n</span>
                              </sup>{' '}
                              &minus; 1
                            </span>
                            <span className="savings-engine__frac-den">
                              <span className="savings-engine__math-var">I</span>
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className="savings-engine__ceil-r" />
                    </span>
                  </div>
                ) : (
                  <div className="savings-engine__math" style={{ fontSize: 15 }}>
                    <strong style={{ color: 'var(--skin-primary)' }}>
                      {formatNaira(calc.monthlyDeposit)}
                    </strong>
                    <span>=</span>
                    <span className="savings-engine__ceil">
                      <span className="savings-engine__ceil-l" />
                      <span className="savings-engine__frac">
                        <span className="savings-engine__frac-num">
                          {formatNaira(calc.targetRent)} &minus; {formatNaira(calc.effectiveUpfront)}
                          (1 + {calc.monthlyRate.toFixed(5)})<sup>{calc.months}</sup>
                        </span>
                        <span className="savings-engine__frac-den">
                          <span className="savings-engine__frac savings-engine__frac--inner">
                            <span className="savings-engine__frac-num">
                              (1 + {calc.monthlyRate.toFixed(5)})<sup>{calc.months}</sup> &minus; 1
                            </span>
                            <span className="savings-engine__frac-den">
                              {calc.monthlyRate.toFixed(5)}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className="savings-engine__ceil-r" />
                    </span>
                  </div>
                )}
              </div>

              {/* Interactive "Where..." Symbol Inspector */}
              <div className="savings-engine__symbols-wrap">
                <div className="savings-engine__symbols-label">
                  Click any symbol to see how it is derived (&ldquo;Where&hellip;&rdquo;):
                </div>
                <div className="savings-engine__symbol-pills">
                  {SYMBOL_ORDER.map((sym) => (
                    <button
                      key={sym.key}
                      type="button"
                      className={`savings-engine__symbol-pill ${
                        selectedSymbol === sym.key ? 'savings-engine__symbol-pill--active' : ''
                      }`}
                      onClick={() => setSelectedSymbol(sym.key)}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>

                <div className="savings-engine__symbol-detail">
                  <div className="savings-engine__symbol-detail-head">
                    <span className="savings-engine__symbol-detail-name">
                      <BookOpen
                        size={13}
                        style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }}
                      />
                      {activeSym.name}
                    </span>
                    <span className="savings-engine__symbol-detail-val">
                      {activeSym.liveValue}
                    </span>
                  </div>
                  <div className="savings-engine__symbol-detail-eq">{activeSym.equation}</div>
                  <div className="savings-engine__symbol-detail-desc">
                    {activeSym.explanation}
                  </div>
                </div>
              </div>

              {/* 5-Step Walkthrough Strip */}
              <div className="savings-engine__steps">
                <div className="savings-engine__step">
                  <div className="savings-engine__step-num">Step 1</div>
                  <div className="savings-engine__step-title">Monthly Rate I</div>
                  <div className="savings-engine__step-val">
                    {(calc.monthlyRate * 100).toFixed(4)}%
                  </div>
                </div>
                <div className="savings-engine__step">
                  <div className="savings-engine__step-num">Step 2</div>
                  <div className="savings-engine__step-title">Upfront FV₀</div>
                  <div className="savings-engine__step-val">{formatNaira(calc.fvUpfront)}</div>
                </div>
                <div className="savings-engine__step">
                  <div className="savings-engine__step-num">Step 3</div>
                  <div className="savings-engine__step-title">Remaining Gap G</div>
                  <div className="savings-engine__step-val">{formatNaira(calc.fundingGap)}</div>
                </div>
                <div className="savings-engine__step">
                  <div className="savings-engine__step-num">Step 4</div>
                  <div className="savings-engine__step-title">Growth Factor F</div>
                  <div className="savings-engine__step-val">{calc.growthFactor.toFixed(4)}</div>
                </div>
                <div className="savings-engine__step savings-engine__step--final">
                  <div className="savings-engine__step-num">Step 5</div>
                  <div className="savings-engine__step-title">Monthly M = ⌈G/F⌉</div>
                  <div className="savings-engine__step-val">
                    {formatNaira(calc.monthlyDeposit)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* FULL-WIDTH: Month-by-Month Ledger & Growth Factor Inspector */}
        <section className="savings-engine__card">
          <div className="savings-engine__card-header" style={{ flexWrap: 'wrap' }}>
            <div className="savings-engine__card-title">
              <span className="savings-engine__card-icon">
                <Table2 size={16} />
              </span>
              <span>
                {ledgerTab === 'ledger'
                  ? `Month-by-Month Balance Schedule (${calc.months} Months to Unlock)`
                  : `Where Growth Factor F = ${calc.growthFactor.toFixed(4)} Comes From`}
              </span>
            </div>

            <div className="savings-engine__mode-tabs">
              <button
                type="button"
                className={`savings-engine__mode-tab ${
                  ledgerTab === 'ledger' ? 'savings-engine__mode-tab--active' : ''
                }`}
                onClick={() => setLedgerTab('ledger')}
              >
                Month-by-Month Ledger
              </button>
              <button
                type="button"
                className={`savings-engine__mode-tab ${
                  ledgerTab === 'factor' ? 'savings-engine__mode-tab--active' : ''
                }`}
                onClick={() => setLedgerTab('factor')}
              >
                Growth Factor Breakdown
              </button>
            </div>
          </div>

          {ledgerTab === 'ledger' ? (
            <div className="savings-engine__table-wrap">
              <table className="savings-engine__table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="savings-engine__num">Opening Balance</th>
                    <th className="savings-engine__num">
                      Interest ({(calc.monthlyRate * 100).toFixed(2)}%)
                    </th>
                    <th className="savings-engine__num">Deposit</th>
                    {calc.topUpApplied && (
                      <th className="savings-engine__num">Extra Top-Up</th>
                    )}
                    <th className="savings-engine__num">Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.ledger.map((row) => (
                    <tr
                      key={row.month}
                      className={
                        row.isUnlockMonth
                          ? 'savings-engine__row--unlock'
                          : row.isTopUpMonth
                            ? 'savings-engine__row--topup'
                            : undefined
                      }
                    >
                      <td>
                        <span>{row.label}</span>
                        {row.isTopUpMonth && (
                          <span
                            className="savings-engine__badge savings-engine__badge--teal"
                            style={{ marginLeft: 8 }}
                          >
                            Top-Up Applied
                          </span>
                        )}
                        {row.isReducedMonth && (
                          <span
                            className="savings-engine__badge savings-engine__badge--ok"
                            style={{ marginLeft: 8 }}
                          >
                            Reduced
                          </span>
                        )}
                      </td>
                      <td className="savings-engine__num">
                        {row.month === 0 ? '—' : formatNaira(row.openingBalance)}
                      </td>
                      <td className="savings-engine__num" style={{ color: '#15803d' }}>
                        {row.month === 0 ? '—' : `+${formatNaira(row.interestEarned)}`}
                      </td>
                      <td className="savings-engine__num">{formatNaira(row.monthlyDeposit)}</td>
                      {calc.topUpApplied && (
                        <td className="savings-engine__num" style={{ color: '#115e59' }}>
                          {row.extraTopUp > 0 ? `+${formatNaira(row.extraTopUp)}` : '—'}
                        </td>
                      )}
                      <td className="savings-engine__num">
                        <strong>{formatNaira(row.closingBalance)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="savings-engine__table-wrap">
              <table className="savings-engine__table">
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th className="savings-engine__num">Months Still to Compound</th>
                    <th className="savings-engine__num">₦1 Becomes</th>
                    <th className="savings-engine__num">Compound Interest Portion</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.growthFactorBreakdown.map((item) => (
                    <tr key={item.paymentNumber}>
                      <td>Payment {item.paymentNumber}</td>
                      <td className="savings-engine__num">{item.monthsToGrow} mo</td>
                      <td className="savings-engine__num">₦{item.oneNairaBecomes.toFixed(4)}</td>
                      <td className="savings-engine__num" style={{ color: '#15803d' }}>
                        +₦{item.extraInterest.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  <tr className="savings-engine__row--unlock">
                    <td>Total Growth Factor (F)</td>
                    <td className="savings-engine__num">{calc.months} payments</td>
                    <td className="savings-engine__num">{calc.growthFactor.toFixed(4)}</td>
                    <td className="savings-engine__num" style={{ color: '#15803d' }}>
                      +{(calc.growthFactor - calc.months).toFixed(4)} interest
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FULL-WIDTH: Unlock Timing Model Comparison Toggle */}
        <section className="savings-engine__card savings-engine__section-gap">
          <div className="savings-engine__card-header" style={{ marginBottom: showComparison ? 16 : 0 }}>
            <div className="savings-engine__card-title">
              <span className="savings-engine__card-icon">
                <GitCompare size={16} />
              </span>
              <span>Unlock Timing Model Comparison (Standard Unlock vs. +1 Idle Month)</span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showComparison}
              className={`savings-engine__switch ${
                showComparison ? 'savings-engine__switch--on' : ''
              }`}
              onClick={() => setShowComparison((prev) => !prev)}
            >
              <span className="savings-engine__switch-knob" />
            </button>
          </div>

          {showComparison && (
            <>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Why does Upward compute <strong>M</strong> to mature right at Month {calc.months}{' '}
                instead of assuming an extra locked month (Month {calc.months + 1}) with ₦0
                deposited? Compare both models on your current inputs below:
              </p>

              <div className="savings-engine__compare-grid">
                <div className="savings-engine__model-card savings-engine__model-card--standard">
                  <div className="savings-engine__model-title">
                    <span>Upward Standard (Unlock at Month {calc.months})</span>
                    <span className="savings-engine__badge savings-engine__badge--ok">
                      Hits Target
                    </span>
                  </div>
                  <div className="savings-engine__model-eq">
                    M = &lceil; (R &minus; D(1+I)<sup>{calc.months}</sup>) / F &rceil;
                  </div>
                  <div className="savings-engine__model-stats">
                    <div>
                      <div className="savings-engine__model-stat-label">Monthly Deposit</div>
                      <div className="savings-engine__model-stat-val">
                        {formatNaira(calc.comparison.upwardMonthly)}
                      </div>
                    </div>
                    <div>
                      <div className="savings-engine__model-stat-label">
                        Balance at Month {calc.months} Unlock
                      </div>
                      <div className="savings-engine__model-stat-val" style={{ color: '#15803d' }}>
                        {formatNaira(calc.comparison.upwardBalanceAtUnlock)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="savings-engine__model-card savings-engine__model-card--delayed">
                  <div className="savings-engine__model-title">
                    <span>Delayed-Unlock (+1 Idle Month {calc.months + 1})</span>
                    <span className="savings-engine__badge savings-engine__badge--bad">
                      Short at Unlock
                    </span>
                  </div>
                  <div className="savings-engine__model-eq">
                    S = (R &minus; D(1+I)<sup>{calc.months + 1}</sup>) / ((1+I) &middot; F)
                  </div>
                  <div className="savings-engine__model-stats">
                    <div>
                      <div className="savings-engine__model-stat-label">Monthly Deposit</div>
                      <div className="savings-engine__model-stat-val">
                        {formatNaira(calc.comparison.delayedMonthly)}
                      </div>
                    </div>
                    <div>
                      <div className="savings-engine__model-stat-label">
                        Balance at Month {calc.months} Unlock
                      </div>
                      <div className="savings-engine__model-stat-val" style={{ color: '#b91c1c' }}>
                        {formatNaira(calc.comparison.delayedBalanceAtUnlock)}{' '}
                        {calc.comparison.delayedShortfallAtUnlock > 0 && (
                          <span style={{ fontSize: 12 }}>
                            (&minus;{formatNaira(calc.comparison.delayedShortfallAtUnlock)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Daily ARM Compounding Payday Test */}
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: 8,
                }}
              >
                Real-World Daily ARM Compounding Check ({calc.annualRatePct}% &divide; 365 daily
                over {calc.savingDays} days)
              </div>
              <div className="savings-engine__table-wrap">
                <table className="savings-engine__table">
                  <thead>
                    <tr>
                      <th>When Tenant Deposits</th>
                      <th className="savings-engine__num">
                        Upward Standard ({formatNaira(calc.comparison.upwardMonthly)}/mo)
                      </th>
                      <th className="savings-engine__num">vs. Target Rent</th>
                      <th className="savings-engine__num">
                        Delayed +1 Month ({formatNaira(calc.comparison.delayedMonthly)}/mo)
                      </th>
                      <th className="savings-engine__num">vs. Target Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.comparison.paydayTests.map((row) => (
                      <tr key={row.label}>
                        <td>
                          <strong>{row.label}</strong>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            ({row.dayNote})
                          </span>
                        </td>
                        <td className="savings-engine__num">{formatNaira(row.upwardBalance)}</td>
                        <td className="savings-engine__num">
                          <span
                            className={`savings-engine__badge ${
                              row.upwardVariance >= 0
                                ? 'savings-engine__badge--ok'
                                : 'savings-engine__badge--bad'
                            }`}
                          >
                            {formatNaira(row.upwardVariance, true)}
                          </span>
                        </td>
                        <td className="savings-engine__num">
                          {formatNaira(row.delayedModelBalance)}
                        </td>
                        <td className="savings-engine__num">
                          <span
                            className={`savings-engine__badge ${
                              row.delayedModelVariance >= 0
                                ? 'savings-engine__badge--ok'
                                : 'savings-engine__badge--bad'
                            }`}
                          >
                            {formatNaira(row.delayedModelVariance, true)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <footer className="savings-engine__footer">
          <span>
            Powered by the same math as Upward&rsquo;s production{' '}
            <code>RentSavingsCalculatorEngine</code>.
          </span>
          <span>Live deposits accrue daily with ARM Money Market Fund.</span>
        </footer>
      </main>
    </div>
  )
}
