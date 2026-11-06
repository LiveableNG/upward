'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, AlertCircle, ArrowRight, Sparkles, Home } from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { useSimulateRentSavings } from '../hooks/useRentSavings'
import { useAuth } from '@/features/auth/AuthContext'

interface RentCalculatorViewProps {
  onProceedToSetup: (config: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    periodicDepositKobo: number
  }) => void
}

export function RentCalculatorView({ onProceedToSetup }: RentCalculatorViewProps) {
  const { user } = useAuth()
  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  const [targetAmountRaw, setTargetAmountRaw] = useState<string>(() =>
    activeProperty?.rentAmount ? formatCurrencyInput(activeProperty.rentAmount) : '',
  )
  const [contractualDueDate, setContractualDueDate] = useState<string>(() =>
    activeProperty?.rentEndDate ? activeProperty.rentEndDate.split('T')[0] : '',
  )
  const [minDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return tomorrow.toISOString().split('T')[0]
  })
  const [initialDepositNaira] = useState<number>(0)
  const [cadence, setCadence] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const [monthlyIncomeRaw, setMonthlyIncomeRaw] = useState<string>('')

  // Sync if activeProperty loads asynchronously (React recommended pattern without effect setState)
  const [prevPropertyId, setPrevPropertyId] = useState<number | string | undefined>(
    activeProperty?.id,
  )
  if (activeProperty?.id !== prevPropertyId) {
    setPrevPropertyId(activeProperty?.id)
    if (activeProperty?.rentAmount && !targetAmountRaw) {
      setTargetAmountRaw(formatCurrencyInput(activeProperty.rentAmount))
    }
    if (activeProperty?.rentEndDate && !contractualDueDate) {
      setContractualDueDate(activeProperty.rentEndDate.split('T')[0])
    }
  }

  const targetAmountNaira = parseCurrencyInput(targetAmountRaw) || 0
  const monthlyIncomeNaira = parseCurrencyInput(monthlyIncomeRaw) || 0

  const simulateMutation = useSimulateRentSavings()

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseCurrencyInput(e.target.value)
    setTargetAmountRaw(num ? formatCurrencyInput(num) : '')
  }

  const handleMonthlyIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseCurrencyInput(e.target.value)
    setMonthlyIncomeRaw(num ? formatCurrencyInput(num) : '')
  }

  const mutateSimulate = simulateMutation.mutate

  useEffect(() => {
    if (!targetAmountNaira || !contractualDueDate) return

    mutateSimulate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: Math.round(initialDepositNaira * 100),
      cadence,
      monthly_income_kobo: monthlyIncomeNaira ? Math.round(monthlyIncomeNaira * 100) : undefined,
    })
  }, [
    targetAmountNaira,
    contractualDueDate,
    initialDepositNaira,
    cadence,
    monthlyIncomeNaira,
    mutateSimulate,
  ])

  const simData = simulateMutation.data
  const periodicDepositNaira = simData ? simData.periodic_deposit_kobo / 100 : 0
  const projectedYieldNaira = simData ? simData.projected_yield_kobo / 100 : 0
  const daysRemaining = simData ? simData.days_remaining : 0

  return (
    <div className="rent-calculator">
      <div className="rent-calculator__card">
        <h1 className="rent-calculator__title">Rent Savings & Lock Calculator</h1>
        <p className="rent-calculator__subtitle">
          Calculate your exact runway, earn 14.5% annual compound yield, and lock in your rent peace
          of mind.
        </p>

        {activeProperty && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--surface-sunken, #f8f6f3)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'var(--clay-faint)',
                color: 'var(--clay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Home size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
                  {activeProperty.title || 'Linked Property'}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                  }}
                >
                  Settings Sourced
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Rental obligation automatically pre-filled from your settings.
              </p>
            </div>
          </div>
        )}

        <form className="rent-calculator__form" onSubmit={(e) => e.preventDefault()}>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label" htmlFor="calc-target">
              Target Rent + Service Charge
            </label>
            <div className="rent-calculator__input-wrapper">
              <span className="rent-calculator__input-prefix">₦</span>
              <input
                id="calc-target"
                type="text"
                inputMode="numeric"
                className="rent-calculator__input"
                value={targetAmountRaw}
                onChange={handleTargetAmountChange}
                placeholder="e.g. 2,400,000"
                required
              />
            </div>
          </div>

          <div className="rent-calculator__field">
            <label className="rent-calculator__label" htmlFor="calc-due-date">
              Exact Lease Expiration Date
            </label>
            <div className="rent-calculator__input-wrapper">
              <input
                id="calc-due-date"
                type="date"
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={contractualDueDate}
                onChange={(e) => setContractualDueDate(e.target.value)}
                min={minDate}
                required
              />
            </div>
          </div>

          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Savings Cadence</label>
            <div className="rent-calculator__cadence-tabs">
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`rent-calculator__cadence-btn ${
                    cadence === tab ? 'rent-calculator__cadence-btn--active' : ''
                  }`}
                  onClick={() => setCadence(tab)}
                >
                  {tab === 'DAILY' ? 'Daily' : tab === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>

          <div className="rent-calculator__field">
            <label className="rent-calculator__label" htmlFor="calc-income">
              Declared Monthly Take-Home Pay (Affordability Check)
            </label>
            <div className="rent-calculator__input-wrapper">
              <span className="rent-calculator__input-prefix">₦</span>
              <input
                id="calc-income"
                type="text"
                inputMode="numeric"
                className="rent-calculator__input"
                value={monthlyIncomeRaw}
                onChange={handleMonthlyIncomeChange}
                placeholder="e.g. 800,000 (Optional)"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Dynamic Results Card */}
      <div className="rent-calculator__results">
        <div className="rent-calculator__results-head">
          <span className="rent-calculator__days-badge">
            <Calendar size={13} />
            {daysRemaining} Days to Rent Day
          </span>
          <span className="rent-calculator__days-badge">
            <Sparkles size={13} />
            14.5% p.a. Net Yield
          </span>
        </div>

        <div>
          <div className="rent-calculator__deposit-figure">
            {formatCurrency(periodicDepositNaira, 'NGN')}
          </div>
          <span className="rent-calculator__deposit-cadence">
            Required deposit per {cadence.toLowerCase().replace('ly', '')}
          </span>
        </div>

        <div className="rent-calculator__grid">
          <div className="rent-calculator__grid-item">
            <span className="rent-calculator__grid-label">Total Contribution</span>
            <span className="rent-calculator__grid-val">
              {formatCurrency(simData ? simData.total_tenant_contribution_kobo / 100 : 0, 'NGN')}
            </span>
          </div>
          <div className="rent-calculator__grid-item">
            <span className="rent-calculator__grid-label">Projected Yield</span>
            <span className="rent-calculator__grid-val rent-calculator__grid-val--highlight">
              +{formatCurrency(projectedYieldNaira, 'NGN')}
            </span>
          </div>
        </div>

        {(simData?.affordability?.isOverThreshold || simData?.affordability?.is_over_threshold) && (
          <div className="rent-calculator__affordability">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              {simData.affordability.advisoryMessage || simData.affordability.advisory_message}
            </span>
          </div>
        )}

        <button
          type="button"
          className="vault-btn-primary"
          disabled={!targetAmountNaira || !contractualDueDate || targetAmountNaira < 10000}
          onClick={() =>
            onProceedToSetup({
              targetAmountKobo: Math.round(targetAmountNaira * 100),
              contractualDueDate,
              cadence,
              periodicDepositKobo: Math.round(periodicDepositNaira * 100),
            })
          }
        >
          Setup My Rent Vault
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
