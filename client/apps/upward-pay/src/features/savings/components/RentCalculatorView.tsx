'use client'

import React, { useState, useEffect } from 'react'
import {
  Lock,
  Calendar,
  TrendingUp,
  Gift,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
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
  onOpenKycModal?: () => void
}

export function RentCalculatorView({ onProceedToSetup, onOpenKycModal }: RentCalculatorViewProps) {
  const { user } = useAuth()
  const isKycVerified = Boolean(user?.isIdentityVerified)

  // Single source of truth: Settings active rental property
  const activeProperty = (user?.properties || []).find(
    (p: {
      id?: number | string
      isPastTenancy?: boolean
      rentAmount?: number
      rentEndDate?: string
      title?: string
      address?: string
    }) => !p.isPastTenancy && p.rentAmount,
  )

  const [targetAmountRaw, setTargetAmountRaw] = useState<string>(() =>
    activeProperty?.rentAmount ? formatCurrencyInput(activeProperty.rentAmount) : '2,400,000',
  )
  const [nowTimestamp] = useState(() => Date.now())
  const [contractualDueDate, setContractualDueDate] = useState<string>(() => {
    if (activeProperty?.rentEndDate) {
      return activeProperty.rentEndDate.split('T')[0]
    }
    const defaultDate = new Date(Date.now() + 343 * 24 * 60 * 60 * 1000)
    return defaultDate.toISOString().split('T')[0]
  })

  const [prevPropertyId, setPrevPropertyId] = useState<number | string | undefined>(
    activeProperty?.id,
  )
  if (activeProperty?.id !== prevPropertyId) {
    setPrevPropertyId(activeProperty?.id)
    if (activeProperty?.rentAmount) {
      setTargetAmountRaw(formatCurrencyInput(activeProperty.rentAmount))
    }
    if (activeProperty?.rentEndDate) {
      setContractualDueDate(activeProperty.rentEndDate.split('T')[0])
    }
  }

  const targetAmountNaira = parseCurrencyInput(targetAmountRaw) || 2_400_000

  const simulateMutation = useSimulateRentSavings()
  const mutateSimulate = simulateMutation.mutate

  // Always simulate on MONTHLY cadence (no confusing daily/weekly tabs)
  useEffect(() => {
    if (!targetAmountNaira || !contractualDueDate) return

    mutateSimulate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: 0,
      cadence: 'MONTHLY',
    })
  }, [targetAmountNaira, contractualDueDate, mutateSimulate])

  const simData = simulateMutation.data
  const periodicDepositNaira = simData
    ? simData.periodic_deposit_kobo / 100
    : Math.round(targetAmountNaira / 11)
  const projectedYieldNaira = simData
    ? simData.projected_yield_kobo / 100
    : Math.round(targetAmountNaira * 0.145 * (343 / 365) * 0.5)
  const daysRemaining = simData
    ? simData.days_remaining
    : Math.max(
        0,
        Math.ceil(
          (new Date(contractualDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24),
        ),
      )

  const formattedDueDate = contractualDueDate
    ? new Date(contractualDueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Rent Day'

  const handleStartSaving = () => {
    if (!isKycVerified && onOpenKycModal) {
      onOpenKycModal()
      return
    }

    onProceedToSetup({
      targetAmountKobo: Math.round(targetAmountNaira * 100),
      contractualDueDate,
      cadence: 'MONTHLY',
      periodicDepositKobo: Math.round(periodicDepositNaira * 100),
    })
  }

  return (
    <div className="rent-savings__gated-container">
      {/* Blurred Simulation Card */}
      <div className="rent-savings__gated-content rent-savings__gated-content--blurred">
        <div className="vault-dashboard__hero">
          <div className="vault-dashboard__top-row">
            <div className="vault-dashboard__lock-pill">
              <Lock size={13} color="var(--clay)" />
              <span>Target Rent Lock</span>
            </div>
            <span className="vault-dashboard__countdown-pill">
              <Calendar size={12} />
              <span>{daysRemaining || 343} Days to Rent Day</span>
            </span>
          </div>

          <div className="vault-dashboard__amounts">
            <span className="vault-dashboard__balance-caption">
              Target Rent to Pay Early
            </span>
            <span className="vault-dashboard__current-balance">
              {formatCurrency(targetAmountNaira, 'NGN')}
            </span>
            <span className="vault-dashboard__target-label">
              Due on {formattedDueDate} • Payable 30 days early
            </span>
          </div>

          {/* Clean 2-column breakdown: Monthly Savings & ARM Earnings */}
          <div className="vault-dashboard__breakdown-grid">
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">Save Each Month</span>
              <span className="vault-dashboard__breakdown-val">
                {formatCurrency(periodicDepositNaira, 'NGN')}/mo
              </span>
            </div>
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">Returns from ARM (14.5% p.a.)</span>
              <span className="vault-dashboard__breakdown-val vault-dashboard__breakdown-val--yield">
                +{formatCurrency(projectedYieldNaira, 'NGN')}
              </span>
            </div>
          </div>

          {/* Cashback reward note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(217, 119, 87, 0.06)',
              border: '1px solid rgba(217, 119, 87, 0.15)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Gift size={16} color="var(--clay)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Rent Cashback:</strong> Save regularly every month and receive cash back directly on rent day.
            </span>
          </div>
        </div>

        {/* Minimal input prompt only if settings has no rental info */}
        {!activeProperty && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Target Rent (₦)
              </label>
              <input
                type="text"
                className="rent-calculator__input"
                value={targetAmountRaw}
                onChange={(e) => {
                  const num = parseCurrencyInput(e.target.value)
                  setTargetAmountRaw(num ? formatCurrencyInput(num) : '')
                }}
                style={{ height: 38, fontSize: '0.8125rem' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Rent Due Date
              </label>
              <input
                type="date"
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={contractualDueDate}
                onChange={(e) => setContractualDueDate(e.target.value)}
                style={{ height: 38, fontSize: '0.8125rem' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Centralized Action CTA on Top of Blurred Simulation Card */}
      <div
        className="rent-savings__gated-overlay"
        onClick={handleStartSaving}
        role="button"
        tabIndex={0}
        aria-label="Start Saving Today"
      >
        <div className="rent-savings__central-cta-box" onClick={(e) => e.stopPropagation()}>
          <div className="vault-setup__badge">
            <TrendingUp size={12} color="var(--clay)" />
            <span>Powered by ARM</span>
          </div>

          <h3 className="rent-savings__central-title">
            {isKycVerified ? 'Your Rent Savings Plan is Ready' : 'Complete Verification to Save'}
          </h3>

          <p className="rent-savings__central-desc">
            {isKycVerified
              ? 'Save monthly to pay your rent early, earn 14.5% annual returns, and get cash back on rent day.'
              : 'Verify your identity once to start saving toward rent and earn daily compound returns.'}
          </p>

          <button
            type="button"
            className="vault-btn-primary rent-savings__central-btn"
            onClick={handleStartSaving}
          >
            {isKycVerified ? (
              <>
                <span>Start Saving Today</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Verify Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
