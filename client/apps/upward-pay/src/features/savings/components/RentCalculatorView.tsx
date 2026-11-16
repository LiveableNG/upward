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
  Lock,
  Landmark,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import {
  useSimulateRentSavings,
  useSavingsOnboardingPrefill,
  useOnboardSavingsInvestor,
} from '../hooks/useRentSavings'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import {
  calculatePayLessPlan,
  type SavingsCadence,
  type SavingsPlanPattern,
  type SavingsProductOption,
} from '../services/savingsService'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'

type DrawerStage = 'RENT_INPUT' | 'BENEFIT' | 'KYC' | 'SUCCESS'

interface RentCalculatorViewProps {
  onSuccess?: () => void
  onProceedToSetup?: (config: {
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
  onSuccess,
  onProceedToSetup,
  isKycModalOpen = false,
}: RentCalculatorViewProps) {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()

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

  const hasSavedRent = Boolean(activeProperty?.rentAmount && activeProperty?.rentEndDate)
  const [rentConfirmed, setRentConfirmed] = useState(false)
  const hasRentDetails = hasSavedRent || rentConfirmed

  // Drawer Stage State
  const [stage, setStage] = useState<DrawerStage>(() => (hasSavedRent ? 'BENEFIT' : 'RENT_INPUT'))
  const [drawerOpen, setDrawerOpen] = useState(true)

  const handleCloseDrawer = () => {
    if (stage === 'SUCCESS') {
      handleFinish()
      return
    }
    router.push('/dashboard')
  }

  const targetAmountNaira = parseCurrencyInput(targetAmountRaw) || 0
  const tomorrow = new Date(nowTimestamp + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const canConfirmRent =
    targetAmountNaira > 0 && Boolean(contractualDueDate) && contractualDueDate >= tomorrow

  const selectedCadence: SavingsCadence = 'MONTHLY'
  const [selectedProductOption, setSelectedProductOption] =
    useState<SavingsProductOption>('RENT_PROTEC')
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

  // KYC Prefill & Form State
  const { data: prefill } = useSavingsOnboardingPrefill(drawerOpen)
  const onboardMutation = useOnboardSavingsInvestor()

  const hasVerifiedBvnOnFile = Boolean(prefill?.has_verified_bvn || user?.isIdentityVerified)
  const [bvn, setBvn] = useState('')
  const [mothersMaidenName, setMothersMaidenName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [sourceOfFunds, setSourceOfFunds] = useState<'Salary' | 'Business' | 'Savings' | 'Investment'>('Salary')
  const [nextOfKinName, setNextOfKinName] = useState('')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState('Spouse')
  const [nextOfKinPhone, setNextOfKinPhone] = useState('')
  const [agreeToLock, setAgreeToLock] = useState(false)
  const [kycError, setKycError] = useState<string | null>(null)

  const [createdDva, setCreatedDva] = useState<{
    bank_name: string
    account_number: string
    account_name: string
  } | null>(null)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [initialDepositRaw, setInitialDepositRaw] = useState<string>('')

  useEffect(() => {
    if (targetAmountNaira > 0 && !initialDepositRaw) {
      setInitialDepositRaw(formatCurrencyInput(Math.round(targetAmountNaira * 0.25)))
    }
  }, [targetAmountNaira, initialDepositRaw])

  // Sync Prefill Data
  useEffect(() => {
    if (prefill) {
      if (prefill.bvn && !bvn) setBvn(prefill.bvn)
      if (prefill.mothers_maiden_name && !mothersMaidenName) {
        setMothersMaidenName(prefill.mothers_maiden_name)
      }
      if (prefill.occupation && !occupation) setOccupation(prefill.occupation)
      if (prefill.source_of_funds && !sourceOfFunds) setSourceOfFunds(prefill.source_of_funds)
      if (prefill.next_of_kin_name && !nextOfKinName) setNextOfKinName(prefill.next_of_kin_name)
      if (prefill.next_of_kin_relationship) {
        setNextOfKinRelationship(prefill.next_of_kin_relationship)
      }
      if (prefill.next_of_kin_phone && !nextOfKinPhone) setNextOfKinPhone(prefill.next_of_kin_phone)
    }
  }, [prefill, bvn, mothersMaidenName, occupation, sourceOfFunds, nextOfKinName, nextOfKinPhone])

  // Simulate compound savings
  useEffect(() => {
    if (!targetAmountNaira || !contractualDueDate) return
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
  const totalTenantContributionNaira = simData
    ? simData.total_tenant_contribution_kobo / 100
    : localPlan.totalTenantContributionNaira
  const projectedYieldNaira = simData
    ? simData.projected_yield_kobo / 100
    : localPlan.projectedYieldNaira

  const parsedSuccessDeposit = parseCurrencyInput(initialDepositRaw) || 0
  const successDynamicPlan = calculatePayLessPlan(
    previewRentAmount,
    daysRemaining,
    selectedCadence,
    parsedSuccessDeposit,
    savingsAnnualRatePct,
    {
      productOption: activeProductOption,
      planPattern: planPattern,
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
    },
  )
  const successPeriodicDepositNaira = successDynamicPlan.periodicDepositNaira
  const successProjectedYieldNaira = successDynamicPlan.projectedYieldNaira

  const effectiveTotalTarget = totalTenantContributionNaira + projectedYieldNaira
  const contributionPct =
    effectiveTotalTarget > 0
      ? Math.max(0, Math.min(100, Math.round((totalTenantContributionNaira / effectiveTotalTarget) * 100)))
      : 95
  const yieldPct = Math.max(0, 100 - contributionPct)

  const formattedDueDate = contractualDueDate
    ? new Date(contractualDueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'in 12 months'

  const handleCopyAccountNumber = async (accNum: string) => {
    try {
      await navigator.clipboard.writeText(accNum)
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2500)
    } catch {}
  }

  const isBvnValid = hasVerifiedBvnOnFile || bvn.trim().length === 11
  const isMaidenNameValid = mothersMaidenName.trim().length > 0
  const isOccupationValid = occupation.trim().length > 0
  const isNextOfKinValid = nextOfKinName.trim().length > 0 && nextOfKinPhone.trim().length >= 10
  const isKycValid =
    isBvnValid && isMaidenNameValid && isOccupationValid && isNextOfKinValid && agreeToLock

  const handleSubmitKyc = async () => {
    if (!isKycValid) return
    setKycError(null)

    try {
      const res = await onboardMutation.mutateAsync({
        bvn: bvn.length === 11 ? bvn : undefined,
        mothers_maiden_name: mothersMaidenName.trim(),
        occupation: occupation.trim(),
        source_of_funds: sourceOfFunds,
        next_of_kin_name: nextOfKinName.trim(),
        next_of_kin_relationship: nextOfKinRelationship || 'Spouse',
        next_of_kin_phone: nextOfKinPhone.trim(),
        target_amount: targetAmountNaira,
        rent_due_date: contractualDueDate,
        cadence: 'MONTHLY',
        product_option: activeProductOption,
        plan_pattern: 'INITIAL_DEPOSIT',
      })

      const dva = res?.dedicated_account
      if (dva) {
        setCreatedDva(dva)
      } else {
        const fallbackAccSuffix = nowTimestamp.toString().slice(-8)
        setCreatedDva({
          bank_name: 'Wema Bank',
          account_number: `02${fallbackAccSuffix}`,
          account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
        })
      }

      setStage('SUCCESS')
      toastSuccess('Account verified and dedicated rent bank account ready!')
      await refreshUser().catch(() => {})
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg = error?.message || 'Verification failed. Please check your information.'
      setKycError(msg)
      toastError(msg)
    }
  }

  const handleFinish = async () => {
    setDrawerOpen(false)
    await refreshUser().catch(() => {})
    if (onSuccess) {
      onSuccess()
    }
  }

  const isModalVisible = drawerOpen && !isKycModalOpen

  return (
    <div className="rent-savings__gated-container">
      {/* Background Preview Card: Only show if user has supplied/confirmed rent details */}
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
                Due {formattedDueDate} • You only contribute{' '}
                {formatCurrency(totalTenantContributionNaira, 'NGN')}
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
                <strong>Pay Less for Rent:</strong> Earn {savingsAnnualRatePct}% p.a. returns and
                let interest pay the remaining {formatCurrency(projectedYieldNaira, 'NGN')} of your
                rent.
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
        showBack={false}
        showClose={true}
        showHandle={true}
        maxWidth="500px"
        title={
          stage === 'RENT_INPUT'
            ? 'Your next rent'
            : stage === 'BENEFIT'
              ? 'Pay Less for Your Next Rent'
              : stage === 'KYC'
                ? 'Activate Rent Account'
                : 'Make a Deposit'
        }
        subtitle={
          stage === 'RENT_INPUT'
            ? 'Tell us the rent you are saving towards and when it is due.'
            : stage === 'BENEFIT'
              ? 'Save less and let compound interest help pay your upcoming rent.'
              : stage === 'KYC'
                ? 'Link your BVN to generate your personal rent account.'
                : undefined
        }
        icon={
          stage === 'RENT_INPUT' ? (
            <Home size={20} color="var(--clay)" />
          ) : stage === 'BENEFIT' ? (
            <TrendingUp size={20} color="var(--clay)" />
          ) : stage === 'KYC' ? (
            <ShieldCheck size={20} color="var(--clay)" />
          ) : (
            <Landmark size={20} color="var(--clay)" />
          )
        }
        footer={
          stage === 'RENT_INPUT' ? (
            <button
              type="button"
              className="vault-btn-primary"
              style={{ width: '100%' }}
              disabled={!canConfirmRent}
              onClick={() => {
                setRentConfirmed(true)
                setStage('BENEFIT')
              }}
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          ) : stage === 'BENEFIT' ? (
            <button
              type="button"
              className="vault-btn-primary"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                background: 'var(--btn-primary-bg, var(--clay))',
                boxShadow: '0 8px 20px -6px rgba(194, 80, 31, 0.45)',
              }}
              onClick={() => setStage('KYC')}
            >
              <span>Continue to Activate Account</span>
              <ArrowRight size={18} />
            </button>
          ) : stage === 'KYC' ? (
            <button
              type="button"
              className="vault-btn-primary"
              style={{ width: '100%' }}
              disabled={!isKycValid || onboardMutation.isPending}
              onClick={handleSubmitKyc}
            >
              {onboardMutation.isPending ? (
                'Activating Account...'
              ) : (
                <>
                  <span>Activate Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                className="vault-btn-primary"
                style={{ width: '100%' }}
                onClick={handleFinish}
              >
                <CheckCircle2 size={18} />
                <span>I Have Transferred</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      try {
                        sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
                      } catch {}
                    }
                    handleFinish()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: '0.6875rem',
                    fontWeight: 400,
                    opacity: 0.35,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '4px 8px',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.7'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.35'
                  }}
                >
                  I&apos;ll fund later
                </button>
              </div>
            </div>
          )
        }
      >
        {/* Stage 1: Rent Obligation Input */}
        {stage === 'RENT_INPUT' && (
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
                  placeholder="e.g. 2,500,000"
                  className="rent-calculator__input"
                  value={targetAmountRaw}
                  onChange={(e) => {
                    const parsed = parseCurrencyInput(e.target.value)
                    setTargetAmountRaw(parsed ? formatCurrencyInput(parsed) : '')
                  }}
                />
              </div>
            </div>

            <div className="rent-calculator__field" style={{ marginTop: 12 }}>
              <label className="rent-calculator__label" htmlFor="rent-calc-due-date">
                Rent due date
              </label>
              <div className="rent-calculator__input-wrapper">
                <input
                  id="rent-calc-due-date"
                  type="date"
                  min={tomorrow}
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={contractualDueDate}
                  onChange={(e) => setContractualDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Clear Benefit Showcase (Makes User Eager!) */}
        {stage === 'BENEFIT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Target Rent Pill with Edit button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 13px',
                borderRadius: '12px',
                background: 'var(--oat, #faf9f5)',
                border: '1px solid var(--shell-border, #f0e9df)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Target: <strong style={{ color: 'var(--text)' }}>{formatCurrency(targetAmountNaira, 'NGN')}</strong> due{' '}
                <strong style={{ color: 'var(--text)' }}>{formattedDueDate}</strong>
              </div>
              <button
                type="button"
                onClick={() => setStage('RENT_INPUT')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--clay)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Change
              </button>
            </div>

            {/* High-Impact Benefit Card */}
            <div
              style={{
                padding: '13px 14px',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, #faf9f5 0%, #f6f3ee 100%)',
                border: '1px solid var(--shell-border, #f0e9df)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  alignItems: 'baseline',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 700,
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    You Contribute
                  </span>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--text)',
                      marginTop: 2,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatCurrency(totalTenantContributionNaira, 'NGN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: '#059669',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 700,
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Interest ({savingsAnnualRatePct}% p.a.)
                  </span>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#059669',
                      marginTop: 2,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{formatCurrency(projectedYieldNaira, 'NGN')}
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  overflow: 'hidden',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    width: `${contributionPct}%`,
                    background: 'var(--clay)',
                    borderRadius: '999px 0 0 999px',
                    transition: 'width 0.3s ease',
                  }}
                />
                <div
                  style={{
                    width: `${yieldPct}%`,
                    background: '#059669',
                    borderRadius: '0 999px 999px 0',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.35,
                }}
              >
                <Landmark size={15} color="var(--clay)" style={{ flexShrink: 0 }} />
                <span>
                  ARM pays <strong>+{formatCurrency(projectedYieldNaira, 'NGN')}</strong> directly
                  towards your rent. Flexible savings with zero direct debit fees.
                </span>
              </div>
            </div>

            {/* Plan Selection Cards */}
            <div className="rent-calculator__field" style={{ marginTop: 2 }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                Choose your plan
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Option 1: Rent Protec (Recommended) */}
                <button
                  type="button"
                  onClick={() => setSelectedProductOption('RENT_PROTEC')}
                  disabled={!isRentProtecEligible}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 13px',
                    borderRadius: '15px',
                    border:
                      activeProductOption === 'RENT_PROTEC'
                        ? '2px solid var(--clay)'
                        : '1.5px solid var(--shell-border, #f0e9df)',
                    background:
                      activeProductOption === 'RENT_PROTEC'
                        ? '#fffaf7'
                        : 'var(--surface, #ffffff)',
                    boxShadow:
                      activeProductOption === 'RENT_PROTEC'
                        ? '0 4px 16px rgba(194, 80, 31, 0.08)'
                        : 'none',
                    cursor: isRentProtecEligible ? 'pointer' : 'not-allowed',
                    opacity: isRentProtecEligible ? 1 : 0.45,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <ShieldCheck size={17} color="var(--clay)" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 800,
                          color: 'var(--text)',
                        }}
                      >
                        Rent Protec
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'var(--shell-tint, #fbede5)',
                          color: 'var(--clay)',
                          border: '1px solid rgba(194, 80, 31, 0.22)',
                        }}
                      >
                        Recommended
                      </span>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border:
                          activeProductOption === 'RENT_PROTEC'
                            ? '5px solid var(--clay)'
                            : '2px solid var(--border-solid, #e2ddd7)',
                        background: '#ffffff',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.35,
                      paddingLeft: '24px',
                    }}
                  >
                    <strong style={{ color: '#059669' }}>10% returns</strong> + Upward covers your rent in case of job loss or illness.
                  </div>
                </button>

