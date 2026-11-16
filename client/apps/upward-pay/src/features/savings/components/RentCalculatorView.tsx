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
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import {
  calculatePayLessPlan,
  type SavingsCadence,
  type SavingsPlanPattern,
  type SavingsProductOption,
} from '../services/savingsService'
import { useAuth } from '@/features/auth/AuthContext'

interface RentCalculatorViewProps {
  onProceedToSetup: (config: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: SavingsCadence
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
    activeProperty?.rentAmount ? formatCurrencyInput(activeProperty.rentAmount) : '',
  )
  const [propertyAddress, setPropertyAddress] = useState<string>(
    () => activeProperty?.address || '',
  )
  const [nowTimestamp] = useState(() => Date.now())
  const [contractualDueDate, setContractualDueDate] = useState<string>(() => {
    if (activeProperty?.rentEndDate) {
      return activeProperty.rentEndDate.split('T')[0]
    }
    return ''
  })

  const [prevPropertyId, setPrevPropertyId] = useState<number | string | undefined>(
    activeProperty?.id,
  )
  if (activeProperty?.id !== prevPropertyId) {
    setPrevPropertyId(activeProperty?.id)
    if (activeProperty?.rentAmount) {
      setTargetAmountRaw(formatCurrencyInput(activeProperty.rentAmount))
    }
    if (activeProperty?.address) {
      setPropertyAddress(activeProperty.address)
    }
    if (activeProperty?.rentEndDate) {
      setContractualDueDate(activeProperty.rentEndDate.split('T')[0])
    }
  }

  const targetAmountNaira = parseCurrencyInput(targetAmountRaw) || 0
  const hasRentDetails = Boolean(
    activeProperty?.rentAmount ||
      (propertyAddress.trim() && targetAmountNaira > 0 && contractualDueDate),
  )
  const [selectedCadence, setSelectedCadence] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY'>('MONTHLY')
  const [selectedProductOption, setSelectedProductOption] = useState<SavingsProductOption>('RENT_PROTEC')
  const [selectedPlanPattern, setSelectedPlanPattern] = useState<SavingsPlanPattern>('INITIAL_DEPOSIT')

  const simulateMutation = useSimulateRentSavings()
  const mutateSimulate = simulateMutation.mutate

