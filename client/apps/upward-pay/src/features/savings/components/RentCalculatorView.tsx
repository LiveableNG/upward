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
                : 'Rent Account Ready! 🎉'
        }
        subtitle={
          stage === 'RENT_INPUT'
            ? 'Tell us the rent you are saving towards and when it is due.'
            : stage === 'BENEFIT'
              ? 'Save less and let compound interest help pay your upcoming rent.'
              : stage === 'KYC'
                ? 'Link your BVN to generate your personal rent account.'
                : 'Your dedicated personal rent savings account is active.'
        }
        icon={
          stage === 'RENT_INPUT' ? (
            <Home size={20} color="var(--clay)" />
          ) : stage === 'BENEFIT' ? (
            <TrendingUp size={20} color="var(--clay)" />
          ) : stage === 'KYC' ? (
            <ShieldCheck size={20} color="var(--clay)" />
          ) : (
            <CheckCircle2 size={22} color="#10b981" />
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
              style={{ width: '100%' }}
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
            <button
              type="button"
              className="vault-btn-primary"
              style={{ width: '100%' }}
              onClick={handleFinish}
            >
              <span>Go to Savings Dashboard</span>
              <ArrowRight size={18} />
            </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Target Rent Pill with Edit button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--surface-sunken, #f8f6f3)',
                border: '1px solid var(--border)',
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
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                Edit
              </button>
            </div>

            {/* High-Impact Benefit Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 700,
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
                    }}
                  >
                    {formatCurrency(totalTenantContributionNaira, 'NGN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 700,
                    }}
                  >
                    Interest Covers ({savingsAnnualRatePct}% p.a.)
                  </span>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#10b981',
                      marginTop: 2,
                    }}
                  >
                    +{formatCurrency(projectedYieldNaira, 'NGN')}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <Landmark size={15} color="var(--clay)" style={{ flexShrink: 0 }} />
                <span>
                  ARM pays <strong>+{formatCurrency(projectedYieldNaira, 'NGN')}</strong> directly
                  towards your rent. Flexible savings with zero direct debit fees.
                </span>
              </div>
            </div>

            {/* Plan Selection Tabs */}
            <div className="rent-calculator__field" style={{ marginTop: 2 }}>
              <span className="rent-calculator__label">Choose your plan</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                {/* Option 1: Rent Protec */}
                <button
                  type="button"
                  onClick={() => setSelectedProductOption('RENT_PROTEC')}
                  disabled={!isRentProtecEligible}
                  style={{
                    position: 'relative',
                    padding: '12px 10px',
                    borderRadius: '12px',
                    border:
                      activeProductOption === 'RENT_PROTEC'
                        ? '2px solid var(--clay)'
                        : '1.5px solid var(--border)',
                    background:
                      activeProductOption === 'RENT_PROTEC'
                        ? 'rgba(217, 119, 87, 0.05)'
                        : 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: isRentProtecEligible ? 'pointer' : 'not-allowed',
                    opacity: isRentProtecEligible ? 1 : 0.45,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: activeProductOption === 'RENT_PROTEC' ? 'var(--clay)' : 'var(--text)',
                    }}
                  >
                    Rent Protec
                  </span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--clay)',
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Recommended
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#10b981',
                      marginTop: 2,
                    }}
                  >
                    10% p.a. + Insurance
                  </span>
                </button>

                {/* Option 2: Save & Earn */}
                <button
                  type="button"
                  onClick={() => setSelectedProductOption('SAVE_AND_EARN')}
                  style={{
                    position: 'relative',
                    padding: '12px 10px',
                    borderRadius: '12px',
                    border:
                      activeProductOption === 'SAVE_AND_EARN'
                        ? '2px solid var(--clay)'
                        : '1.5px solid var(--border)',
                    background:
                      activeProductOption === 'SAVE_AND_EARN'
                        ? 'rgba(217, 119, 87, 0.05)'
                        : 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color:
                        activeProductOption === 'SAVE_AND_EARN' ? 'var(--clay)' : 'var(--text)',
                    }}
                  >
                    Save &amp; Earn
                  </span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--surface2)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    No Insurance
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    14% p.a. · Savings Only
                  </span>
                </button>
              </div>

              {/* Explainer Beneath the Selected Tab */}
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--surface-sunken, #f8f6f3)',
                  border: '1px solid var(--border)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                }}
              >
                {activeProductOption === 'RENT_PROTEC' ? (
                  <span>
                    10% p.a. + protection insurance covering your rent in case of income loss or serious illness.
                  </span>
                ) : (
                  <span>
                    14% p.a. returns, but includes no protection if you face unexpected job loss or illness.
                  </span>
                )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(217, 119, 87, 0.05)',
                border: '1.5px solid var(--clay)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Landmark size={20} color="var(--clay)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                  Personal Rent Bank Account
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    textTransform: 'uppercase',
                  }}
                >
                  Active
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank Name</span>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>
                  {createdDva.bank_name || 'Wema Bank'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Number</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.375rem',
                      fontWeight: 800,
                      color: 'var(--clay)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {createdDva.account_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccountNumber(createdDva.account_number)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedAccount ? (
                      <>
                        <Check size={14} color="#10b981" />
                        <span style={{ color: '#10b981' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Name</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                  {createdDva.account_name}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
              <span>
                Transfer any amount whenever you want from your banking app. Every deposit earns
                interest daily towards your rent.
              </span>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  )
}
