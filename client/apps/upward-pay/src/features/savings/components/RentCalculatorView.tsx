'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, DollarSign, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useSimulateRentSavings } from '../hooks/useRentSavings'

interface RentCalculatorViewProps {
  onProceedToSetup: (config: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    periodicDepositKobo: number
  }) => void
}

export function RentCalculatorView({ onProceedToSetup }: RentCalculatorViewProps) {
  const [targetAmountNaira, setTargetAmountNaira] = useState<number>(2400000)
  const [contractualDueDate, setContractualDueDate] = useState<string>(() => {
    // Default 180 days out
    const d = new Date()
    d.setDate(d.getDate() + 180)
    return d.toISOString().split('T')[0]
  })
  const [initialDepositNaira, setInitialDepositNaira] = useState<number>(0)
  const [cadence, setCadence] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const [monthlyIncomeNaira, setMonthlyIncomeNaira] = useState<number>(800000)

  const simulateMutation = useSimulateRentSavings()

  useEffect(() => {
    if (!targetAmountNaira || !contractualDueDate) return

    simulateMutation.mutate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: Math.round(initialDepositNaira * 100),
      cadence,
      monthly_income_kobo: Math.round(monthlyIncomeNaira * 100),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAmountNaira, contractualDueDate, initialDepositNaira, cadence, monthlyIncomeNaira])

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

        <form className="rent-calculator__form" onSubmit={(e) => e.preventDefault()}>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label" htmlFor="calc-target">
              Target Rent + Service Charge
            </label>
            <div className="rent-calculator__input-wrapper">
              <span className="rent-calculator__input-prefix">₦</span>
              <input
                id="calc-target"
                type="number"
                className="rent-calculator__input"
                value={targetAmountNaira || ''}
                onChange={(e) => setTargetAmountNaira(Number(e.target.value))}
                placeholder="2,400,000"
                min={50000}
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
                min={new Date().toISOString().split('T')[0]}
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
                type="number"
                className="rent-calculator__input"
                value={monthlyIncomeNaira || ''}
                onChange={(e) => setMonthlyIncomeNaira(Number(e.target.value))}
                placeholder="800,000"
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

        {simData?.affordability?.isOverThreshold && (
          <div className="rent-calculator__affordability">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{simData.affordability.advisoryMessage}</span>
          </div>
        )}

        <button
          type="button"
          className="vault-btn-primary"
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
