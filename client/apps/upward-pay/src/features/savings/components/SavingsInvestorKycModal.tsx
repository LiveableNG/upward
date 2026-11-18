'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Landmark,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react'
import {
  useOnboardSavingsInvestor,
  useConsentToSavings,
  useRentVault,
  useSavingsOnboardingPrefill,
} from '../hooks/useRentSavings'
import {
  calculatePayLessPlan,
  type SavingsCadence,
  type SavingsPlanPattern,
  type SavingsProductOption,
} from '../services/savingsService'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { useToast } from '@/components/common/Toast'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { readSavingsRentPlan } from '@/features/savings/utils/savingsRentPlan'
import { useAuth } from '@/features/auth/AuthContext'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'

interface SavingsInvestorKycModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const emptySubscribe = () => () => {}

const FUNDING_PRESETS = [50_000, 100_000, 250_000, 500_000]

export function SavingsInvestorKycModal({
  isOpen,
  onClose,
  onSuccess,
}: SavingsInvestorKycModalProps) {
  const { user, refreshUser } = useAuth()
  const { data: vault } = useRentVault()
  const { data: prefill } = useSavingsOnboardingPrefill(isOpen)
  const consentMutation = useConsentToSavings()

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const [minDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return tomorrow.toISOString().split('T')[0]
  })
  const [nowTimestamp] = useState(() => Date.now())

  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (user?.isIdentityVerified ? 3 : 1))

  const [prevVerified, setPrevVerified] = useState(Boolean(user?.isIdentityVerified))
  if (Boolean(user?.isIdentityVerified) !== prevVerified) {
    setPrevVerified(Boolean(user?.isIdentityVerified))
    if (user?.isIdentityVerified && step < 3) {
      setStep(3)
    }
  }

  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  const [bvn, setBvn] = useState('')
  const [mothersMaidenName, setMothersMaidenName] = useState('')

  const [occupation, setOccupation] = useState(() => {
    if (typeof window !== 'undefined' && user?.uuid) {
      try {
        const savedPolicy = window.localStorage.getItem(`rent_support_policy_${user.uuid}`)
        if (savedPolicy) {
          const parsed = JSON.parse(savedPolicy) as { occupation?: string }
          if (parsed.occupation) return parsed.occupation
        }
      } catch {
        // Ignore storage read errors
      }
    }
    return ''
  })
  const [sourceOfFunds, setSourceOfFunds] = useState<
    'Salary' | 'Business' | 'Savings' | 'Investment'
  >('Salary')
  const [nextOfKinName, setNextOfKinName] = useState('')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState('Spouse')
  const [nextOfKinPhone, setNextOfKinPhone] = useState('')

  const [manualRentTarget, setManualRentTarget] = useState<number>(() => {
    const plan = readSavingsRentPlan()
    return plan?.rentAmount ? Number(plan.rentAmount) : 0
  })
  const [manualDueDate, setManualDueDate] = useState<string>(() => {
    return readSavingsRentPlan()?.dueDate || ''
  })

  const [prevPrefill, setPrevPrefill] = useState<typeof prefill | null>(null)
  if (prefill && prefill !== prevPrefill && isOpen) {
    setPrevPrefill(prefill)
    if (prefill.bvn && !bvn) setBvn(prefill.bvn)
    if (prefill.mothers_maiden_name && !mothersMaidenName) {
      setMothersMaidenName(prefill.mothers_maiden_name)
    }
    if (prefill.occupation && !occupation) setOccupation(prefill.occupation)
    if (prefill.source_of_funds) setSourceOfFunds(prefill.source_of_funds)
    if (prefill.next_of_kin_name && !nextOfKinName) setNextOfKinName(prefill.next_of_kin_name)
    if (prefill.next_of_kin_relationship) {
      setNextOfKinRelationship(prefill.next_of_kin_relationship)
    }
    if (prefill.next_of_kin_phone && !nextOfKinPhone) {
      setNextOfKinPhone(prefill.next_of_kin_phone)
    }
    if (prefill.property?.rent_amount && !manualRentTarget) {
      setManualRentTarget(prefill.property.rent_amount)
    }
    if (prefill.property?.rent_end_date && !manualDueDate) {
      setManualDueDate(prefill.property.rent_end_date.split('T')[0])
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (manualRentTarget > 0 || manualDueDate) {
        const rawPlan = localStorage.getItem('upward_savings_rent_plan')
        const plan = rawPlan ? JSON.parse(rawPlan) : {}
        plan.userId = user?.id
        plan.source = 'user'
        if (manualRentTarget > 0) plan.rentAmount = manualRentTarget
        if (manualDueDate) plan.dueDate = manualDueDate
        localStorage.setItem('upward_savings_rent_plan', JSON.stringify(plan))

        const rawDraft = localStorage.getItem('upward_setup_draft')
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft)
          if (parsed?.formData) {
            if (manualRentTarget > 0) parsed.formData.rentAmount = manualRentTarget.toLocaleString()
            if (manualDueDate) {
              parsed.formData.rentEndDate = manualDueDate
              parsed.formData.rentStartDate = new Date(
                new Date(manualDueDate).getTime() - 365 * 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .split('T')[0]
            }
            localStorage.setItem('upward_setup_draft', JSON.stringify(parsed))
          }
        }
      }
    } catch {}
  }, [manualRentTarget, manualDueDate, user?.id])

  const [createdDva, setCreatedDva] = useState<{
    bank_name: string
    account_number: string
    account_name: string
  } | null>(null)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedDetails, setCopiedDetails] = useState(false)
  const [selectedFrequency, setSelectedFrequency] = useState<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FLEXIBLE'
  >(() => {
    if (vault?.cadence === 'DAILY' || vault?.cadence === 'WEEKLY') return vault.cadence
    return 'MONTHLY'
  })
  const selectedCadence: SavingsCadence =
    selectedFrequency === 'FLEXIBLE' ? 'MONTHLY' : selectedFrequency
  const [selectedProductOption, setSelectedProductOption] = useState<SavingsProductOption>(() => {
    if (vault?.product_option) return vault.product_option
    const saved = readSavingsRentPlan()
    return saved?.productOption === 'SAVE_AND_EARN' ? 'SAVE_AND_EARN' : 'RENT_PROTEC'
  })
  const [startAmountRaw, setStartAmountRaw] = useState<string>(() => {
    if (vault?.initial_deposit_kobo && vault.initial_deposit_kobo > 0) {
      return formatCurrencyInput(Math.round(vault.initial_deposit_kobo / 100))
    }
    const saved = readSavingsRentPlan()
    if (saved?.planPattern === 'INITIAL_DEPOSIT' && saved.initialDeposit && Number(saved.initialDeposit) > 0) {
      return formatCurrencyInput(Number(saved.initialDeposit))
    }
    return ''
  })
  const startAmountNaira = parseCurrencyInput(startAmountRaw) || 0
  const savedPlanPattern = readSavingsRentPlan()?.planPattern
  const planPattern: SavingsPlanPattern =
    startAmountNaira > 0
      ? 'INITIAL_DEPOSIT'
      : savedPlanPattern === 'STEP_UP'
        ? 'STEP_UP'
        : 'EQUAL'
  const [customFundAmount, setCustomFundAmount] = useState<string | null>(null)

  const [formError, setFormError] = useState<string | null>(null)

  const onboardMutation = useOnboardSavingsInvestor()
  const { success: toastSuccess, error: toastError } = useToast()

  const targetRent = activeProperty?.rentAmount || manualRentTarget || 0
  const targetDueDate = activeProperty?.rentEndDate || manualDueDate || ''
  const runwayDays = Math.max(
    1,
    Math.ceil((new Date(targetDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)),
  )
  const earlySettlementDate = new Date(new Date(targetDueDate).getTime() - 30 * 24 * 60 * 60 * 1000)
  const earlySettlementDateStr = earlySettlementDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  // Work-backwards compound yield calculation ("Pay Less" plan)
  const { rates: platformRates } = usePlatformRates()
  const isRentProtecEligible = runwayDays >= (platformRates.rentProtecMinMonths || 6) * 28
  const activeProductOption: SavingsProductOption =
    selectedProductOption === 'RENT_PROTEC' && !isRentProtecEligible
      ? 'SAVE_AND_EARN'
      : selectedProductOption
  const savingsAnnualRatePct =
    activeProductOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : platformRates.savingsAnnualRatePct
  const savingsDays = Math.max(1, runwayDays - 30)
  const payLessPlan = calculatePayLessPlan(
    targetRent,
    savingsDays,
    selectedCadence,
    startAmountNaira,
    savingsAnnualRatePct,
    {
      productOption: activeProductOption,
      planPattern,
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
    },
  )
  const minStartNaira =
    activeProductOption === 'RENT_PROTEC'
      ? calculatePayLessPlan(
          targetRent,
          savingsDays,
          selectedCadence,
          0,
          savingsAnnualRatePct,
          {
            productOption: 'RENT_PROTEC',
            planPattern: 'EQUAL',
            maxMonths: platformRates.maxSavingsMonths,
            minRentProtecMonths: platformRates.rentProtecMinMonths,
            insurancePremiumPct: platformRates.insurancePremiumPct,
          },
        ).requiredInitialDepositNaira
      : 0
  const periodicTarget = payLessPlan.periodicDepositNaira
  const totalTenantContribution = payLessPlan.totalTenantContributionNaira
  const estimatedYield = payLessPlan.projectedYieldNaira
  const cadenceUnitLabel =
    selectedFrequency === 'DAILY'
      ? 'day'
      : selectedFrequency === 'WEEKLY'
        ? 'week'
        : selectedFrequency === 'FLEXIBLE'
          ? 'flexible'
          : 'month'

  const fundAmount =
    customFundAmount ??
    (planPattern === 'INITIAL_DEPOSIT'
      ? startAmountNaira > 0
        ? startAmountNaira.toLocaleString()
        : targetRent > 0
          ? Math.round(targetRent * 0.25).toLocaleString()
          : '100,000'
      : periodicTarget > 0
        ? periodicTarget.toLocaleString()
        : '100,000')
  const numericFundAmount = Number(fundAmount.replace(/,/g, '')) || 0

  const dynamicPlanStep4 = calculatePayLessPlan(
    targetRent || 2_500_000,
    savingsDays,
    'MONTHLY',
    numericFundAmount,
    savingsAnnualRatePct,
    {
      productOption: activeProductOption,
      planPattern,
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
    },
  )
  const periodicDepositStep4 = dynamicPlanStep4.periodicDepositNaira
  const interestStep4 = dynamicPlanStep4.projectedYieldNaira

  const dvaToShow =
    (createdDva?.account_number ? createdDva : null) ||
    (vault?.dedicated_account?.account_number ? vault.dedicated_account : null) ||
    (process.env.NODE_ENV !== 'production'
      ? {
          bank_name: 'Wema Bank',
          account_number: '0284719283',
          account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
        }
      : null)

  const handleBankTransferConfirm = () => {
    toastSuccess('Transfer recorded! Your vault will be credited as soon as funds arrive.')
    onSuccess()
    onClose()
  }

  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11)
    setBvn(val)
    if (formError) setFormError(null)
  }

  const handleNextOfKinPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d+]/g, '').slice(0, 14)
    setNextOfKinPhone(val)
    if (formError) setFormError(null)
  }

  const hasVerifiedBvnOnFile = Boolean(prefill?.has_verified_bvn)

  const handleStep1Next = () => {
    if (bvn.length !== 11 && !hasVerifiedBvnOnFile) {
      setFormError('Please enter a valid 11-digit Bank Verification Number.')
      return
    }
    if (!mothersMaidenName.trim()) {
      setFormError("Mother's Maiden Name is required for regulatory compliance.")
      return
    }
    setFormError(null)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!occupation.trim()) {
      setFormError('Please enter your occupation.')
      return
    }
    if (!nextOfKinName.trim()) {
      setFormError('Please provide your Next of Kin full legal name.')
      return
    }
    if (!nextOfKinPhone.trim() || nextOfKinPhone.length < 10) {
      setFormError('Please provide a valid phone number for your Next of Kin.')
      return
    }

    setFormError(null)

    try {
      const res = await onboardMutation.mutateAsync({
        bvn: bvn.length === 11 ? bvn : undefined,
        mothers_maiden_name: mothersMaidenName.trim(),
        occupation: occupation.trim(),
        source_of_funds: sourceOfFunds,
        income_range: prefill?.income_range || '1M-5M',
        next_of_kin_name: nextOfKinName.trim(),
        next_of_kin_relationship: nextOfKinRelationship,
        next_of_kin_phone: nextOfKinPhone.trim(),
        next_of_kin_email: prefill?.next_of_kin_email || undefined,
        next_of_kin_address: prefill?.next_of_kin_address || undefined,
        settlement_bank_code: prefill?.settlement_bank_code || undefined,
        settlement_account_number: prefill?.settlement_account_number || undefined,
        settlement_account_name: prefill?.settlement_account_name || undefined,
        settlement_bank_name: prefill?.settlement_bank_name || undefined,
        target_amount: targetRent,
        rent_due_date: targetDueDate || undefined,
        cadence: selectedCadence,
        product_option: activeProductOption,
        plan_pattern: planPattern,
        initial_deposit_kobo:
          payLessPlan.requiredInitialDepositNaira > 0
            ? payLessPlan.requiredInitialDepositNaira * 100
            : undefined,
      })

      const dva = res?.dedicated_account
      if (dva?.account_number) {
        setCreatedDva(dva)
      } else if (process.env.NODE_ENV !== 'production') {
        const fallbackAccSuffix = nowTimestamp.toString().slice(-8)
        setCreatedDva({
          bank_name: 'Wema Bank',
          account_number: `02${fallbackAccSuffix}`,
          account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
        })
      } else {
        setCreatedDva(null)
      }
      setStep(3)
      toastSuccess('Investor profile verified and dedicated Wema account ready!')
      refreshUser().catch(() => {})
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg =
        error?.message || 'Verification failed with identity provider. Please check details.'
      setFormError(msg)
      toastError(msg)
    }
  }

  const handleBack = () => {
    if (step === 4) {
      setStep(3)
    } else if (step === 2) {
      setStep(1)
    } else if (step === 3 && !user?.isIdentityVerified) {
      setStep(2)
    } else {
      onClose()
    }
  }

  const isLoading = onboardMutation.isPending

  if (!isOpen || !isClient || typeof document === 'undefined') return null

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={() => {
        if (step >= 3) onSuccess()
        onClose()
      }}
      title={
        step === 4
          ? 'Make a Deposit'
          : step === 3
            ? 'Pay Less for Your Next Rent'
            : 'Identity Verification'
      }
      subtitle={
        step === 4
          ? undefined
          : step === 3
            ? `Earn ${savingsAnnualRatePct}% p.a. returns and let interest complete your rent`
            : `Required by CBN & SEC • ${platformRates.partnerShortName || 'ARM'} Money Market Fund (MMF)`
      }
      icon={
        step === 4 ? (
          <Landmark size={18} />
        ) : step === 3 ? (
          <TrendingUp size={18} />
        ) : (
          <ShieldCheck size={18} />
        )
      }
      maxWidth="520px"
      closeOnOverlayClick={!isLoading}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0 12px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: step >= s ? 'var(--clay)' : 'var(--border)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>

        {formError && (
          <div
            className="rent-calculator__affordability"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: 'var(--error)',
              marginBottom: 16,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem' }}>{formError}</span>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(hasVerifiedBvnOnFile || prefill?.mothers_maiden_name || prefill?.next_of_kin_name) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#10b981',
                }}
              >
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                <span>Details pre-filled from your existing Upward profile</span>
              </div>
            )}

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Bank Verification Number (BVN)</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={
                    hasVerifiedBvnOnFile && prefill?.masked_bvn
                      ? `Verified on file (${prefill.masked_bvn})`
                      : 'Enter 11-digit BVN'
                  }
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={bvn}
                  onChange={handleBvnChange}
                  maxLength={11}
                  disabled={isLoading}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {hasVerifiedBvnOnFile && bvn.length !== 11
                  ? `Verified BVN (${prefill?.masked_bvn}) on file`
                  : `${bvn.length}/11 digits`}
              </span>
            </div>

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Mother&apos;s Maiden Name</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  placeholder="Mother's birth family name"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={mothersMaidenName}
                  onChange={(e) => setMothersMaidenName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Security question to protect your identity and account
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Lock size={14} color="var(--clay)" style={{ flexShrink: 0 }} />
              <span>
                Your details are securely encrypted and verified in real time.
              </span>
            </div>

            <button
              type="button"
              className="vault-btn-primary"
              onClick={handleStep1Next}
              disabled={
                (bvn.length !== 11 && !hasVerifiedBvnOnFile) ||
                !mothersMaidenName.trim() ||
                isLoading
              }
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Occupation / Profession</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  placeholder="e.g. Software Engineer, Accountant, Trader"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Primary Source of Income</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                }}
              >
                {(['Salary', 'Business', 'Savings', 'Investment'] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSourceOfFunds(source)}
                    style={{
                      padding: '8px 2px',
                      borderRadius: '8px',
                      border: `1.5px solid ${sourceOfFunds === source ? 'var(--clay)' : 'var(--border)'}`,
                      background: sourceOfFunds === source ? 'var(--clay-faint)' : 'transparent',
                      color: sourceOfFunds === source ? 'var(--clay)' : 'var(--text)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'center',
                    }}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                Next of Kin Details
              </span>
            </div>

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Full Legal Name</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  placeholder="Next of kin full name"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={nextOfKinName}
                  onChange={(e) => setNextOfKinName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Relationship</label>
                <select
                  value={nextOfKinRelationship}
                  onChange={(e) => setNextOfKinRelationship(e.target.value)}
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  disabled={isLoading}
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Phone Number</label>
                <div className="rent-calculator__input-wrapper">
                  <input
                    type="tel"
                    placeholder="080XXXXXXXX"
                    className="rent-calculator__input rent-calculator__input--no-prefix"
                    value={nextOfKinPhone}
                    onChange={handleNextOfKinPhoneChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                className="vault-btn-secondary"
                onClick={() => setStep(1)}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="vault-btn-primary"
                onClick={handleSubmit}
                disabled={
                  !occupation.trim() || !nextOfKinName.trim() || !nextOfKinPhone.trim() || isLoading
                }
                style={{ flex: 2 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!activeProperty && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--surface-sunken, #f8f6f3)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
                  Enter Your Rent Obligation
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Target Rent (₦)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2,500,000"
                      className="rent-calculator__input rent-calculator__input--no-prefix"
                      style={{ marginTop: 4, height: 38, fontSize: '0.875rem' }}
                      value={manualRentTarget || ''}
                      onChange={(e) => setManualRentTarget(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="rent-calculator__input rent-calculator__input--no-prefix"
                      style={{ marginTop: 4, height: 38, fontSize: '0.875rem' }}
                      value={manualDueDate}
                      onChange={(e) => setManualDueDate(e.target.value)}
                      min={minDate}
                    />
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
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
                  Target Rent
                </span>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--text)',
                    marginTop: 2,
                  }}
                >
                  {formatCurrency(targetRent, 'NGN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'var(--clay-faint)',
                    color: 'var(--clay)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <Calendar size={13} />
                  <span>{runwayDays} Days Left</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Due{' '}
                  {new Date(targetDueDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* 1. Product Option Selector FIRST (Rent Protec vs Save & Earn) */}
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Choose your savings plan
              </span>
              <div className="savings-plan-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProductOption === 'RENT_PROTEC'}
                  disabled={!isRentProtecEligible}
                  onClick={() => {
                    setSelectedProductOption('RENT_PROTEC')
                    setCustomFundAmount(null)
                  }}
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
                  onClick={() => {
                    setSelectedProductOption('SAVE_AND_EARN')
                    setCustomFundAmount(null)
                  }}
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
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.35 }}>
                  Rent Protec requires at least {platformRates.rentProtecMinMonths} months before your rent is due.
                </p>
              )}
            </div>

            {/* 2. Savings Frequency Selector (Daily / Weekly / Monthly / Flexible) */}
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                How often do you want to save?
              </span>
              <div className="savings-cadence-grid">
                {(
                  [
                    { id: 'DAILY' as const, label: 'Daily' },
                    { id: 'WEEKLY' as const, label: 'Weekly' },
                    { id: 'MONTHLY' as const, label: 'Monthly' },
                    { id: 'FLEXIBLE' as const, label: 'Flexible' },
                  ]
                ).map((freq) => {
                  const isActive = selectedFrequency === freq.id
                  return (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => {
                        setSelectedFrequency(freq.id)
                        setCustomFundAmount(null)
                      }}
                      className={`savings-cadence-btn ${
                        isActive ? 'savings-cadence-btn--active' : ''
                      }`}
                    >
                      {freq.label}
                    </button>
                  )
                })}
              </div>
              {selectedFrequency === 'FLEXIBLE' && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '6px 0 0', display: 'block', lineHeight: 1.35 }}>
                  Save anytime via bank transfer at your own pace. Daily compound interest still applies.
                </span>
              )}
            </div>

            {/* 3. Contribution Schedule Pattern */}
            <div>
              <label
                htmlFor="savings-start-amount"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                How much do you want to start with today?
              </label>
              <div className="rent-calculator__input-wrapper">
                <span className="rent-calculator__input-prefix">₦</span>
                <input
                  id="savings-start-amount"
                  type="text"
                  inputMode="numeric"
                  className="rent-calculator__input"
                  placeholder={minStartNaira > 0 ? minStartNaira.toLocaleString() : '50,000'}
                  value={startAmountRaw}
                  onChange={(e) => {
                    const num = parseCurrencyInput(e.target.value)
                    setStartAmountRaw(num ? formatCurrencyInput(num) : '')
                    setCustomFundAmount(null)
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                {activeProductOption === 'RENT_PROTEC' && minStartNaira > 0
                  ? `Rent Protec minimum to start: ${formatCurrency(minStartNaira, 'NGN')}. You can start with more.`
                  : 'Start with any amount. Your regular deposits adjust to cover the rest.'}
              </span>
            </div>

            {/* Pay Less Breakdown Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--surface-sunken, #f8f6f3)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {selectedFrequency === 'FLEXIBLE'
                      ? 'Flexible savings target'
                      : `Recommended ${cadenceUnitLabel} savings`}
                  </span>
                  <div
                    style={{
                      fontSize: '1.375rem',
                      fontWeight: 800,
                      color: 'var(--clay)',
                      letterSpacing: '-0.02em',
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(periodicTarget, 'NGN')}
                    {selectedFrequency !== 'FLEXIBLE' && (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        / {cadenceUnitLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'var(--clay-faint)',
                    color: 'var(--clay)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                  }}
                >
                  <span>{payLessPlan.numberOfPayments} Deposits</span>
                </div>
              </div>

              {/* You Pay Less vs Interest Completes the Rest */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                    You Only Contribute
                  </span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text)' }}>
                    {formatCurrency(totalTenantContribution, 'NGN')}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                    Est. Returns
                  </span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#059669' }}>
                    +{formatCurrency(estimatedYield, 'NGN')}
                  </span>
                </div>
              </div>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                Save consistently for est. <strong>+{formatCurrency(estimatedYield, 'NGN')} in returns</strong> — earning {savingsAnnualRatePct}% p.a.{activeProductOption === 'RENT_PROTEC' ? ' + Rent Protec cover' : ''} towards your balance by {earlySettlementDateStr} (max {platformRates.maxSavingsMonths} months).
              </p>
            </div>

            <button
              type="button"
              className="vault-btn-primary"
              onClick={async () => {
                try {
                  await consentMutation.mutateAsync({
                    cadence: selectedCadence,
                    product_option: activeProductOption,
                    plan_pattern: planPattern,
                    initial_deposit_kobo:
                      payLessPlan.requiredInitialDepositNaira > 0
                        ? payLessPlan.requiredInitialDepositNaira * 100
                        : undefined,
                  })
                  await refreshUser()
                } catch {}
                setStep(4)
              }}
              disabled={consentMutation.isPending}
              style={{ marginTop: 6 }}
            >
              {consentMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Starting Vault...
                </>
              ) : (
                <>
                  Start Saving <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 8px' }}>
            {/* Amount to Fund */}
            <div>
              <div className="vault-sandbox-card__input-wrapper" style={{ height: 44 }}>
                <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="vault-sandbox-card__input"
                  placeholder="e.g. 1,000,000"
                  value={fundAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setCustomFundAmount(digits ? Number(digits).toLocaleString() : '')
                  }}
                  style={{ height: 44, fontSize: '1.2rem', fontWeight: 700 }}
                />
              </div>

              {/* Punchy 1-line benefit pitch */}
              {numericFundAmount > 0 && targetRent > 0 && (
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    marginTop: 6,
                    padding: '0 2px',
                  }}
                >
                  Pay <strong>{formatCurrency(numericFundAmount, 'NGN')}</strong> today, then deposit at least{' '}
                  <strong style={{ color: 'var(--clay)' }}>
                    {formatCurrency(periodicDepositStep4, 'NGN')}
                  </strong>{' '}
                  monthly for the rest of the year{' '}
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    (est. +{formatCurrency(interestStep4, 'NGN')} in returns)
                  </span>.
                </div>
              )}
            </div>

            {/* Compact Personal Rent Account Card */}
            {dvaToShow ? (
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
                    {dvaToShow.account_number}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dvaToShow.bank_name || 'Wema Bank'} · {dvaToShow.account_name}
                  </div>
                </div>
                <button
                  type="button"
                  className={`vault-dva-card__copy-btn ${copiedAccount ? 'vault-dva-card__copy-btn--copied' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', height: 32, flexShrink: 0 }}
                  onClick={() => {
                    navigator.clipboard.writeText(dvaToShow.account_number)
                    setCopiedAccount(true)
                    toastSuccess('Account number copied!')
                    setTimeout(() => setCopiedAccount(false), 2000)
                  }}
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
            ) : (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--surface2, #fbf9f6)',
                  border: '1px solid var(--border-solid, #eee7df)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Loader2 size={15} className="animate-spin" color="var(--clay)" />
                <span>Provisioning your dedicated funding account... Check back in a moment.</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
              <button
                type="button"
                className="vault-btn-primary"
                onClick={handleBankTransferConfirm}
                disabled={!dvaToShow}
                style={{ height: 44 }}
              >
                <CheckCircle2 size={16} />
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
                    onSuccess()
                    onClose()
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
          </div>
        )}
      </div>
    </BottomSheetModal>
  )
}
