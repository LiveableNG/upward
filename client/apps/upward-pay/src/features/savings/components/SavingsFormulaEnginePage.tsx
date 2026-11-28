'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronUp,
  GitCompare,
  RotateCcw,
  ShieldCheck,
  Table2,
  TrendingDown,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import {
  ENGINE_PLANS,
  addDaysToIso,
  addMonthsToIso,
  computeSavingsEngine,
  formatNaira,
  parseIsoDateUtc,
  toIsoDateUtc,
  type EnginePlanId,
} from '../utils/savingsFormulaEngine'
import '../styles/savings-engine.css'

const engineFormSchema = z.object({
  targetRentNaira: z.number().min(100_000, 'Min ₦100,000').max(50_000_000, 'Max ₦50,000,000'),
  planId: z.enum(['FULL_LOCK', 'FLEXIBLE', 'RENT_PROTEC']),
  startDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid start date'),
  rentDueDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid rent due date'),
  upfrontDepositNaira: z.number().min(0),
  enableExtraTopUp: z.boolean(),
  extraTopUpMonth: z.number().min(1).max(10),
  extraTopUpAmountNaira: z.number().min(0).max(50_000_000),
  depositDay: z.number().min(1).max(28),
  payFirstMonthOnStartDay: z.boolean(),
})

type EngineFormValues = z.infer<typeof engineFormSchema>

const CALENDAR_SCENARIOS = [
  {
    id: '1st-1st',
    label: 'Start Jan 1 · Rent Dec 1 · Pay 1st',
    startDateIso: '2026-01-01',
    rentDueDateIso: '2026-12-01',
    depositDay: 1,
    payDay0: false,
  },
  {
    id: '17th-17th',
    label: 'Start Jan 17 · Rent Dec 17 · Pay 17th',
    startDateIso: '2026-01-17',
    rentDueDateIso: '2026-12-17',
    depositDay: 17,
    payDay0: false,
  },
  {
    id: '17th-28th',
    label: 'Start Jan 17 · Rent Dec 17 · Pay 28th',
    startDateIso: '2026-01-17',
    rentDueDateIso: '2026-12-17',
    depositDay: 28,
    payDay0: false,
  },
  {
    id: '17th-jan1',
    label: 'Start Jan 17 · Rent Jan 1 · Pay 28th',
    startDateIso: '2026-01-17',
    rentDueDateIso: '2027-01-01',
    depositDay: 28,
    payDay0: false,
  },
  {
    id: 'day0-chatgpt',
    label: 'Pay Mo 1 on Day 0 (ChatGPT)',
    startDateIso: '2026-01-01',
    rentDueDateIso: '2026-12-01',
    depositDay: 1,
    payDay0: true,
  },
] as const

const PRESETS: Array<{ id: string; label: string; values: EngineFormValues }> = [
  {
    id: 'standard',
    label: '₦4M · 10 mo',
    values: {
      targetRentNaira: 4_000_000,
      planId: 'FULL_LOCK',
      startDateIso: '2026-01-17',
      rentDueDateIso: '2026-12-17',
      upfrontDepositNaira: 1_200_000,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 200_000,
      depositDay: 28,
      payFirstMonthOnStartDay: false,
    },
  },
  {
    id: 'zero-down',
    label: '₦2M · ₦0 upfront',
    values: {
      targetRentNaira: 2_000_000,
      planId: 'FULL_LOCK',
      startDateIso: '2026-01-01',
      rentDueDateIso: '2026-12-01',
      upfrontDepositNaira: 0,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 150_000,
      depositDay: 1,
      payFirstMonthOnStartDay: false,
    },
  },
  {
    id: 'rent-protec',
    label: '₦2M · Rent Protec',
    values: {
      targetRentNaira: 2_000_000,
      planId: 'RENT_PROTEC',
      startDateIso: '2026-01-17',
      rentDueDateIso: '2026-12-17',
      upfrontDepositNaira: 400_000,
      enableExtraTopUp: false,
      extraTopUpMonth: 4,
      extraTopUpAmountNaira: 150_000,
      depositDay: 28,
      payFirstMonthOnStartDay: false,
    },
  },
]

function formatInputDigits(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '0'
  return Math.round(val).toLocaleString('en-US')
}

function parseDigits(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '')
  return cleaned ? Number(cleaned) : 0
}