                {/* Option 2: Save & Earn (Basic Savings Only) */}
                <button
                  type="button"
                  onClick={() => setSelectedProductOption('SAVE_AND_EARN')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 13px',
                    borderRadius: '15px',
                    border:
                      activeProductOption === 'SAVE_AND_EARN'
                        ? '2px solid var(--clay)'
                        : '1.5px solid var(--shell-border, #f0e9df)',
                    background:
                      activeProductOption === 'SAVE_AND_EARN'
                        ? '#fffaf7'
                        : 'var(--surface, #ffffff)',
                    boxShadow:
                      activeProductOption === 'SAVE_AND_EARN'
                        ? '0 4px 16px rgba(194, 80, 31, 0.08)'
                        : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <TrendingUp size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color:
                            activeProductOption === 'SAVE_AND_EARN'
                              ? 'var(--clay)'
                              : 'var(--text)',
                        }}
                      >
                        Save &amp; Earn
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          background: 'var(--surface2, #efefef)',
                          padding: '1px 6px',
                          borderRadius: '999px',
                        }}
                      >
                        Savings only
                      </span>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border:
                          activeProductOption === 'SAVE_AND_EARN'
                            ? '5px solid var(--clay)'
                            : '2px solid var(--border-solid, #e2ddd7)',
                        background: '#ffffff',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.35,
                      paddingLeft: '23px',
                    }}
                  >
                    14% returns · Standard savings with no rent protection insurance.
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Simple & Friendly KYC Step */}
        {stage === 'KYC' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kycError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.75rem',
                  color: 'var(--error)',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{kycError}</span>
              </div>
            )}

            {/* BVN */}
            {hasVerifiedBvnOnFile ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#10b981',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>
                  Identity Verified · BVN ({prefill?.masked_bvn || '••••' + (user?.phone?.slice(-4) || '1234')}) on file
                </span>
              </div>
            ) : (
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Bank Verification Number (BVN)</label>
                <div className="rent-calculator__input-wrapper">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 11-digit BVN"
                    className="rent-calculator__input rent-calculator__input--no-prefix"
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    maxLength={11}
                  />
                </div>
              </div>
            )}

            {/* Mother's Maiden Name */}
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Mother&apos;s Maiden Name</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  placeholder="Mother's birth family name"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={mothersMaidenName}
                  onChange={(e) => setMothersMaidenName(e.target.value)}
                />
              </div>
            </div>

            {/* Occupation & Source of Funds */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Consultant"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Source of Funds</label>
                <select
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={sourceOfFunds}
                  onChange={(e) =>
                    setSourceOfFunds(
                      e.target.value as 'Salary' | 'Business' | 'Savings' | 'Investment',
                    )
                  }
                >
                  <option value="Salary">Salary</option>
                  <option value="Business">Business</option>
                  <option value="Savings">Savings</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>
            </div>

            {/* Next of Kin */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Next of Kin Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={nextOfKinName}
                  onChange={(e) => setNextOfKinName(e.target.value)}
                />
              </div>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Next of Kin Phone</label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={nextOfKinPhone}
                  onChange={(e) =>
                    setNextOfKinPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))
                  }
                />
              </div>
            </div>

            {/* Lock Agreement */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 6,
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={agreeToLock}
                onChange={(e) => setAgreeToLock(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--clay)', cursor: 'pointer' }}
              />
              <span>I agree to lock my rent savings until 30 days before rent day.</span>
            </label>
          </div>
        )}

        {/* Stage 4: Account Created & Dedicated Account Details */}
        {stage === 'SUCCESS' && createdDva && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 8px' }}>
            {/* Compact Amount input */}
            <div>
              <div className="vault-sandbox-card__input-wrapper" style={{ height: 44 }}>
                <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  ₦
                </span>
                <input
                  id="initial-deposit-amount"
                  type="text"
                  inputMode="numeric"
                  className="vault-sandbox-card__input"
                  style={{ fontSize: '1.2rem', fontWeight: 700 }}
                  placeholder="e.g. 1,000,000"
                  value={initialDepositRaw}
                  onChange={(e) => {
                    const parsed = parseCurrencyInput(e.target.value)
                    setInitialDepositRaw(parsed ? formatCurrencyInput(parsed) : '')
                  }}
                />
              </div>

              {/* Punchy 1-line benefit pitch */}
              {parsedSuccessDeposit > 0 && previewRentAmount > 0 && (
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    marginTop: 6,
                    padding: '0 2px',
                  }}
                >
                  Pay <strong>{formatCurrency(parsedSuccessDeposit, 'NGN')}</strong> today, then save at least{' '}
                  <strong style={{ color: 'var(--clay)' }}>
                    {formatCurrency(successPeriodicDepositNaira, 'NGN')}
                  </strong>{' '}
                  monthly for the rest of the year{' '}
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    (+{formatCurrency(successProjectedYieldNaira, 'NGN')} interest)
                  </span>.
                </div>
              )}
            </div>

            {/* Compact Account Card */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'var(--surface2, #fbf9f6)',
                border: '1px solid var(--border-solid, #eee7df)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                  {createdDva.account_number}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {createdDva.bank_name || 'Wema Bank'} · {createdDva.account_name}
                </div>
              </div>
              <button
                type="button"
                className={`vault-dva-card__copy-btn ${copiedAccount ? 'vault-dva-card__copy-btn--copied' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', height: 32, flexShrink: 0 }}
                onClick={() => handleCopyAccountNumber(createdDva.account_number)}
              >
                {copiedAccount ? (
                  <>
                    <Check size={13} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  )
}
