'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  GitCompare,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Table2,
  TrendingDown,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import {
  ENGINE_PLANS,
  addDaysToIso,
  addMonthsToIso,
  formatNaira,
  parseIsoDateUtc,
  toIsoDateUtc,
  type EnginePlanId,
} from '../utils/savingsFormulaEngine'
import { computeDailySavingsEngine } from '../utils/dailySavingsFormulaEngine'
import '../styles/savings-engine.css'

const dailyEngineFormSchema = z.object({
  targetRentNaira: z.number().min(100_000, 'Min ₦100,000').max(50_000_000, 'Max ₦50,000,000'),
  planId: z.enum(['FULL_LOCK', 'FLEXIBLE', 'RENT_PROTEC']),
  startDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid start date'),
  rentDueDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid rent due date'),
  upfrontDepositNaira: z.number().min(0),
  depositDay: z.number().min(1).max(28),
  payFirstMonthOnStartDay: z.boolean(),
  enableExtraTopUp: z.boolean(),
  extraTopUpDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extraTopUpAmountNaira: z.number().min(0).max(50_000_000),
  simDepositIndex: z.number().min(1).max(11),
  simDelayDays: z.number().min(-15).max(35),
  simMissedFullDeposit: z.boolean(),
})

type DailyEngineFormValues = z.infer<typeof dailyEngineFormSchema>