export function SavingsFormulaEnginePage() {
  const [activePreset, setActivePreset] = useState<string>('standard')
  const [activeTab, setActiveTab] = useState<'formula' | 'ledger' | 'compare'>('formula')
  const [showNumbersInFormula, setShowNumbersInFormula] = useState<boolean>(false)
  const [showLegend, setShowLegend] = useState<boolean>(false)
  const [openExplainer, setOpenExplainer] = useState<'rate' | 'factor' | null>(null)

  const {
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
      startDateIso: watched.startDateIso || '2026-01-17',
      rentDueDateIso: watched.rentDueDateIso || '2026-12-17',
      upfrontDepositNaira: Number(watched.upfrontDepositNaira) || 0,
      enableExtraTopUp: Boolean(watched.enableExtraTopUp),
      extraTopUpMonth: Number(watched.extraTopUpMonth) || 4,
      extraTopUpAmountNaira: Number(watched.extraTopUpAmountNaira) || 0,
      depositDay: Number(watched.depositDay ?? 28),
      payFirstMonthOnStartDay: Boolean(watched.payFirstMonthOnStartDay),
    })
  }, [watched])

  const setRentDueByActiveMonths = (activeMonths: number) => {
    const startIso = watched.startDateIso || '2026-01-17'
    // n active saving months + 30d T-30 unlock = startDate + (n + 1) calendar months
    const nextRentDue = addMonthsToIso(startIso, activeMonths + 1)
    setActivePreset('')
    setValue('rentDueDateIso', nextRentDue, { shouldValidate: true })
    if ((Number(watched.extraTopUpMonth) || 1) >= activeMonths) {
      setValue('extraTopUpMonth', Math.max(1, activeMonths - 1))
    }
  }

  const handleStartDateChange = (nextStartIso: string) => {
    setActivePreset('')
    setValue('startDateIso', nextStartIso, { shouldValidate: true })
    const startMs = parseIsoDateUtc(nextStartIso, 0)
    const rentMs = parseIsoDateUtc(watched.rentDueDateIso || '', 0)
    if (startMs > 0 && rentMs <= startMs + 60 * 86_400_000) {
      setValue('rentDueDateIso', addDaysToIso(nextStartIso, 330), { shouldValidate: true })
    }
  }

  const minRentDueDateIso = toIsoDateUtc(
    parseIsoDateUtc(watched.startDateIso || '2026-01-17', Date.UTC(2026, 0, 17)) + 60 * 86_400_000,
  )

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setActivePreset(preset.id)
    reset(preset.values)
  }

  const safeTotal = Math.max(1, calc.closingBalanceAtUnlock)
  const upfrontPct = (calc.effectiveUpfront / safeTotal) * 100
  const monthlyCash = Math.max(0, calc.totalUserContribution - calc.effectiveUpfront)
  const monthlyPct = (monthlyCash / safeTotal) * 100
  const interestPct = Math.max(0, 100 - upfrontPct - monthlyPct)

  const currentUpfrontPct =
    calc.targetRent > 0 ? Math.round((calc.effectiveUpfront / calc.targetRent) * 100) : 0

  return (
    <div className="savings-engine">
      {/* Slim Header */}
      <header className="savings-engine__topbar">
        <div className="savings-engine__topbar-inner">
          <div className="savings-engine__topbar-left">
            <Link href="/" className="savings-engine__brand">
              <UpwardLogo size={24} color="var(--clay)" />
              <span>Upward</span>
            </Link>

            <nav className="savings-engine__mode-nav" aria-label="Engine version">
              <Link
                href="/savings-engine"
                className="savings-engine__mode-link savings-engine__mode-link--active"
                aria-current="page"
              >
                Monthly (Old)
              </Link>
              <Link href="/savings-engine/daily" className="savings-engine__mode-link">
                Daily (New)
              </Link>
            </nav>
          </div>

          <div className="savings-engine__topbar-actions">
            <button
              type="button"
              className="savings-engine__btn savings-engine__btn--ghost"
              onClick={() => applyPreset(PRESETS[0])}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <Link
              href="/dashboard/savings"
              className="savings-engine__btn savings-engine__btn--primary"
            >
              <span>Start Saving</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main className="savings-engine__container">
        {/* Compact Hero */}
        <section className="savings-engine__hero">
          <div>
            <h1 className="savings-engine__title">Rent Savings Simulator</h1>
            <p className="savings-engine__subtitle">
              See what you deposit monthly — and how compound interest pays part of your rent.
            </p>
          </div>

          <div className="savings-engine__presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`savings-engine__preset ${
                  activePreset === preset.id ? 'savings-engine__preset--active' : ''
                }`}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* Main 2-Column Layout */}
        <div className="savings-engine__grid">
          {/* LEFT: Clean 4-Input Card */}
          <section className="savings-engine__card">
            <form onSubmit={(e) => e.preventDefault()} noValidate>
              {/* 1. Rent */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <label className="savings-engine__label" htmlFor="rent-input">
                    Annual Rent
                  </label>
                  <span className="savings-engine__meta">Target (R)</span>
                </div>
                <div className="savings-engine__input-wrap">
                  <span className="savings-engine__currency">₦</span>
                  <input
                    id="rent-input"
                    type="text"
                    inputMode="numeric"
                    className={`savings-engine__input ${
                      errors.targetRentNaira ? 'savings-engine__input--error' : ''
                    }`}
                    value={formatInputDigits(Number(watched.targetRentNaira) || 0)}
                    onChange={(e) => {
                      setActivePreset('')
                      setValue('targetRentNaira', parseDigits(e.target.value), {
                        shouldValidate: true,
                      })
                    }}
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
                    setActivePreset('')
                    setValue('targetRentNaira', Number(e.target.value), { shouldValidate: true })
                  }}
                />
              </div>

              {/* 2. Plan */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <span className="savings-engine__label">Savings Plan</span>
                  <span className="savings-engine__meta">
                    {(calc.monthlyRate * 100).toFixed(2)}% / mo
                  </span>
                </div>
                <div className="savings-engine__plans">
                  {(['FULL_LOCK', 'FLEXIBLE', 'RENT_PROTEC'] as EnginePlanId[]).map((pid) => {
                    const plan = ENGINE_PLANS[pid]
                    const selected = watched.planId === pid
                    return (
                      <button
                        key={pid}
                        type="button"
                        className={`savings-engine__plan ${
                          selected ? 'savings-engine__plan--active' : ''
                        }`}
                        onClick={() => {
                          setActivePreset('')
                          setValue('planId', pid, { shouldValidate: true })
                        }}
                      >
                        <div className="savings-engine__plan-rate">{plan.annualRatePct}%</div>
                        <div className="savings-engine__plan-name">{plan.shortLabel}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Start Date & Rent Due Date */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <span className="savings-engine__label">Saving Timeline</span>
                  <span className="savings-engine__meta">
                    {calc.months} active {calc.months === 1 ? 'month' : 'months'}
                  </span>
                </div>

                <div className="savings-engine__date-grid">
                  <div>
                    <label className="savings-engine__mini-label" htmlFor="start-date-input">
                      Start Date
                    </label>
                    <input
                      id="start-date-input"
                      type="date"
                      className="savings-engine__date-input"
                      value={watched.startDateIso || '2026-01-17'}
                      onChange={(e) => {
                        if (e.target.value) handleStartDateChange(e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <label className="savings-engine__mini-label" htmlFor="rent-due-date-input">
                      Rent Due Date
                    </label>
                    <input
                      id="rent-due-date-input"
                      type="date"
                      min={minRentDueDateIso}
                      className="savings-engine__date-input"
                      value={watched.rentDueDateIso || '2026-12-17'}
                      onChange={(e) => {
                        if (!e.target.value) return
                        setActivePreset('')
                        setValue('rentDueDateIso', e.target.value, { shouldValidate: true })
                      }}
                    />
                  </div>
                </div>

                <div className="savings-engine__chips">
                  {[6, 9, 10, 11].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`savings-engine__chip ${
                        calc.months === m ? 'savings-engine__chip--active' : ''
                      }`}
                      onClick={() => setRentDueByActiveMonths(m)}
                    >
                      {m} mo
                    </button>
                  ))}
                </div>

                <div className="savings-engine__duration-pill">
                  <Calendar size={14} style={{ flexShrink: 0, color: 'var(--skin-primary)' }} />
                  <span>
                    <strong>{calc.daysUntilRent}d</strong> to rent &minus; 30d unlock ={' '}
                    <strong>{calc.savingDays}d</strong> active &rarr;{' '}
                    <strong>n = {calc.months} mo</strong>
                    {calc.calendarSchedule.extraBufferDays > 0 &&
                      !calc.calendarSchedule.cappedAtMaxMonths && (
                        <> (+{calc.calendarSchedule.extraBufferDays}d buffer)</>
                      )}
                    {calc.calendarSchedule.cappedAtMaxMonths && <> (11 mo max)</>} · Unlocks{' '}
                    <strong>{calc.calendarSchedule.unlockDateLabel}</strong>
                  </span>
                </div>

                {watched.planId === 'RENT_PROTEC' && !calc.isRentProtecEligible && (
                  <div className="savings-engine__note savings-engine__note--warn">
                    <AlertTriangle size={14} />
                    <span>Rent Protec needs at least 6 months before rent day (5+ saving mo).</span>
                  </div>
                )}
              </div>

              {/* 4. Upfront Deposit */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <label className="savings-engine__label" htmlFor="upfront-input">
                    Upfront Deposit
                  </label>
                  <span className="savings-engine__meta">{currentUpfrontPct}% of rent</span>
                </div>
                <div className="savings-engine__input-wrap">
                  <span className="savings-engine__currency">₦</span>
                  <input
                    id="upfront-input"
                    type="text"
                    inputMode="numeric"
                    className="savings-engine__input"
                    value={formatInputDigits(Number(watched.upfrontDepositNaira) || 0)}
                    onChange={(e) => {
                      setActivePreset('')
                      setValue('upfrontDepositNaira', parseDigits(e.target.value), {
                        shouldValidate: true,
                      })
                    }}
                  />
                </div>
                <div className="savings-engine__chips">
                  {[0, 20, 30, 50].map((pct) => {
                    const blocked = watched.planId === 'RENT_PROTEC' && pct < calc.minUpfrontPct
                    return (
                      <button
                        key={pct}
                        type="button"
                        disabled={blocked}
                        className={`savings-engine__chip ${
                          currentUpfrontPct === pct ? 'savings-engine__chip--active' : ''
                        }`}
                        onClick={() => {
                          setActivePreset('')
                          setValue(
                            'upfrontDepositNaira',
                            Math.round((calc.targetRent * pct) / 100),
                            { shouldValidate: true },
                          )
                        }}
                      >
                        {pct === 0 ? '₦0' : `${pct}%`}
                      </button>
                    )
                  })}
                </div>
                {watched.planId === 'RENT_PROTEC' && (
                  <div className="savings-engine__note">
                    <ShieldCheck size={14} />
                    <span>
                      Min upfront for instant cover: <strong>{calc.minUpfrontPct}%</strong> (
                      {formatNaira(calc.minUpfrontNaira)})
                    </span>
                  </div>
                )}
              </div>

              {/* Optional Extra Top-Up */}
              <div className="savings-engine__topup">
                <button
                  type="button"
                  className="savings-engine__topup-trigger"
                  onClick={() => setValue('enableExtraTopUp', !watched.enableExtraTopUp)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <TrendingDown size={15} color="var(--skin-teal)" />
                    <span>Test an extra top-up</span>
                  </span>
                  <span
                    className={`savings-engine__switch ${
                      watched.enableExtraTopUp ? 'savings-engine__switch--on' : ''
                    }`}
                  >
                    <span className="savings-engine__switch-knob" />
                  </span>
                </button>

                {watched.enableExtraTopUp && calc.months > 1 && (
                  <div className="savings-engine__topup-body">
                    <div>
                      <div className="savings-engine__field-top" style={{ marginBottom: 4 }}>
                        <span className="savings-engine__label">In Month</span>
                        <span className="savings-engine__meta">Month {calc.topUpMonth}</span>
                      </div>
                      <input
                        type="range"
                        className="savings-engine__slider"
                        style={{ marginTop: 0 }}
                        min={1}
                        max={Math.max(1, calc.months - 1)}
                        step={1}
                        value={calc.topUpMonth}
                        onChange={(e) => setValue('extraTopUpMonth', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <div className="savings-engine__field-top" style={{ marginBottom: 4 }}>
                        <label className="savings-engine__label" htmlFor="topup-input">
                          Extra Amount
                        </label>
                      </div>
                      <div className="savings-engine__input-wrap">
                        <span className="savings-engine__currency">₦</span>
                        <input
                          id="topup-input"
                          type="text"
                          inputMode="numeric"
                          className="savings-engine__input"
                          value={formatInputDigits(Number(watched.extraTopUpAmountNaira) || 0)}
                          onChange={(e) =>
                            setValue('extraTopUpAmountNaira', parseDigits(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* RIGHT: Unified Answer + Clean Tabbed Breakdown */}
          <div className="savings-engine__right">
            {/* Hero Answer Card */}
            <section className="savings-engine__answer">
              <div className="savings-engine__answer-top">
                <div>
                  <div className="savings-engine__answer-label">Monthly Deposit</div>
                  <div className="savings-engine__answer-amount">
                    {formatNaira(calc.monthlyDeposit)}
                    <span className="savings-engine__answer-unit">/ month</span>
                  </div>
                  <div className="savings-engine__answer-sub">
                    {calc.topUpApplied ? (
                      <>
                        Drops to <strong>{formatNaira(calc.reducedMonthlyDeposit)}/mo</strong> after
                        your Month {calc.topUpMonth} top-up (&minus;
                        {formatNaira(calc.monthlyDropAfterTopUp)}/mo)
                      </>
                    ) : (
                      <>
                        For {calc.months} months · saves{' '}
                        <strong>{formatNaira(calc.monthlySavingsFromInterest)}/mo</strong> vs. plain
                        split
                      </>
                    )}
                  </div>
                </div>

                <span className="savings-engine__discount-pill">
                  {calc.effectiveDiscountPct}% off rent
                </span>
              </div>

              <div className="savings-engine__summary-strip">
                <div>
                  <div className="savings-engine__stat-label">You Put In</div>
                  <div className="savings-engine__stat-val">
                    {formatNaira(calc.totalUserContribution)}
                  </div>
                </div>
                <div>
                  <div className="savings-engine__stat-label">Interest Covers</div>
                  <div className="savings-engine__stat-val savings-engine__stat-val--green">
                    +{formatNaira(calc.totalInterestEarned)}
                  </div>
                </div>
                <div>
                  <div className="savings-engine__stat-label">Balance at Unlock</div>
                  <div className="savings-engine__stat-val">
                    {formatNaira(calc.closingBalanceAtUnlock)}
                  </div>
                </div>
              </div>

              <div className="savings-engine__bar">
                <div
                  className="savings-engine__bar--upfront"
                  style={{ width: `${upfrontPct}%` }}
                />
                <div
                  className="savings-engine__bar--monthly"
                  style={{ width: `${monthlyPct}%` }}
                />
                <div
                  className="savings-engine__bar--interest"
                  style={{ width: `${interestPct}%` }}
                />
              </div>
              <div className="savings-engine__bar-labels">
                <span>
                  <span className="savings-engine__dot" style={{ background: '#ffffff' }} />
                  Upfront {formatNaira(calc.effectiveUpfront)}
                </span>
                <span>
                  <span className="savings-engine__dot" style={{ background: 'var(--clay)' }} />
                  Monthly {formatNaira(monthlyCash)}
                </span>
                <span>
                  <span className="savings-engine__dot" style={{ background: '#4ade80' }} />
                  Interest +{formatNaira(calc.totalInterestEarned)}
                </span>
              </div>
            </section>

            {/* Single Clean Tabbed Explorer */}
            <section className="savings-engine__card">
              <div className="savings-engine__tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'formula'}
                  className={`savings-engine__tab ${
                    activeTab === 'formula' ? 'savings-engine__tab--active' : ''
                  }`}
                  onClick={() => setActiveTab('formula')}
                >
                  <Calculator size={15} />
                  <span>How It&rsquo;s Calculated</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'ledger'}
                  className={`savings-engine__tab ${
                    activeTab === 'ledger' ? 'savings-engine__tab--active' : ''
                  }`}
                  onClick={() => setActiveTab('ledger')}
                >
                  <Table2 size={15} />
                  <span>Month-by-Month</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'compare'}
                  className={`savings-engine__tab ${
                    activeTab === 'compare' ? 'savings-engine__tab--active' : ''
                  }`}
                  onClick={() => setActiveTab('compare')}
                >
                  <GitCompare size={15} />
                  <span>Compare Timing Models</span>
                </button>
              </div>

              {/* TAB 1: Formula + 4-Step Visual Flow */}
              {activeTab === 'formula' && (
                <div>
                  <div className="savings-engine__formula-bar">
                    {!showNumbersInFormula ? (
                      <div className="savings-engine__math">
                        <span className="savings-engine__math-var">M</span>
                        <span>=</span>
                        <span>&lceil;</span>
                        <span className="savings-engine__frac">
                          <span className="savings-engine__frac-num">
                            <span className="savings-engine__math-var">R</span> &minus;{' '}
                            <span className="savings-engine__math-var">D</span>(1 +{' '}
                            <span className="savings-engine__math-var">I</span>)
                            <sup>
                              <span className="savings-engine__math-var">n</span>
                            </sup>
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
                        <span>&rceil;</span>
                      </div>
                    ) : (
                      <div className="savings-engine__math" style={{ fontSize: 14 }}>
                        <strong style={{ color: 'var(--skin-primary)' }}>
                          {formatNaira(calc.monthlyDeposit)}
                        </strong>
                        <span>=</span>
                        <span>&lceil;</span>
                        <span className="savings-engine__frac">
                          <span className="savings-engine__frac-num">
                            {formatNaira(calc.targetRent)} &minus;{' '}
                            {formatNaira(calc.effectiveUpfront)} &times; (1 +{' '}
                            {(calc.monthlyRate * 100).toFixed(2)}%)<sup>{calc.months}</sup>
                          </span>
                          <span className="savings-engine__frac-den">
                            {calc.growthFactor.toFixed(4)}
                          </span>
                        </span>
                        <span>&rceil;</span>
                      </div>
                    )}

                    <div className="savings-engine__pill-toggle">
                      <button
                        type="button"
                        className={`savings-engine__pill-btn ${
                          !showNumbersInFormula ? 'savings-engine__pill-btn--active' : ''
                        }`}
                        onClick={() => setShowNumbersInFormula(false)}
                      >
                        Letters
                      </button>
                      <button
                        type="button"
                        className={`savings-engine__pill-btn ${
                          showNumbersInFormula ? 'savings-engine__pill-btn--active' : ''
                        }`}
                        onClick={() => setShowNumbersInFormula(true)}
                      >
                        Numbers
                      </button>
                    </div>
                  </div>

                  {/* 4 Clean One-Line Steps (with collapsible Why? explainers on I & F) */}
                  <div className="savings-engine__steps">
                    <div className="savings-engine__step-group">
                      <div className="savings-engine__step-row">
                        <div className="savings-engine__step-left">
                          <span className="savings-engine__step-idx">1</span>
                          <div>
                            <div className="savings-engine__step-name">
                              Monthly interest rate (I)
                            </div>
                            <div className="savings-engine__step-eq">
                              (1 + {calc.annualRatePct}%)^(1/12) &minus; 1
                            </div>
                          </div>
                        </div>
                        <div className="savings-engine__step-right">
                          <div className="savings-engine__step-val">
                            {(calc.monthlyRate * 100).toFixed(4)}%
                          </div>
                          <button
                            type="button"
                            aria-expanded={openExplainer === 'rate'}
                            className={`savings-engine__why-btn ${
                              openExplainer === 'rate' ? 'savings-engine__why-btn--open' : ''
                            }`}
                            onClick={() =>
                              setOpenExplainer((prev) => (prev === 'rate' ? null : 'rate'))
                            }
                          >
                            <span>Why?</span>
                            {openExplainer === 'rate' ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </button>
                        </div>
                      </div>

                      {openExplainer === 'rate' && (
                        <div className="savings-engine__explainer">
                          <div>
                            <div className="savings-engine__explainer-block-title">
                              Why {(calc.monthlyRate * 100).toFixed(4)}% instead of{' '}
                              {calc.annualRatePct}% &divide; 12?
                            </div>
                            Your interest earns interest every month — like a snowball. If we simply
                            divided {calc.annualRatePct}% by 12 (
                            <strong>{(calc.annualRatePct / 12).toFixed(2)}%/mo</strong>), that
                            snowball would actually grow to{' '}
                            <strong>
                              {((Math.pow(1 + calc.annualRateDecimal / 12, 12) - 1) * 100).toFixed(
                                2,
                              )}
                              %
                            </strong>{' '}
                            in a year — more than the {calc.annualRatePct}% plan rate.{' '}
                            <strong>{(calc.monthlyRate * 100).toFixed(4)}%</strong> is the exact
                            monthly rate that snowballs to <strong>exactly {calc.annualRatePct}%</strong>{' '}
                            over 12 months.
                          </div>
                          <div className="savings-engine__explainer-benefit">
                            <strong>How this protects you:</strong> You get a realistic monthly
                            target — no inflated interest promises that leave you short when it is
                            time to pay your landlord.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="savings-engine__step-row">
                      <div className="savings-engine__step-left">
                        <span className="savings-engine__step-idx">2</span>
                        <div>
                          <div className="savings-engine__step-name">
                            Upfront grows over {calc.months} months (FV₀)
                          </div>
                          <div className="savings-engine__step-eq">
                            {formatNaira(calc.effectiveUpfront)} &times; (1 + I)^{calc.months}
                          </div>
                        </div>
                      </div>
                      <div className="savings-engine__step-val">{formatNaira(calc.fvUpfront)}</div>
                    </div>

                    <div className="savings-engine__step-row">
                      <div className="savings-engine__step-left">
                        <span className="savings-engine__step-idx">3</span>
                        <div>
                          <div className="savings-engine__step-name">Remaining gap (G)</div>
                          <div className="savings-engine__step-eq">
                            {formatNaira(calc.targetRent)} &minus; {formatNaira(calc.fvUpfront)}
                          </div>
                        </div>
                      </div>
                      <div className="savings-engine__step-val">
                        {formatNaira(calc.fundingGap)}
                      </div>
                    </div>

                    <div className="savings-engine__step-group">
                      <div className="savings-engine__step-row savings-engine__step-row--result">
                        <div className="savings-engine__step-left">
                          <span className="savings-engine__step-idx">4</span>
                          <div>
                            <div className="savings-engine__step-name">
                              Divide by growth factor (F = {calc.growthFactor.toFixed(3)})
                            </div>
                            <div className="savings-engine__step-eq">
                              &lceil; {formatNaira(calc.fundingGap)} &divide;{' '}
                              {calc.growthFactor.toFixed(3)} &rceil; ({calc.months} pmts +{' '}
                              {(calc.growthFactor - calc.months).toFixed(3)} interest)
                            </div>
                          </div>
                        </div>
                        <div className="savings-engine__step-right">
                          <div className="savings-engine__step-val">
                            {formatNaira(calc.monthlyDeposit)} / mo
                          </div>
                          <button
                            type="button"
                            aria-expanded={openExplainer === 'factor'}
                            className={`savings-engine__why-btn ${
                              openExplainer === 'factor' ? 'savings-engine__why-btn--open' : ''
                            }`}
                            onClick={() =>
                              setOpenExplainer((prev) => (prev === 'factor' ? null : 'factor'))
                            }
                          >
                            <span>Why?</span>
                            {openExplainer === 'factor' ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </button>
                        </div>
                      </div>

                      {openExplainer === 'factor' && (
                        <div className="savings-engine__explainer">
                          <div>
                            <div className="savings-engine__explainer-block-title">
                              Where {calc.growthFactor.toFixed(2)} comes from
                            </div>
                            Your earlier monthly payments sit in your vault longer, so they earn
                            interest too — not just your upfront deposit. Over{' '}
                            <strong>{calc.months} months</strong>, your money works like{' '}
                            <strong>{calc.growthFactor.toFixed(2)} payments</strong> instead of{' '}
                            {calc.months}: <strong>{calc.months} from your pocket</strong> +{' '}
                            <strong>{(calc.growthFactor - calc.months).toFixed(2)} free from interest</strong>.
                          </div>

                          <div className="savings-engine__mini-table-wrap">
                            <table className="savings-engine__mini-table">
                              <thead>
                                <tr>
                                  <th>Payment</th>
                                  <th className="savings-engine__num">Time to Grow</th>
                                  <th className="savings-engine__num">Every ₦1 Grows To</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calc.growthFactorBreakdown.map((item) => (
                                  <tr key={item.paymentNumber}>
                                    <td>Month {item.paymentNumber}</td>
                                    <td className="savings-engine__num">
                                      {item.monthsToGrow === 0
                                        ? 'Unlocks right away'
                                        : `${item.monthsToGrow} mo`}
                                    </td>
                                    <td className="savings-engine__num">
                                      ₦{item.oneNairaBecomes.toFixed(3)}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="savings-engine__row--unlock">
                                  <td>Total</td>
                                  <td className="savings-engine__num">{calc.months} payments</td>
                                  <td className="savings-engine__num">
                                    {calc.growthFactor.toFixed(3)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="savings-engine__explainer-benefit">
                            <strong>How this helps you:</strong> Without interest on your monthly
                            deposits, splitting {formatNaira(calc.fundingGap)} across {calc.months}{' '}
                            months would cost <strong>{formatNaira(calc.plainSplitMonthly)}/mo</strong>.
                            Because interest carries that extra{' '}
                            {(calc.growthFactor - calc.months).toFixed(2)} share for you, you pay{' '}
                            <strong>{formatNaira(calc.monthlySavingsFromInterest)} less every month</strong>{' '}
                            (<strong>{formatNaira(calc.monthlyDeposit)}/mo</strong>) — and still hit
                            your full rent even if you pay at the end of the month.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Collapsible Symbol Key */}
                  <button
                    type="button"
                    className="savings-engine__legend-toggle"
                    onClick={() => setShowLegend((v) => !v)}
                  >
                    <span>{showLegend ? 'Hide' : 'What does each letter mean?'}</span>
                    {showLegend ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showLegend && (
                    <div className="savings-engine__legend-grid">
                      <div className="savings-engine__legend-card">
                        <span className="savings-engine__legend-sym">R</span>
                        <strong>Target Rent:</strong> Full rent due ({formatNaira(calc.targetRent)}
                        ).
                      </div>
                      <div className="savings-engine__legend-card">
                        <span className="savings-engine__legend-sym">D</span>
                        <strong>Upfront Deposit:</strong> Day 0 lump sum (
                        {formatNaira(calc.effectiveUpfront)}).
                      </div>
                      <div className="savings-engine__legend-card">
                        <span className="savings-engine__legend-sym">I</span>
                        <strong>Monthly Rate:</strong> (1 + {calc.annualRatePct}%)^(1/12) &minus; 1
                        = {(calc.monthlyRate * 100).toFixed(4)}%.
                      </div>
                      <div className="savings-engine__legend-card">
                        <span className="savings-engine__legend-sym">n</span>
                        <strong>Payment Months:</strong> Active saving months before T&minus;30
                        unlock (max 11).
                      </div>
                      <div className="savings-engine__legend-card">
                        <span className="savings-engine__legend-sym">F</span>
                        <strong>Growth Factor:</strong> ((1 + I)^n &minus; 1) / I ={' '}
                        {calc.growthFactor.toFixed(3)}.
                      </div>
                      <div className="savings-engine__legend-card">
                        <span className="savings-engine__legend-sym">M</span>
                        <strong>Monthly Deposit:</strong> Rounded up (&lceil;&middot;&rceil;) so you
                        never fall short.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Clean 4-Column Month-by-Month Ledger */}
              {activeTab === 'ledger' && (
                <div className="savings-engine__table-wrap">
                  <table className="savings-engine__table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="savings-engine__num">Interest</th>
                        <th className="savings-engine__num">You Deposit</th>
                        <th className="savings-engine__num">Balance</th>
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
                            {row.label}
                            {row.isTopUpMonth && (
                              <span className="savings-engine__tag savings-engine__tag--teal">
                                +{formatNaira(row.extraTopUp)} top-up
                              </span>
                            )}
                          </td>
                          <td className="savings-engine__num" style={{ color: '#15803d' }}>
                            {row.month === 0 ? '—' : `+${formatNaira(row.interestEarned)}`}
                          </td>
                          <td className="savings-engine__num">
                            {formatNaira(row.monthlyDeposit + row.extraTopUp)}
                          </td>
                          <td className="savings-engine__num">
                            <strong>{formatNaira(row.closingBalance)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: Timing Model Comparison + Start Day / Deposit Day Simulator */}
              {activeTab === 'compare' && (
                <div>
                  {/* Interactive Calendar Controls */}
                  <div className="savings-engine__calendar-box">
                    <div className="savings-engine__calendar-head">
                      <span className="savings-engine__calendar-title">
                        <Calendar size={14} />
                        <span>Real-Calendar Proof (Start Date &rarr; Rent Due Date)</span>
                      </span>
                      <span className="savings-engine__meta">
                        {calc.calendarSchedule.activeSavingDays} active days (n = {calc.months})
                      </span>
                    </div>

                    <div className="savings-engine__scenario-chips">
                      {CALENDAR_SCENARIOS.map((sc) => {
                        const isActive =
                          calc.calendarSchedule.startDateIso === sc.startDateIso &&
                          calc.calendarSchedule.rentDueDateIso === sc.rentDueDateIso &&
                          calc.calendarSchedule.payFirstMonthOnStartDay === sc.payDay0 &&
                          (sc.payDay0 || calc.calendarSchedule.depositDay === sc.depositDay)
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            className={`savings-engine__preset ${
                              isActive ? 'savings-engine__preset--active' : ''
                            }`}
                            onClick={() => {
                              setActivePreset('')
                              setValue('startDateIso', sc.startDateIso)
                              setValue('rentDueDateIso', sc.rentDueDateIso)
                              setValue('depositDay', sc.depositDay)
                              setValue('payFirstMonthOnStartDay', sc.payDay0)
                            }}
                          >
                            {sc.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className="savings-engine__calendar-inputs savings-engine__calendar-inputs--two">
                      <div>
                        <label className="savings-engine__mini-label" htmlFor="cal-deposit-day">
                          Monthly Deposit Day (1–28)
                        </label>
                        <input
                          id="cal-deposit-day"
                          type="number"
                          min={1}
                          max={28}
                          disabled={calc.calendarSchedule.payFirstMonthOnStartDay}
                          className="savings-engine__mini-input"
                          value={calc.calendarSchedule.depositDay}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (Number.isNaN(v)) return
                            setValue('depositDay', Math.min(28, Math.max(1, v)))
                          }}
                        />
                      </div>

                      <div className="savings-engine__day0-toggle">
                        <button
                          type="button"
                          className="savings-engine__topup-trigger"
                          onClick={() =>
                            setValue(
                              'payFirstMonthOnStartDay',
                              !calc.calendarSchedule.payFirstMonthOnStartDay,
                            )
                          }
                        >
                          <span style={{ fontSize: 12 }}>Pay Month 1 on Start Day (Day 0)</span>
                          <span
                            className={`savings-engine__switch ${
                              calc.calendarSchedule.payFirstMonthOnStartDay
                                ? 'savings-engine__switch--on'
                                : ''
                            }`}
                          >
                            <span className="savings-engine__switch-knob" />
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Live Timeline Strip */}
                    <div className="savings-engine__timeline">
                      <div className="savings-engine__timeline-node">
                        <span>Start (Upfront)</span>
                        <strong>{calc.calendarSchedule.startDateLabel}</strong>
                      </div>
                      <ArrowRight size={13} className="savings-engine__timeline-arrow" />
                      <div className="savings-engine__timeline-node">
                        <span>Deposit #1</span>
                        <strong>{calc.calendarSchedule.firstDepositDateLabel}</strong>
                      </div>
                      <ArrowRight size={13} className="savings-engine__timeline-arrow" />
                      <div className="savings-engine__timeline-node savings-engine__timeline-node--focus">
                        <span>Deposit #{calc.months} (Final)</span>
                        <strong>{calc.calendarSchedule.lastDepositDateLabel}</strong>
                      </div>
                      <ArrowRight size={13} className="savings-engine__timeline-arrow" />
                      <div className="savings-engine__timeline-node">
                        <span>Unlock (T&minus;30)</span>
                        <strong>{calc.calendarSchedule.unlockDateLabel}</strong>
                      </div>
                      <ArrowRight size={13} className="savings-engine__timeline-arrow" />
                      <div className="savings-engine__timeline-node">
                        <span>Rent Due</span>
                        <strong>{calc.calendarSchedule.rentDueDateLabel}</strong>
                      </div>
                    </div>

                    {/* Clear Answer to the Month-n Interest Dispute */}
                    <div
                      className={`savings-engine__verdict ${
                        calc.calendarSchedule.lastDepositEarnsInterest
                          ? 'savings-engine__verdict--info'
                          : 'savings-engine__verdict--neutral'
                      }`}
                    >
                      {!calc.calendarSchedule.lastDepositEarnsInterest ? (
                        <>
                          <strong>
                            Does Month {calc.months}&rsquo;s deposit earn interest? No (0 days
                            left).
                          </strong>{' '}
                          Deposit #{calc.months} lands on{' '}
                          <strong>{calc.calendarSchedule.lastDepositDateLabel}</strong> — the exact
                          unlock day — so it unlocks immediately. Upward&rsquo;s formula plans for
                          this and hits your rent; ChatGPT&rsquo;s +1 idle month formula assumes 30
                          extra days and falls short by{' '}
                          <strong>
                            {formatNaira(Math.abs(calc.calendarSchedule.delayedVariance))}
                          </strong>
                          .
                        </>
                      ) : calc.calendarSchedule.payFirstMonthOnStartDay ? (
                        <>
                          <strong>
                            Month {calc.months}&rsquo;s deposit earns{' '}
                            {calc.calendarSchedule.lastDepositDaysToCompound} days of interest (+
                            {formatNaira(calc.calendarSchedule.lastDepositUpwardInterest)}) — ONLY
                            because Month 1 was paid on Day 0.
                          </strong>{' '}
                          Paying Upfront + Month 1 together on{' '}
                          <strong>{calc.calendarSchedule.startDateLabel}</strong> shifts Deposit #
                          {calc.months} to{' '}
                          <strong>{calc.calendarSchedule.lastDepositDateLabel}</strong> (a full
                          month before {calc.calendarSchedule.unlockDateLabel} unlock). This is the
                          only case where ChatGPT&rsquo;s formula avoids a shortfall.
                        </>
                      ) : (
                        <>
                          <strong>
                            Yes — Deposit #{calc.months} earns{' '}
                            {calc.calendarSchedule.lastDepositDaysToCompound} days of daily interest
                            (+{formatNaira(calc.calendarSchedule.lastDepositUpwardInterest)}).
                          </strong>{' '}
                          Because you start on day {calc.calendarSchedule.startDay} and deposit on
                          day {calc.calendarSchedule.depositDay}, Deposit #{calc.months} lands on{' '}
                          <strong>{calc.calendarSchedule.lastDepositDateLabel}</strong> —{' '}
                          {calc.calendarSchedule.lastDepositDaysToCompound} days before your{' '}
                          {calc.calendarSchedule.unlockDateLabel} unlock. Upward guarantees full
                          rent with a{' '}
                          <strong>
                            {formatNaira(calc.calendarSchedule.upwardVariance, true)}
                          </strong>{' '}
                          surplus
                          {calc.calendarSchedule.delayedVariance < -500 ? (
                            <>
                              , while ChatGPT&rsquo;s +1 idle month formula still falls short by{' '}
                              <strong>
                                {formatNaira(Math.abs(calc.calendarSchedule.delayedVariance))}
                              </strong>{' '}
                              because it assumed a full 30 days.
                            </>
                          ) : (
                            '.'
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Side-by-Side Live Comparison for Selected Dates */}
                  <div className="savings-engine__compare-cards">
                    <div className="savings-engine__model savings-engine__model--ok">
                      <div className="savings-engine__model-head">
                        <span>Upward Formula</span>
                        <span className="savings-engine__tag savings-engine__tag--ok">
                          {calc.calendarSchedule.upwardVariance >= 500
                            ? `Surplus ${formatNaira(calc.calendarSchedule.upwardVariance, true)}`
                            : 'Hits Target'}
                        </span>
                      </div>
                      <div className="savings-engine__model-num">
                        {formatNaira(calc.comparison.upwardMonthly)} / mo
                      </div>
                      <div className="savings-engine__model-sub">
                        Balance on {calc.calendarSchedule.unlockDateLabel}:{' '}
                        <strong>{formatNaira(calc.calendarSchedule.upwardTotalAtUnlock)}</strong>
                      </div>
                    </div>

                    <div
                      className={`savings-engine__model ${
                        calc.calendarSchedule.delayedVariance < -500
                          ? 'savings-engine__model--bad'
                          : 'savings-engine__model--ok'
                      }`}
                    >
                      <div className="savings-engine__model-head">
                        <span>ChatGPT (+1 Idle Month)</span>
                        <span
                          className={`savings-engine__tag ${
                            calc.calendarSchedule.delayedVariance < -500
                              ? 'savings-engine__tag--bad'
                              : 'savings-engine__tag--ok'
                          }`}
                        >
                          {calc.calendarSchedule.delayedVariance < -500
                            ? `Short ${formatNaira(calc.calendarSchedule.delayedVariance, true)}`
                            : 'Hits Only w/ Day 0'}
                        </span>
                      </div>
                      <div className="savings-engine__model-num">
                        {formatNaira(calc.comparison.delayedMonthly)} / mo
                      </div>
                      <div className="savings-engine__model-sub">
                        Balance on {calc.calendarSchedule.unlockDateLabel}:{' '}
                        <strong
                          style={{
                            color:
                              calc.calendarSchedule.delayedVariance < -500 ? '#b91c1c' : 'inherit',
                          }}
                        >
                          {formatNaira(calc.calendarSchedule.delayedTotalAtUnlock)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Exact Deposit-by-Deposit Calendar Proof Table */}
                  <div className="savings-engine__table-wrap">
                    <table className="savings-engine__table">
                      <thead>
                        <tr>
                          <th>Deposit</th>
                          <th>Date</th>
                          <th className="savings-engine__num">Days to Grow</th>
                          <th className="savings-engine__num">Upward Interest</th>
                          <th className="savings-engine__num">Upward Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calc.calendarSchedule.rows.map((row) => (
                          <tr
                            key={row.step}
                            className={row.isFinalDeposit ? 'savings-engine__row--unlock' : undefined}
                          >
                            <td>{row.label}</td>
                            <td>{row.dateLabel}</td>
                            <td className="savings-engine__num">{row.daysToCompound}d</td>
                            <td className="savings-engine__num" style={{ color: '#15803d' }}>
                              {row.daysToCompound === 0
                                ? '₦0'
                                : `+${formatNaira(row.upwardInterest)}`}
                            </td>
                            <td className="savings-engine__num">
                              <strong>{formatNaira(row.upwardFutureValue)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
