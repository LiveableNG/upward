'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  TrendingUp,
  Gift,
  ArrowRight,
  ShieldCheck,
  Home,
  CheckCircle2,
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
import { BottomSheetModal } from '@/components/common/BottomSheetModal'

interface RentCalculatorViewProps {
  onProceedToSetup: (config: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: SavingsCadence
    periodicDepositKobo: number
    productOption?: SavingsProductOption
  }) => void
  onOpenKycModal?: () => void
  isKycModalOpen?: boolean
}

export function RentCalculatorView({
  onProceedToSetup,
  isKycModalOpen = false,
}: RentCalculatorViewProps) {
  const { user } = useAuth()

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
    if (activeProperty?.rentEndDate) {
      setContractualDueDate(activeProperty.rentEndDate.split('T')[0])
    }
  }

  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [rentConfirmed, setRentConfirmed] = useState(false)
  const hasSavedRent = Boolean(activeProperty?.rentAmount && activeProperty?.rentEndDate)
  const hasRentDetails = hasSavedRent || rentConfirmed

  const handleCloseDrawer = () => {
    if (!hasSavedRent && !rentConfirmed) {
      router.push('/dashboard')
    } else {
      setDrawerOpen(false)
    }
  }

  const targetAmountNaira = parseCurrencyInput(targetAmountRaw) || 0
  const tomorrow = new Date(nowTimestamp + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const canConfirmRent =
    targetAmountNaira > 0 && Boolean(contractualDueDate) && contractualDueDate >= tomorrow
  const selectedCadence: SavingsCadence = 'MONTHLY'
  const [selectedProductOption, setSelectedProductOption] = useState<SavingsProductOption>('RENT_PROTEC')
  const planPattern: SavingsPlanPattern = 'INITIAL_DEPOSIT'

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
    // Only persist what the user actually entered or already has saved.
    if (!hasRentDetails) return

    mutateSimulate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: 0,
      cadence: selectedCadence,
      product_option: activeProductOption,
      plan_pattern: planPattern,
    })

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'upward_savings_rent_plan',
          JSON.stringify({
            userId: user?.id,
            source: 'user',
            rentAmount: targetAmountNaira,
            dueDate: contractualDueDate,
            cadence: selectedCadence,
            productOption: activeProductOption,
            planPattern: planPattern,
          }),
        )
        const rawDraft = localStorage.getItem('upward_setup_draft')
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft)
          if (parsedDraft?.formData) {
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
    activeProductOption,
    planPattern,
    selectedCadence,
    hasRentDetails,
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

  const previewRentAmount = targetAmountNaira || 2_500_000
  const localPlan = calculatePayLessPlan(
    previewRentAmount,
    daysRemaining,
    selectedCadence,
    0,
    savingsAnnualRatePct,
    {
      productOption: activeProductOption,
      planPattern: planPattern,
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

  const formattedDueDate = contractualDueDate
    ? new Date(contractualDueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'in 12 months'

  const handleStartSaving = () => {
    if (!hasRentDetails) return

    onProceedToSetup({
      targetAmountKobo: Math.round(targetAmountNaira * 100),
      contractualDueDate,
      cadence: selectedCadence,
      periodicDepositKobo: Math.round(periodicDepositNaira * 100),
      productOption: activeProductOption,
    })
  }

  const isModalVisible = drawerOpen && !isKycModalOpen

  return (
    <div className="rent-savings__gated-container">
      {/* Preview Card: Only show if user has supplied/confirmed rent details */}
      {hasRentDetails && (
        <div
          className="rent-savings__gated-content"
          onClick={() => setDrawerOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open Rent Savings Drawer"
          style={{ cursor: 'pointer' }}
        >
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
                {formatCurrency(previewRentAmount, 'NGN')}
              </span>
              <span className="vault-dashboard__target-label">
                Due {formattedDueDate} • You only contribute {formatCurrency(totalTenantContributionNaira, 'NGN')}
              </span>
            </div>

            {/* 3-Column Pay Less Breakdown */}
            <div className="vault-dashboard__breakdown-grid">
              <div className="vault-dashboard__breakdown-item">
                <span className="vault-dashboard__breakdown-label">Deposit Schedule</span>
                <span className="vault-dashboard__breakdown-val">Flexible</span>
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
                <strong>Pay Less for Rent:</strong> Earn {savingsAnnualRatePct}% p.a. returns and let interest pay the remaining {formatCurrency(projectedYieldNaira, 'NGN')} of your rent.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Button to reopen drawer if user closed it after supplying rent details */}
      {hasRentDetails && !isModalVisible && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            type="button"
            className="vault-btn-primary"
            style={{ maxWidth: 320, margin: '0 auto' }}
            onClick={() => setDrawerOpen(true)}
          >
            View Savings Plan
          </button>
        </div>
      )}

      {/* Bottom Drawer */}
      <BottomSheetModal
        isOpen={isModalVisible}
        onClose={handleCloseDrawer}
        onBack={hasRentDetails && !hasSavedRent ? () => setRentConfirmed(false) : undefined}
        showClose={true}
        showHandle={true}
        maxWidth="md"
        title={!hasRentDetails ? 'Your next rent' : 'Pay Less for Your Next Rent'}
        subtitle={
          !hasRentDetails
            ? 'Tell us the rent you are saving towards and when it is due.'
            : 'Save flexibly at your own pace and let interest help pay your rent.'
        }
        icon={
          !hasRentDetails ? (
            <Home size={20} color="var(--clay)" />
          ) : (
            <TrendingUp size={20} color="var(--clay)" />
          )
        }
        footer={
          !hasRentDetails ? (
            <button
              type="button"
              className="vault-btn-primary"
              style={{ width: '100%' }}
              disabled={!canConfirmRent}
              onClick={() => setRentConfirmed(true)}
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="vault-btn-primary"
              style={{ width: '100%' }}
              onClick={handleStartSaving}
              disabled={!hasRentDetails}
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          )
        }
      >
        {!hasRentDetails ? (
          <div className="rent-calculator__section" style={{ marginTop: 0 }}>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label" htmlFor="rent-calc-amount">
                Annual rent
              </label>
              <div className="rent-calculator__input-wrapper">
                <span className="rent-calculator__input-prefix">₦</span>
                <input
                  id="rent-calc-amount"
                  type="text"
                  inputMode="numeric"
                  className="rent-calculator__input"
                  placeholder="e.g. 2,500,000"
                  value={targetAmountRaw}
                  onChange={(e) => {
                    const num = parseCurrencyInput(e.target.value)
                    setTargetAmountRaw(num ? formatCurrencyInput(num) : '')
                  }}
                />
              </div>
            </div>
            <div className="rent-calculator__field" style={{ marginTop: 12 }}>
              <label className="rent-calculator__label" htmlFor="rent-calc-due">
                Rent due date
              </label>
              <input
                id="rent-calc-due"
                type="date"
                min={tomorrow}
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={contractualDueDate}
                onChange={(e) => setContractualDueDate(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="rent-calculator__section" style={{ marginTop: 0 }}>
            {!hasSavedRent && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--surface2, #efefef)',
                  fontSize: '0.8125rem',
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Target: <strong style={{ color: 'var(--text)' }}>{formatCurrency(targetAmountNaira, 'NGN')}</strong> due{' '}
                    <strong style={{ color: 'var(--text)' }}>{formattedDueDate}</strong>
                  </div>
                  {projectedYieldNaira > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Save flexibly · +{formatCurrency(projectedYieldNaira, 'NGN')} interest covers remainder
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRentConfirmed(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--clay)',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                >
                  Edit
                </button>
              </div>
            )}

            <div className="rent-calculator__field">
              <span className="rent-calculator__label">Savings plan</span>
              <div className="savings-plan-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProductOption === 'RENT_PROTEC'}
                  disabled={!isRentProtecEligible}
                  onClick={() => setSelectedProductOption('RENT_PROTEC')}
                  className={`savings-plan-tabs__tab ${
                    activeProductOption === 'RENT_PROTEC' ? 'savings-plan-tabs__tab--active' : ''
                  }`}
                >
                  <span className="savings-plan-tabs__title">Rent Protec</span>
                  <span className="savings-plan-tabs__rate">
                    {platformRates.rentProtecRatePct}% p.a. + Insurance
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProductOption === 'SAVE_AND_EARN'}
                  onClick={() => setSelectedProductOption('SAVE_AND_EARN')}
                  className={`savings-plan-tabs__tab ${
                    activeProductOption === 'SAVE_AND_EARN' ? 'savings-plan-tabs__tab--active' : ''
                  }`}
                >
                  <span className="savings-plan-tabs__title">Save &amp; Earn</span>
                  <span className="savings-plan-tabs__rate">
                    {platformRates.savingsAnnualRatePct}% p.a. Return
                  </span>
                </button>
              </div>

              {/* Minimal 1-line Explainer Beneath Tabs */}
              <div className="savings-plan-explainer">
                {activeProductOption === 'RENT_PROTEC' ? (
                  <>
                    <ShieldCheck size={16} className="savings-plan-explainer__icon" />
                    <span>
                      Earn {platformRates.rentProtecRatePct}% p.a. returns with AXA rent protection against job loss or illness.
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} className="savings-plan-explainer__icon" />
                    <span>
                      Earn full {platformRates.savingsAnnualRatePct}% p.a. compound returns directly towards your rent. Pure savings.
                    </span>
                  </>
                )}
              </div>

              {!isRentProtecEligible && (
                <span className="rent-calculator__hint" style={{ marginTop: 6 }}>
                  Rent Protec needs at least {platformRates.rentProtecMinMonths} months before your
                  rent is due.
                </span>
              )}
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  )
}