const PRESETS: Array<{ id: string; label: string; values: DailyEngineFormValues }> = [
  {
    id: 'nov-1-meeting',
    label: '₦4M · Nov 1 (Meeting)',
    values: {
      targetRentNaira: 4_000_000,
      planId: 'FULL_LOCK',
      startDateIso: '2026-11-01',
      rentDueDateIso: '2027-10-31',
      upfrontDepositNaira: 1_200_000,
      depositDay: 28,
      payFirstMonthOnStartDay: false,
      enableExtraTopUp: false,
      extraTopUpDateIso: '2027-02-15',
      extraTopUpAmountNaira: 250_000,
      simDepositIndex: 3,
      simDelayDays: 6,
      simMissedFullDeposit: false,
    },
  },
  {
    id: 'nov-20-late-start',
    label: '₦4M · Nov 20 Start',
    values: {
      targetRentNaira: 4_000_000,
      planId: 'FULL_LOCK',
      startDateIso: '2026-11-20',
      rentDueDateIso: '2027-10-31',
      upfrontDepositNaira: 1_200_000,
      depositDay: 28,
      payFirstMonthOnStartDay: false,
      enableExtraTopUp: false,
      extraTopUpDateIso: '2027-02-15',
      extraTopUpAmountNaira: 250_000,
      simDepositIndex: 3,
      simDelayDays: 6,
      simMissedFullDeposit: false,
    },
  },
  {
    id: 'rent-protec-7mo',
    label: '₦2M · Rent Protec (7m)',
    values: {
      targetRentNaira: 2_000_000,
      planId: 'RENT_PROTEC',
      startDateIso: '2026-11-01',
      rentDueDateIso: '2027-07-01',
      upfrontDepositNaira: 400_000,
      depositDay: 28,
      payFirstMonthOnStartDay: false,
      enableExtraTopUp: false,
      extraTopUpDateIso: '2027-02-15',
      extraTopUpAmountNaira: 150_000,
      simDepositIndex: 2,
      simDelayDays: 10,
      simMissedFullDeposit: false,
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

export function DailySavingsEnginePage() {
  const [activePreset, setActivePreset] = useState<string>('nov-1-meeting')
  const [activeTab, setActiveTab] = useState<'compare' | 'dynamic' | 'formula' | 'ledger'>('compare')
  const [showNumbersInFormula, setShowNumbersInFormula] = useState<boolean>(false)

  const {
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DailyEngineFormValues>({
    resolver: zodResolver(dailyEngineFormSchema),
    defaultValues: PRESETS[0].values,
    mode: 'onChange',
  })

  const watched = useWatch({ control })

  const calc = useMemo(() => {
    return computeDailySavingsEngine({
      targetRentNaira: Number(watched.targetRentNaira) || 0,
      planId: (watched.planId as EnginePlanId) || 'FULL_LOCK',
      startDateIso: watched.startDateIso || '2026-11-01',
      rentDueDateIso: watched.rentDueDateIso || '2027-10-31',
      upfrontDepositNaira: Number(watched.upfrontDepositNaira) || 0,
      depositDay: Number(watched.depositDay ?? 28),
      payFirstMonthOnStartDay: Boolean(watched.payFirstMonthOnStartDay),
      enableExtraTopUp: Boolean(watched.enableExtraTopUp),
      extraTopUpDateIso: watched.extraTopUpDateIso || '2027-02-15',
      extraTopUpAmountNaira: Number(watched.extraTopUpAmountNaira) || 0,
      simDepositIndex: Number(watched.simDepositIndex ?? 3),
      simDelayDays: Number(watched.simDelayDays ?? 0),
      simMissedFullDeposit: Boolean(watched.simMissedFullDeposit),
      simPartialAmountNaira: null,
    })
  }, [watched])

  const setRentDueByActiveMonths = (activeMonths: number) => {
    const startIso = watched.startDateIso || '2026-11-01'
    const nextRentDue = addMonthsToIso(startIso, activeMonths + 1)
    setActivePreset('')
    setValue('rentDueDateIso', nextRentDue, { shouldValidate: true })
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
    parseIsoDateUtc(watched.startDateIso || '2026-11-01', Date.UTC(2026, 10, 1)) + 60 * 86_400_000,
  )

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setActivePreset(preset.id)
    reset(preset.values)
  }

  const safeTotal = Math.max(1, calc.closingBalanceAtUnlock)
  const upfrontPct = (calc.effectiveUpfront / safeTotal) * 100
  const periodicCash = Math.max(0, calc.totalUserContribution - calc.effectiveUpfront)
  const periodicPct = (periodicCash / safeTotal) * 100
  const interestPct = Math.max(0, 100 - upfrontPct - periodicPct)
  const currentUpfrontPct =
    calc.targetRent > 0 ? Math.round((calc.effectiveUpfront / calc.targetRent) * 100) : 0

  return (
    <div className="savings-engine">
      {/* Slim Header with Monthly / Daily Engine Switcher */}
      <header className="savings-engine__topbar">
        <div className="savings-engine__topbar-inner">
          <div className="savings-engine__topbar-left">
            <Link href="/" className="savings-engine__brand">
              <UpwardLogo size={24} color="var(--clay)" />
              <span>Upward</span>
            </Link>

            <nav className="savings-engine__mode-nav" aria-label="Engine version">
              <Link href="/savings-engine" className="savings-engine__mode-link">
                Monthly (Old)
              </Link>
              <Link
                href="/savings-engine/daily"
                className="savings-engine__mode-link savings-engine__mode-link--active"
                aria-current="page"
              >
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
            <div className="savings-engine__hero-badge">
              <Sparkles size={12} />
              <span>Daily Compounding Engine · Live Comparison</span>
            </div>
            <h1 className="savings-engine__title">Daily Rent Savings Simulator</h1>
            <p className="savings-engine__subtitle">
              Exact calendar-day compounding from every deposit date to T&minus;30 unlock — side by
              side with the previous monthly model.
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
          {/* LEFT: Inputs Card */}
          <section className="savings-engine__card">
            <form onSubmit={(e) => e.preventDefault()} noValidate>
              {/* 1. Annual Rent */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <label className="savings-engine__label" htmlFor="daily-rent-input">
                    Annual Rent
                  </label>
                  <span className="savings-engine__meta">Target (R)</span>
                </div>
                <div className="savings-engine__input-wrap">
                  <span className="savings-engine__currency">₦</span>
                  <input
                    id="daily-rent-input"
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

              {/* 2. Plan & Daily Rate Convention */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <span className="savings-engine__label">Savings Plan</span>
                  <span className="savings-engine__meta">
                    {(calc.dailyRate * 100).toFixed(4)}% / day
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

              {/* 3. Exact Calendar Timeline & Preferred Payday */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <span className="savings-engine__label">Exact Calendar Dates</span>
                  <span className="savings-engine__meta">
                    {calc.activeCompoundingDays}d · {calc.numberOfDeposits} deposits
                  </span>
                </div>

                <div className="savings-engine__date-grid">
                  <div>
                    <label className="savings-engine__mini-label" htmlFor="daily-start-date">
                      Start Date
                    </label>
                    <input
                      id="daily-start-date"
                      type="date"
                      className="savings-engine__date-input"
                      value={watched.startDateIso || '2026-11-01'}
                      onChange={(e) => {
                        if (e.target.value) handleStartDateChange(e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <label className="savings-engine__mini-label" htmlFor="daily-rent-due">
                      Rent Due Date
                    </label>
                    <input
                      id="daily-rent-due"
                      type="date"
                      min={minRentDueDateIso}
                      className="savings-engine__date-input"
                      value={watched.rentDueDateIso || '2027-10-31'}
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
                        calc.numberOfDeposits === m ? 'savings-engine__chip--active' : ''
                      }`}
                      onClick={() => setRentDueByActiveMonths(m)}
                    >
                      {m} mo
                    </button>
                  ))}
                </div>

                <div className="savings-engine__calendar-inputs savings-engine__calendar-inputs--two" style={{ marginTop: 10 }}>
                  <div>
                    <label className="savings-engine__mini-label" htmlFor="daily-deposit-day">
                      Monthly Deposit Day (1–28)
                    </label>
                    <input
                      id="daily-deposit-day"
                      type="number"
                      min={1}
                      max={28}
                      disabled={calc.payFirstMonthOnStartDay}
                      className="savings-engine__mini-input"
                      value={calc.depositDay}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (Number.isNaN(v)) return
                        setActivePreset('')
                        setValue('depositDay', Math.min(28, Math.max(1, v)))
                      }}
                    />
                  </div>
                  <div className="savings-engine__day0-toggle">
                    <button
                      type="button"
                      className="savings-engine__topup-trigger"
                      onClick={() => {
                        setActivePreset('')
                        setValue('payFirstMonthOnStartDay', !calc.payFirstMonthOnStartDay)
                      }}
                    >
                      <span style={{ fontSize: 12 }}>Deposit #1 on Day 0</span>
                      <span
                        className={`savings-engine__switch ${
                          calc.payFirstMonthOnStartDay ? 'savings-engine__switch--on' : ''
                        }`}
                      >
                        <span className="savings-engine__switch-knob" />
                      </span>
                    </button>
                  </div>
                </div>

                <div className="savings-engine__duration-pill">
                  <Calendar size={14} style={{ flexShrink: 0, color: 'var(--skin-primary)' }} />
                  <span>
                    <strong>{calc.daysUntilRent}d</strong> to rent &minus; 30d ={' '}
                    <strong>{calc.activeCompoundingDays} active compounding days</strong> · Unlocks{' '}
                    <strong>{calc.unlockDateLabel}</strong>
                  </span>
                </div>

                {watched.planId === 'RENT_PROTEC' && !calc.isRentProtecEligible && (
                  <div className="savings-engine__note savings-engine__note--warn">
                    <AlertTriangle size={14} />
                    <span>Rent Protec needs at least 6 months before rent due date.</span>
                  </div>
                )}
              </div>

              {/* 4. Upfront Deposit */}
              <div className="savings-engine__field">
                <div className="savings-engine__field-top">
                  <label className="savings-engine__label" htmlFor="daily-upfront-input">
                    Upfront Deposit (Day 0)
                  </label>
                  <span className="savings-engine__meta">{currentUpfrontPct}% of rent</span>
                </div>
                <div className="savings-engine__input-wrap">
                  <span className="savings-engine__currency">₦</span>
                  <input
                    id="daily-upfront-input"
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
                      Min upfront (active {calc.activeCompoundingDays}d horizon):{' '}
                      <strong>{calc.minUpfrontPct}%</strong> ({formatNaira(calc.minUpfrontNaira)})
                    </span>
                  </div>
                )}
              </div>

              {/* Optional Exact-Date Extra Top-Up */}
              <div className="savings-engine__topup">
                <button
                  type="button"
                  className="savings-engine__topup-trigger"
                  onClick={() => setValue('enableExtraTopUp', !watched.enableExtraTopUp)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <TrendingDown size={15} color="var(--skin-teal)" />
                    <span>Test an exact-date top-up</span>
                  </span>
                  <span
                    className={`savings-engine__switch ${
                      watched.enableExtraTopUp ? 'savings-engine__switch--on' : ''
                    }`}
                  >
                    <span className="savings-engine__switch-knob" />
                  </span>
                </button>

                {watched.enableExtraTopUp && (
                  <div className="savings-engine__topup-body">
                    <div>
                      <label className="savings-engine__mini-label" htmlFor="daily-topup-date">
                        Top-Up Date (earns from this exact day)
                      </label>
                      <input
                        id="daily-topup-date"
                        type="date"
                        min={calc.startDateIso}
                        max={calc.unlockDateIso}
                        className="savings-engine__date-input"
                        value={calc.topUpDateIso}
                        onChange={(e) => {
                          if (e.target.value) setValue('extraTopUpDateIso', e.target.value)
                        }}
                      />
                    </div>
                    <div>
                      <label className="savings-engine__mini-label" htmlFor="daily-topup-amt">
                        Extra Amount
                      </label>
                      <div className="savings-engine__input-wrap">
                        <span className="savings-engine__currency">₦</span>
                        <input
                          id="daily-topup-amt"
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

          {/* RIGHT: Hero Answer + 4 Interactive Tabs */}
          <div className="savings-engine__right">
            {/* Hero Answer Card */}
            <section className="savings-engine__answer">
              <div className="savings-engine__answer-top">
                <div>
                  <div className="savings-engine__answer-label">
                    Daily-Compounded Target Deposit
                  </div>
                  <div className="savings-engine__answer-amount">
                    {formatNaira(calc.scheduledDeposit)}
                    <span className="savings-engine__answer-unit">
                      / deposit ({calc.numberOfDeposits}&times;)
                    </span>
                  </div>
                  <div className="savings-engine__answer-sub">
                    {calc.topUpApplied ? (
                      <>
                        Drops to <strong>{formatNaira(calc.reducedDepositAfterTopUp)}</strong> after{' '}
                        {calc.topUpDateLabel} top-up ({calc.topUpDaysToUnlock}d compounding · &minus;
                        {formatNaira(calc.depositDropAfterTopUp)}/mo)
                      </>
                    ) : (
                      <>
                        vs. Old Monthly Engine:{' '}
                        <strong>
                          {formatNaira(calc.comparison.monthlyDepositDelta, true)}/mo
                        </strong>{' '}
                        ({formatNaira(calc.comparison.monthlyEngineDeposit)} old &rarr;{' '}
                        {formatNaira(calc.scheduledDeposit)} daily)
                      </>
                    )}
                  </div>
                </div>

                <span className="savings-engine__discount-pill">
                  {calc.effectiveDiscountPct}% off rent
                </span>
              </div>

              {calc.reachedTargetEarly && calc.earlyTargetDateLabel && (
                <div className="savings-engine__early-hit">
                  <CheckCircle2 size={15} />
                  <span>
                    Target hit early on <strong>{calc.earlyTargetDateLabel}</strong>! Leaving funds
                    until {calc.unlockDateLabel} earns an extra{' '}
                    <strong>+{formatNaira(calc.extraInterestIfKeptToUnlock)}</strong>.
                  </span>
                </div>
              )}

              <div className="savings-engine__summary-strip">
                <div>
                  <div className="savings-engine__stat-label">You Put In</div>
                  <div className="savings-engine__stat-val">
                    {formatNaira(calc.totalUserContribution)}
                  </div>
                </div>
                <div>
                  <div className="savings-engine__stat-label">Daily Interest Earned</div>
                  <div className="savings-engine__stat-val savings-engine__stat-val--green">
                    +{formatNaira(calc.totalInterestEarned)}
                  </div>
                </div>
                <div>
                  <div className="savings-engine__stat-label">Balance on {calc.unlockDateLabel}</div>
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
                  style={{ width: `${periodicPct}%` }}
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
                  Deposits {formatNaira(periodicCash)}
                </span>
                <span>
                  <span className="savings-engine__dot" style={{ background: '#4ade80' }} />
                  Daily Interest +{formatNaira(calc.totalInterestEarned)}
                </span>
              </div>
            </section>

            {/* Tabbed Explorer */}
            <section className="savings-engine__card">
              <div className="savings-engine__tabs" role="tablist">
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
                  <span>Monthly vs. Daily</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'dynamic'}
                  className={`savings-engine__tab ${
                    activeTab === 'dynamic' ? 'savings-engine__tab--active' : ''
                  }`}
                  onClick={() => setActiveTab('dynamic')}
                >
                  <Activity size={15} />
                  <span>Late / Missed Catch-Up</span>
                </button>
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
                  <span>Daily Formula</span>
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
                  <span>Calendar Ledger</span>
                </button>
              </div>

              {/* TAB 1: Side-by-Side Monthly (Old) vs. Daily (New) Comparison */}
              {activeTab === 'compare' && (
                <div className="savings-engine__stack">
                  <div className="savings-engine__compare-cards">
                    <div className="savings-engine__model savings-engine__model--ok">
                      <div className="savings-engine__model-head">
                        <span>New Daily Engine</span>
                        <span className="savings-engine__tag savings-engine__tag--ok">
                          {Math.abs(calc.comparison.dailyRealVariance) < 500
                            ? 'Exact Target'
                            : `Variance ${formatNaira(calc.comparison.dailyRealVariance, true)}`}
                        </span>
                      </div>
                      <div className="savings-engine__model-num">
                        {formatNaira(calc.comparison.dailyEngineDeposit)} / mo
                      </div>
                      <div className="savings-engine__model-sub">
                        Total out-of-pocket:{' '}
                        <strong>{formatNaira(calc.comparison.dailyEngineTotalCash)}</strong>
                        <br />
                        Real balance on {calc.unlockDateLabel}:{' '}
                        <strong>{formatNaira(calc.comparison.dailyRealBalanceAtUnlock)}</strong>
                      </div>
                    </div>

                    <div
                      className={`savings-engine__model ${
                        calc.comparison.oldMonthlyRealVariance < -500
                          ? 'savings-engine__model--bad'
                          : 'savings-engine__model--warn'
                      }`}
                    >
                      <div className="savings-engine__model-head">
                        <span>Old Monthly Engine</span>
                        <span
                          className={`savings-engine__tag ${
                            calc.comparison.oldMonthlyRealVariance < -500
                              ? 'savings-engine__tag--bad'
                              : 'savings-engine__tag--teal'
                          }`}
                        >
                          {calc.comparison.oldMonthlyRealVariance >= 0
                            ? `Over by ${formatNaira(calc.comparison.oldMonthlyRealVariance, true)}`
                            : `Short ${formatNaira(calc.comparison.oldMonthlyRealVariance, true)}`}
                        </span>
                      </div>
                      <div className="savings-engine__model-num">
                        {formatNaira(calc.comparison.monthlyEngineDeposit)} / mo
                      </div>
                      <div className="savings-engine__model-sub">
                        Total out-of-pocket:{' '}
                        <strong>{formatNaira(calc.comparison.monthlyEngineTotalCash)}</strong>
                        <br />
                        Real balance on {calc.unlockDateLabel}:{' '}
                        <strong>
                          {formatNaira(calc.comparison.oldMonthlyRealBalanceAtUnlock)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* MoteleJesu's 2-Tenant Date Proof (Nov 1 vs Nov 20) */}
                  <div className="savings-engine__calendar-box">
                    <div className="savings-engine__calendar-head">
                      <span className="savings-engine__calendar-title">
                        <Calendar size={14} />
                        <span>
                          2-Tenant Proof: Start {calc.twoTenantProof.tenantAStartLabel} vs.{' '}
                          {calc.twoTenantProof.tenantBStartLabel}
                        </span>
                      </span>
                      <span className="savings-engine__meta">
                        {calc.twoTenantProof.dayDifference} days apart · same rent due date
                      </span>
                    </div>

                    <div className="savings-engine__table-wrap">
                      <table className="savings-engine__table">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th className="savings-engine__num">
                              Tenant A ({calc.twoTenantProof.tenantAStartLabel.split(',')[0]})
                            </th>
                            <th className="savings-engine__num">
                              Tenant B ({calc.twoTenantProof.tenantBStartLabel.split(',')[0]})
                            </th>
                            <th className="savings-engine__num">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Old Monthly Engine (fixed)</td>
                            <td className="savings-engine__num">
                              {formatNaira(calc.twoTenantProof.oldMonthlyBothDeposit)}/mo
                            </td>
                            <td className="savings-engine__num">
                              {formatNaira(calc.twoTenantProof.oldMonthlyBothDeposit)}/mo
                            </td>
                            <td className="savings-engine__num" style={{ color: '#b45309' }}>
                              ₦0 (ignores 19d!)
                            </td>
                          </tr>
                          <tr>
                            <td>Old Engine Real Outcome</td>
                            <td className="savings-engine__num">
                              {formatNaira(calc.twoTenantProof.tenantAOldRealBalance)}
                            </td>
                            <td className="savings-engine__num">
                              {formatNaira(calc.twoTenantProof.tenantBOldRealBalance)}
                            </td>
                            <td className="savings-engine__num" style={{ color: '#b91c1c' }}>
                              {formatNaira(
                                calc.twoTenantProof.tenantBOldRealBalance -
                                  calc.twoTenantProof.tenantAOldRealBalance,
                                true,
                              )}
                            </td>
                          </tr>
                          <tr className="savings-engine__row--unlock">
                            <td>New Daily Engine Target</td>
                            <td className="savings-engine__num">
                              <strong>
                                {formatNaira(calc.twoTenantProof.tenantADailyDeposit)}/mo
                              </strong>
                            </td>
                            <td className="savings-engine__num">
                              <strong>
                                {formatNaira(calc.twoTenantProof.tenantBDailyDeposit)}/mo
                              </strong>
                            </td>
                            <td className="savings-engine__num" style={{ color: '#15803d' }}>
                              <strong>
                                {formatNaira(calc.twoTenantProof.dailyDepositDifference, true)}/mo
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td>New Daily Engine Outcome</td>
                            <td className="savings-engine__num">
                              {formatNaira(calc.twoTenantProof.tenantADailyBalance)}
                            </td>
                            <td className="savings-engine__num">
                              {formatNaira(calc.twoTenantProof.tenantBDailyBalance)}
                            </td>
                            <td className="savings-engine__num" style={{ color: '#15803d' }}>
                              Both hit {formatNaira(calc.targetRent)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Dynamic Catch-Up / Late / Missed / Early Deposit Simulator */}
              {activeTab === 'dynamic' && (
                <div className="savings-engine__stack">
                  <div className="savings-engine__calendar-box">
                    <div className="savings-engine__calendar-head">
                      <span className="savings-engine__calendar-title">
                        <Clock size={14} />
                        <span>Simulate a Delayed, Early, or Missed Deposit</span>
                      </span>
                      <span className="savings-engine__meta">
                        Deposit #{calc.dynamicCatchUp.depositIndex} (due{' '}
                        {calc.dynamicCatchUp.scheduledDateLabel})
                      </span>
                    </div>

                    <div className="savings-engine__calendar-inputs savings-engine__calendar-inputs--two">
                      <div>
                        <label className="savings-engine__mini-label" htmlFor="sim-step-select">
                          Deposit Checkpoint
                        </label>
                        <select
                          id="sim-step-select"
                          className="savings-engine__mini-input"
                          value={calc.dynamicCatchUp.depositIndex}
                          onChange={(e) => setValue('simDepositIndex', Number(e.target.value))}
                        >
                          {calc.rows.slice(1).map((r) => (
                            <option key={r.step} value={r.step}>
                              Deposit #{r.step} ({r.dateLabel})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="savings-engine__day0-toggle">
                        <button
                          type="button"
                          className="savings-engine__topup-trigger"
                          onClick={() =>
                            setValue('simMissedFullDeposit', !calc.dynamicCatchUp.missedFullDeposit)
                          }
                        >
                          <span style={{ fontSize: 12 }}>Missed this deposit completely</span>
                          <span
                            className={`savings-engine__switch ${
                              calc.dynamicCatchUp.missedFullDeposit ? 'savings-engine__switch--on' : ''
                            }`}
                          >
                            <span className="savings-engine__switch-knob" />
                          </span>
                        </button>
                      </div>
                    </div>

                    {!calc.dynamicCatchUp.missedFullDeposit && (
                      <div>
                        <div className="savings-engine__field-top" style={{ marginBottom: 4 }}>
                          <span className="savings-engine__mini-label" style={{ marginBottom: 0 }}>
                            Actual Deposit Timing ({calc.dynamicCatchUp.actualDateLabel})
                          </span>
                          <span className="savings-engine__meta">
                            {calc.dynamicCatchUp.delayDays === 0
                              ? 'On payday'
                              : calc.dynamicCatchUp.delayDays > 0
                                ? `${calc.dynamicCatchUp.delayDays} days late`
                                : `${Math.abs(calc.dynamicCatchUp.delayDays)} days early`}
                          </span>
                        </div>
                        <input
                          type="range"
                          className="savings-engine__slider"
                          style={{ marginTop: 0 }}
                          min={-15}
                          max={35}
                          step={1}
                          value={calc.dynamicCatchUp.delayDays}
                          onChange={(e) => setValue('simDelayDays', Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Two Actionable Options Shown to User */}
                  <div className="savings-engine__compare-cards">
                    <div className="savings-engine__model savings-engine__model--ok">
                      <div className="savings-engine__model-head">
                        <span>
                          {calc.dynamicCatchUp.missedFullDeposit
                            ? 'Option A: Recalculate Remaining'
                            : 'Option A: Pay Today to Stay on Plan'}
                        </span>
                        <span className="savings-engine__tag savings-engine__tag--ok">
                          {calc.dynamicCatchUp.missedFullDeposit
                            ? `${calc.dynamicCatchUp.remainingDepositsCount} deposits left`
                            : formatNaira(calc.dynamicCatchUp.catchUpDeltaVsScheduledNaira, true)}
                        </span>
                      </div>
                      <div className="savings-engine__model-num">
                        {calc.dynamicCatchUp.missedFullDeposit
                          ? `${formatNaira(calc.dynamicCatchUp.spreadRemainingDepositNaira)} / mo`
                          : formatNaira(calc.dynamicCatchUp.catchUpTodayAmountNaira)}
                      </div>
                      <div className="savings-engine__model-sub">
                        {calc.dynamicCatchUp.missedFullDeposit ? (
                          <>
                            Missing Deposit #{calc.dynamicCatchUp.depositIndex} raises each
                            remaining deposit by{' '}
                            <strong>
                              {formatNaira(calc.dynamicCatchUp.spreadDeltaPerMonthNaira, true)}/mo
                            </strong>{' '}
                            (covers both missed principal &amp; lost compounding interest).
                          </>
                        ) : (
                          <>
                            Scheduled on {calc.dynamicCatchUp.scheduledDateLabel}:{' '}
                            <strong>{formatNaira(calc.dynamicCatchUp.scheduledDepositNaira)}</strong>
                            . Saving on {calc.dynamicCatchUp.actualDateLabel} adjusts it to keep
                            all remaining months unchanged.
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className={`savings-engine__model ${
                        calc.dynamicCatchUp.unadjustedVarianceAtUnlock < -200
                          ? 'savings-engine__model--bad'
                          : 'savings-engine__model--warn'
                      }`}
                    >
                      <div className="savings-engine__model-head">
                        <span>If Left Unadjusted (Static Plan)</span>
                        <span
                          className={`savings-engine__tag ${
                            calc.dynamicCatchUp.unadjustedVarianceAtUnlock < -200
                              ? 'savings-engine__tag--bad'
                              : 'savings-engine__tag--teal'
                          }`}
                        >
                          {formatNaira(calc.dynamicCatchUp.unadjustedVarianceAtUnlock, true)}
                        </span>
                      </div>
                      <div className="savings-engine__model-num">
                        {formatNaira(calc.dynamicCatchUp.unadjustedBalanceAtUnlock)}
                      </div>
                      <div className="savings-engine__model-sub">
                        {calc.dynamicCatchUp.missedFullDeposit ? (
                          <>
                            Without catch-up, you fall short of{' '}
                            <strong>{formatNaira(calc.targetRent)}</strong> by{' '}
                            <strong>
                              {formatNaira(Math.abs(calc.dynamicCatchUp.unadjustedVarianceAtUnlock))}
                            </strong>{' '}
                            ({formatNaira(calc.dynamicCatchUp.scheduledDepositNaira)} principal +{' '}
                            {formatNaira(calc.dynamicCatchUp.missedInterestEffectNaira)} lost
                            interest).
                          </>
                        ) : calc.dynamicCatchUp.delayDays >= 0 ? (
                          <>
                            Paying the old fixed amount {calc.dynamicCatchUp.delayDays}d late loses{' '}
                            <strong>
                              {formatNaira(Math.abs(calc.dynamicCatchUp.unadjustedVarianceAtUnlock))}
                            </strong>{' '}
                            in compounded interest by unlock.
                          </>
                        ) : (
                          <>
                            Paying {Math.abs(calc.dynamicCatchUp.delayDays)}d early earns{' '}
                            <strong>
                              +{formatNaira(Math.abs(calc.dynamicCatchUp.unadjustedVarianceAtUnlock))}
                            </strong>{' '}
                            extra interest — or lowers your remaining deposits to{' '}
                            <strong>{formatNaira(calc.dynamicCatchUp.spreadRemainingDepositNaira)}</strong>.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Daily Formula Breakdown */}
              {activeTab === 'formula' && (
                <div>
                  <div className="savings-engine__formula-bar">
                    {!showNumbersInFormula ? (
                      <div className="savings-engine__math">
                        <span className="savings-engine__math-var">P</span>
                        <span>=</span>
                        <span>&lceil;</span>
                        <span className="savings-engine__frac">
                          <span className="savings-engine__frac-num">
                            <span className="savings-engine__math-var">R</span> &minus;{' '}
                            <span className="savings-engine__math-var">B</span>
                            <sub>t</sub>(1 + <span className="savings-engine__math-var">r</span>
                            <sub>d</sub>)
                            <sup>
                              <span className="savings-engine__math-var">D</span>
                              <sub>t</sub>
                            </sup>
                          </span>
                          <span className="savings-engine__frac-den">
                            &sum;<sub>k=1..n</sub> (1 +{' '}
                            <span className="savings-engine__math-var">r</span>
                            <sub>d</sub>)
                            <sup>
                              <span className="savings-engine__math-var">d</span>
                              <sub>k</sub>
                            </sup>
                          </span>
                        </span>
                        <span>&rceil;</span>
                      </div>
                    ) : (
                      <div className="savings-engine__math" style={{ fontSize: 14 }}>
                        <strong style={{ color: 'var(--skin-primary)' }}>
                          {formatNaira(calc.scheduledDeposit)}
                        </strong>
                        <span>=</span>
                        <span>&lceil;</span>
                        <span className="savings-engine__frac">
                          <span className="savings-engine__frac-num">
                            {formatNaira(calc.targetRent)} &minus;{' '}
                            {formatNaira(calc.effectiveUpfront)} &times; (1 +{' '}
                            {(calc.dailyRate * 100).toFixed(4)}%)<sup>{calc.activeCompoundingDays}</sup>
                          </span>
                          <span className="savings-engine__frac-den">
                            {calc.dailyGrowthFactor.toFixed(4)}
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

                  <div className="savings-engine__steps">
                    <div className="savings-engine__step-row">
                      <div className="savings-engine__step-left">
                        <span className="savings-engine__step-idx">1</span>
                        <div>
                          <div className="savings-engine__step-name">
                            Daily compounding rate (r<sub>d</sub>)
                          </div>
                          <div className="savings-engine__step-eq">
                            (1 + {calc.annualRatePct}%)^(1/365) &minus; 1
                          </div>
                        </div>
                      </div>
                      <div className="savings-engine__step-val">
                        {(calc.dailyRate * 100).toFixed(5)}% / day
                      </div>
                    </div>

                    <div className="savings-engine__step-row">
                      <div className="savings-engine__step-left">
                        <span className="savings-engine__step-idx">2</span>
                        <div>
                          <div className="savings-engine__step-name">
                            Upfront grows for exactly {calc.activeCompoundingDays} days (FV₀)
                          </div>
                          <div className="savings-engine__step-eq">
                            {formatNaira(calc.effectiveUpfront)} &times; (1 + r<sub>d</sub>)^
                            {calc.activeCompoundingDays} ({calc.startDateLabel} &rarr;{' '}
                            {calc.unlockDateLabel})
                          </div>
                        </div>
                      </div>
                      <div className="savings-engine__step-val">{formatNaira(calc.fvUpfront)}</div>
                    </div>

                    <div className="savings-engine__step-row">
                      <div className="savings-engine__step-left">
                        <span className="savings-engine__step-idx">3</span>
                        <div>
                          <div className="savings-engine__step-name">Remaining funding gap</div>
                          <div className="savings-engine__step-eq">
                            {formatNaira(calc.targetRent)} &minus; {formatNaira(calc.fvUpfront)}
                          </div>
                        </div>
                      </div>
                      <div className="savings-engine__step-val">{formatNaira(calc.fundingGap)}</div>
                    </div>

                    <div className="savings-engine__step-row savings-engine__step-row--result">
                      <div className="savings-engine__step-left">
                        <span className="savings-engine__step-idx">4</span>
                        <div>
                          <div className="savings-engine__step-name">
                            Exact daily growth factor (F<sub>daily</sub> ={' '}
                            {calc.dailyGrowthFactor.toFixed(4)})
                          </div>
                          <div className="savings-engine__step-eq">
                            &lceil; {formatNaira(calc.fundingGap)} &divide;{' '}
                            {calc.dailyGrowthFactor.toFixed(4)} &rceil; across{' '}
                            {calc.numberOfDeposits} exact calendar deposit dates
                          </div>
                        </div>
                      </div>
                      <div className="savings-engine__step-val">
                        {formatNaira(calc.scheduledDeposit)} / mo
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Exact Calendar Deposit-by-Deposit Daily Ledger */}
              {activeTab === 'ledger' && (
                <div className="savings-engine__table-wrap">
                  <table className="savings-engine__table">
                    <thead>
                      <tr>
                        <th>Deposit</th>
                        <th>Date</th>
                        <th className="savings-engine__num">Days to Unlock</th>
                        <th className="savings-engine__num">Deposit</th>
                        <th className="savings-engine__num">Period Interest</th>
                        <th className="savings-engine__num">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.rows.map((row) => (
                        <tr
                          key={row.step}
                          className={
                            row.isFinalDeposit
                              ? 'savings-engine__row--unlock'
                              : row.extraTopUpBefore > 0
                                ? 'savings-engine__row--topup'
                                : undefined
                          }
                        >
                          <td>
                            {row.label}
                            {row.extraTopUpBefore > 0 && (
                              <span className="savings-engine__tag savings-engine__tag--teal">
                                +{formatNaira(row.extraTopUpBefore)} top-up ({calc.topUpDateLabel})
                              </span>
                            )}
                          </td>
                          <td>{row.dateLabel}</td>
                          <td className="savings-engine__num">{row.daysToUnlock}d</td>
                          <td className="savings-engine__num">
                            {formatNaira(row.depositAmount + row.extraTopUpBefore)}
                          </td>
                          <td className="savings-engine__num" style={{ color: '#15803d' }}>
                            {row.step === 0 ? '—' : `+${formatNaira(row.interestEarnedInPeriod)}`}
                          </td>
                          <td className="savings-engine__num">
                            <strong>{formatNaira(row.closingBalanceAfterDeposit)}</strong>
                          </td>
                        </tr>
                      ))}
                      <tr className="savings-engine__row--unlock">
                        <td>
                          <strong>Unlock (T&minus;30)</strong>
                        </td>
                        <td>
                          <strong>{calc.unlockDateLabel}</strong>
                        </td>
                        <td className="savings-engine__num">0d</td>
                        <td className="savings-engine__num">—</td>
                        <td className="savings-engine__num" style={{ color: '#15803d' }}>
                          <strong>
                            +
                            {formatNaira(
                              Math.max(
                                0,
                                calc.closingBalanceAtUnlock -
                                  (calc.rows[calc.rows.length - 1]?.closingBalanceAfterDeposit ?? 0),
                              ),
                            )}
                          </strong>
                        </td>
                        <td className="savings-engine__num">
                          <strong>{formatNaira(calc.closingBalanceAtUnlock)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