  const { rates: platformRates } = usePlatformRates()
  const rawDaysRemaining = contractualDueDate
    ? Math.max(
        1,
        Math.ceil(
          (new Date(contractualDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24),
        ),
      )
    : 330
  const isRentProtecEligible = rawDaysRemaining >= (platformRates.rentProtecMinMonths || 6) * 28
  const activeProductOption: SavingsProductOption =
    selectedProductOption === 'RENT_PROTEC' && !isRentProtecEligible
      ? 'SAVE_AND_EARN'
      : selectedProductOption

  useEffect(() => {
    if (!targetAmountNaira || !contractualDueDate) return

    mutateSimulate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: 0,
      cadence: selectedCadence,
      product_option: activeProductOption,
      plan_pattern: selectedPlanPattern,
    })

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'upward_savings_rent_plan',
          JSON.stringify({
            userId: user?.id,
            address: propertyAddress.trim() || undefined,
            rentAmount: targetAmountNaira,
            dueDate: contractualDueDate,
            cadence: selectedCadence,
            productOption: activeProductOption,
            planPattern: selectedPlanPattern,
          }),
        )
        const rawDraft = localStorage.getItem('upward_setup_draft')
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft)
          if (parsedDraft?.formData) {
            if (propertyAddress.trim()) {
              parsedDraft.formData.address = propertyAddress.trim()
            }
            parsedDraft.formData.rentAmount = targetAmountNaira.toLocaleString()
            parsedDraft.formData.rentEndDate = contractualDueDate
            parsedDraft.formData.rentStartDate = new Date(
              new Date(contractualDueDate).getTime() - 365 * 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .split('T')[0]
            localStorage.setItem('upward_setup_draft', JSON.stringify(parsedDraft))
          }
        }
      } catch {}
    }
  }, [
    targetAmountNaira,
    contractualDueDate,
    propertyAddress,
    selectedCadence,
    activeProductOption,
    selectedPlanPattern,
    mutateSimulate,
    user?.id,
  ])

  const simData = simulateMutation.data
  const defaultRatePct =
    activeProductOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : platformRates.savingsAnnualRatePct
  const savingsAnnualRatePct = simData?.net_annual_yield_rate
    ? Math.round(simData.net_annual_yield_rate * 1000) / 10
    : defaultRatePct
  const daysRemaining = simData ? simData.days_remaining : rawDaysRemaining

  const localPlan = calculatePayLessPlan(
    targetAmountNaira,
    daysRemaining,
    selectedCadence,
    0,
    savingsAnnualRatePct,
    {
      productOption: activeProductOption,
      planPattern: selectedPlanPattern,
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
    },
  )
  const periodicDepositNaira = simData
    ? simData.periodic_deposit_kobo / 100
    : localPlan.periodicDepositNaira
  const totalTenantContributionNaira = simData
    ? simData.total_tenant_contribution_kobo / 100
    : localPlan.totalTenantContributionNaira
  const projectedYieldNaira = simData
    ? simData.projected_yield_kobo / 100
    : localPlan.projectedYieldNaira

  const cadenceUnitLabel =
    selectedCadence === 'WEEKLY'
      ? 'wk'
      : selectedCadence === 'QUARTERLY'
        ? 'qtr'
        : 'mo'

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
      cadence: selectedCadence,
      periodicDepositKobo: Math.round(periodicDepositNaira * 100),
    })
  }

  return (
    <div className="rent-savings__gated-container">
      {/* Blurred Simulation Card */}
      <div className="rent-savings__gated-content rent-savings__gated-content--blurred">
        <div className="vault-dashboard__hero">
          <div className="vault-dashboard__top-row">
            <div className="vault-arm-badge">
              <ShieldCheck size={14} className="vault-arm-badge__icon" />
              <span>
                Powered by <strong>Asset &amp; Resource Management Holding Company (ARM)</strong>
              </span>
            </div>
            <span className="vault-dashboard__countdown-pill">
              <Calendar size={12} />
              <span>{daysRemaining || 343} Days to Rent Day</span>
            </span>
          </div>

          <div className="vault-dashboard__amounts">
            <span className="vault-dashboard__balance-caption">
              Target Rent (Pay Less with Interest)
            </span>
            <span className="vault-dashboard__current-balance">
              {formatCurrency(targetAmountNaira, 'NGN')}
            </span>
            <span className="vault-dashboard__target-label">
              Due on {formattedDueDate} • You only contribute {formatCurrency(totalTenantContributionNaira, 'NGN')}
            </span>
          </div>

          {/* 3-Column Pay Less Breakdown */}
          <div className="vault-dashboard__breakdown-grid">
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">Save ({selectedCadence.toLowerCase()})</span>
              <span className="vault-dashboard__breakdown-val">
                {formatCurrency(periodicDepositNaira, 'NGN')}/{cadenceUnitLabel}
              </span>
            </div>
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">You Only Pay</span>
              <span className="vault-dashboard__breakdown-val">
                {formatCurrency(totalTenantContributionNaira, 'NGN')}
              </span>
            </div>
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">
                Interest Covers ({savingsAnnualRatePct}% p.a.)
              </span>
              <span className="vault-dashboard__breakdown-val vault-dashboard__breakdown-val--yield">
                +{formatCurrency(projectedYieldNaira, 'NGN')}
              </span>
            </div>
          </div>

          {/* Pay Less note */}
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
              <strong>Pay Less for Rent:</strong> Save consistently and your {savingsAnnualRatePct}% p.a. interest pays the remaining {formatCurrency(projectedYieldNaira, 'NGN')} of your rent.
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
            <span>
              Powered by ARM • {savingsAnnualRatePct}% p.a.
              {activeProductOption === 'RENT_PROTEC' ? ' • Rent Protec' : ''}
            </span>
          </div>

          <h3 className="rent-savings__central-title">
            {isKycVerified ? 'Pay Less for Your Next Rent' : 'Save Consistently & Pay Less'}
          </h3>

          <p className="rent-savings__central-desc">
            Save {formatCurrency(periodicDepositNaira, 'NGN')}/{cadenceUnitLabel} — you only contribute{' '}
            <strong>{formatCurrency(totalTenantContributionNaira, 'NGN')}</strong> and your{' '}
            <strong>+{formatCurrency(projectedYieldNaira, 'NGN')}</strong> interest completes the rest of your{' '}
            {formatCurrency(targetAmountNaira, 'NGN')} rent.
          </p>

          {/* 1. Product Option Selector FIRST */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              width: '100%',
              margin: '6px 0 8px',
            }}
          >
            <button
              type="button"
              disabled={!isRentProtecEligible}
              onClick={() => setSelectedProductOption('RENT_PROTEC')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: `1.5px solid ${activeProductOption === 'RENT_PROTEC' ? 'var(--clay)' : 'var(--border)'}`,
                background: activeProductOption === 'RENT_PROTEC' ? 'var(--clay-faint)' : 'var(--bg)',
                color: activeProductOption === 'RENT_PROTEC' ? 'var(--clay)' : 'var(--text)',
                textAlign: 'left',
                cursor: isRentProtecEligible ? 'pointer' : 'not-allowed',
                opacity: isRentProtecEligible ? 1 : 0.55,
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Rent Protec</div>
              <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 700 }}>
                {platformRates.rentProtecRatePct}% + Insurance
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProductOption('SAVE_AND_EARN')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: `1.5px solid ${activeProductOption === 'SAVE_AND_EARN' ? 'var(--clay)' : 'var(--border)'}`,
                background: activeProductOption === 'SAVE_AND_EARN' ? 'var(--clay-faint)' : 'var(--bg)',
                color: activeProductOption === 'SAVE_AND_EARN' ? 'var(--clay)' : 'var(--text)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Save & Earn</div>
              <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 700 }}>
                {platformRates.savingsAnnualRatePct}% Full Return
              </div>
            </button>
          </div>

          {/* 2. Frequency Selector (Weekly / Monthly / Quarterly) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
              width: '100%',
              margin: '0 0 8px',
            }}
          >
            {(
              [
                { id: 'WEEKLY' as const, label: 'Weekly' },
                { id: 'MONTHLY' as const, label: 'Monthly' },
                { id: 'QUARTERLY' as const, label: 'Quarterly' },
              ]
            ).map((freq) => {
              const isActive = selectedCadence === freq.id
              return (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => setSelectedCadence(freq.id)}
                  style={{
                    padding: '7px 6px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isActive ? 'var(--clay)' : 'var(--border)'}`,
                    background: isActive ? 'var(--clay-faint)' : 'var(--bg)',
                    color: isActive ? 'var(--clay)' : 'var(--text)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {freq.label}
                </button>
              )
            })}
          </div>

          {/* 3. Contribution Pattern */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
              width: '100%',
              margin: '0 0 12px',
            }}
          >
            {(
              [
                { id: 'INITIAL_DEPOSIT' as const, label: 'Initial + Steady' },
                { id: 'STEP_UP' as const, label: 'Step-Up' },
                { id: 'EQUAL' as const, label: 'Equal' },
              ]
            ).map((pat) => {
              const isActive = selectedPlanPattern === pat.id
              return (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => setSelectedPlanPattern(pat.id)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isActive ? 'var(--clay)' : 'var(--border)'}`,
                    background: isActive ? 'var(--clay-faint)' : 'var(--bg)',
                    color: isActive ? 'var(--clay)' : 'var(--text-secondary)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {pat.label}
                </button>
              )
            })}
          </div>

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
                <span>Verify &amp; Start Saving</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
