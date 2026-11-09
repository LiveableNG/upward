'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
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
  Info,
  TrendingUp,
  Calendar,
  Zap,
  Sparkles,
} from 'lucide-react'
import {
  useOnboardSavingsInvestor,
  useConsentToSavings,
  useRentVault,
  useSavingsOnboardingPrefill,
  useSimulateVaultDeposit,
} from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { formatCurrency } from '@/lib/utils'

interface SavingsInvestorKycModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const emptySubscribe = () => () => {}

function getOrdinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function calculateDirectDebitFee(amount: number): number {
  if (!amount || amount <= 0) return 0
  const percentageFee = amount * 0.015
  const flatFee = amount >= 2500 ? 100 : 0
  const total = percentageFee + flatFee
  return Math.min(Math.round(total), 2000)
}

function calculateDvaFee(amount: number): number {
  if (!amount || amount <= 0) return 0
  // Paystack Dedicated Virtual Account pricing in Nigeria: 1% capped at ₦300
  return Math.min(Math.round(amount * 0.01), 300)
}

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
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('upward_savings_rent_plan')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.rentAmount) return Number(parsed.rentAmount)
        }
      } catch {}
    }
    return 0
  })
  const [manualDueDate, setManualDueDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('upward_savings_rent_plan')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.dueDate) return parsed.dueDate
        }
      } catch {}
    }
    return ''
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
  }, [manualRentTarget, manualDueDate])

  const [createdDva, setCreatedDva] = useState<{
    bank_name: string
    account_number: string
    account_name: string
  } | null>(null)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedDetails, setCopiedDetails] = useState(false)
  const [fundingOption, setFundingOption] = useState<'DIRECT_DEBIT' | 'BANK_TRANSFER'>('DIRECT_DEBIT')
  const [customFundAmount, setCustomFundAmount] = useState<string | null>(null)
  const [debitDay, setDebitDay] = useState(25)

  const [formError, setFormError] = useState<string | null>(null)

  const onboardMutation = useOnboardSavingsInvestor()
  const simulateMutation = useSimulateVaultDeposit()
  const { success: toastSuccess, error: toastError } = useToast()

  const targetRent = activeProperty?.rentAmount || manualRentTarget || 2400000
  const targetDueDate = activeProperty?.rentEndDate || manualDueDate || '2027-10-15'
  const runwayDays = Math.max(
    1,
    Math.ceil((new Date(targetDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)),
  )
  const daysToTargetEarly = Math.max(1, runwayDays - 30)
  const monthsToTarget = Math.max(1, Math.round(daysToTargetEarly / 30.417))
  const monthlyTargetToFinishEarly = Math.round(targetRent / monthsToTarget)
  const earlySettlementDate = new Date(new Date(targetDueDate).getTime() - 30 * 24 * 60 * 60 * 1000)
  const earlySettlementDateStr = earlySettlementDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const estimatedYield = Math.round(targetRent * 0.145 * (runwayDays / 365) * 0.52)

  const fundAmount =
    customFundAmount ??
    (monthlyTargetToFinishEarly > 0 ? monthlyTargetToFinishEarly.toLocaleString() : '100,000')
  const numericFundAmount = Number(fundAmount.replace(/,/g, '')) || 0
  const paystackFee =
    fundingOption === 'BANK_TRANSFER'
      ? calculateDvaFee(numericFundAmount)
      : calculateDirectDebitFee(numericFundAmount)
  const totalFundAmount = numericFundAmount + paystackFee

  const dvaToShow = createdDva ||
    vault?.dedicated_account || {
      bank_name: 'Wema Bank',
      account_number: '0284719283',
      account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
    }

  const handleDirectDebitSubmit = async () => {
    if (numericFundAmount < 1000) {
      toastError('Please enter a valid funding amount (minimum ₦1,000)')
      return
    }

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'upward_savings_direct_debit',
          JSON.stringify({
            amount: numericFundAmount,
            fee: paystackFee,
            total: totalFundAmount,
            debitDay,
            active: true,
            updatedAt: new Date().toISOString(),
          }),
        )
      }

      await simulateMutation.mutateAsync({
        accountNumber: dvaToShow.account_number,
        amountKobo: Math.round(numericFundAmount * 100),
      })

      const dayLabel = debitDay === 0 ? 'last day' : getOrdinalSuffix(debitDay)
      toastSuccess(
        `Direct debit scheduled! ₦${totalFundAmount.toLocaleString()} will auto-save on the ${dayLabel} of each month.`,
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to setup direct debit. Please try again.')
    }
  }

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
        target_amount: manualRentTarget || (prefill as any)?.target_rent || 2400000,
        rent_due_date: manualDueDate || (prefill as any)?.rent_due_date || undefined,
      })

      const dva = res?.dedicated_account
      if (dva) {
        setCreatedDva(dva)
      } else {
        setCreatedDva({
          bank_name: 'Wema Bank',
          account_number: '02' + Math.floor(10000000 + Math.random() * 90000000),
          account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
        })
      }
      setStep(3)
      toastSuccess('Investor profile verified and dedicated Wema account ready!')
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg =
        error?.message || 'Verification failed with identity provider. Please check details.'
      setFormError(msg)
      toastError(msg)
    }
  }

  const isLoading = onboardMutation.isPending

  if (!isOpen || !isClient || typeof document === 'undefined') return null

  return createPortal(
    <div className="vault-modal-overlay" onClick={isLoading ? undefined : onClose}>
      <div
        className="vault-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'var(--clay-faint)',
                color: 'var(--clay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {step === 4 ? (
                fundingOption === 'DIRECT_DEBIT' ? (
                  <Zap size={18} />
                ) : (
                  <Landmark size={18} />
                )
              ) : step === 3 ? (
                <TrendingUp size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
            </div>
            <div>
              <span className="vault-modal-title" style={{ fontSize: '1.0625rem' }}>
                {step === 4
                  ? 'Fund Your Rent Vault'
                  : step === 3
                    ? 'Rent Savings Plan'
                    : 'Identity Verification'}
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {step === 4
                  ? 'Choose direct debit or bank transfer'
                  : step === 3
                    ? 'Based on your verified rental details'
                    : 'Required by CBN & SEC • backed by ARM'}
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              type="button"
              className="vault-modal-close"
              onClick={() => {
                if (step >= 3) onSuccess()
                onClose()
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
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

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'var(--surface-sunken, #f8f6f3)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
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
                    Monthly Target
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
                    {formatCurrency(monthlyTargetToFinishEarly, 'NGN')}
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginLeft: 4,
                      }}
                    >
                      / month
                    </span>
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
                  <span>{monthsToTarget} Months Plan</span>
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
                Save monthly to finish <strong>30 days early</strong> ({earlySettlementDateStr}).
              </p>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#047857' }}>
                    Earn ~{formatCurrency(estimatedYield, 'NGN')} Profit
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#10b981' }}>
                    14.5% p.a.
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#065f46', margin: '2px 0 0' }}>
                  Daily compound returns backed by ARM Money Market.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="vault-btn-primary"
              onClick={async () => {
                try {
                  await consentMutation.mutateAsync()
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Amount to Fund */}
            <div className="rent-calculator__field" style={{ margin: 0 }}>
              <label
                className="rent-calculator__label"
                style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}
              >
                Amount to Save
              </label>
              <div className="rent-calculator__input-wrapper">
                <span className="rent-calculator__input-prefix" style={{ fontWeight: 700 }}>
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="rent-calculator__input"
                  placeholder="e.g. 100,000"
                  value={fundAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setCustomFundAmount(digits ? Number(digits).toLocaleString() : '')
                  }}
                  style={{ height: 44, fontSize: '1rem', fontWeight: 700 }}
                />
              </div>

              {/* Preset Chips */}
              <div className="vault-sandbox-card__chips" style={{ marginTop: 6 }}>
                {FUNDING_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`vault-sandbox-card__chip ${
                      fundAmount.replace(/,/g, '') === String(preset)
                        ? 'vault-sandbox-card__chip--active'
                        : ''
                    }`}
                    onClick={() => setCustomFundAmount(preset.toLocaleString())}
                  >
                    ₦{preset >= 1_000_000 ? `${preset / 1_000_000}M` : `${preset / 1_000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Selectable Options: Direct Debit vs Bank Transfer */}
            <div>
              <label
                className="rent-calculator__label"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Funding Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setFundingOption('DIRECT_DEBIT')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border:
                      fundingOption === 'DIRECT_DEBIT'
                        ? '2px solid var(--clay)'
                        : '1px solid var(--border)',
                    background:
                      fundingOption === 'DIRECT_DEBIT'
                        ? 'var(--clay-faint, rgba(200, 107, 73, 0.08))'
                        : 'var(--surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 3,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                    <Zap
                      size={14}
                      color={fundingOption === 'DIRECT_DEBIT' ? 'var(--clay)' : 'var(--text-muted)'}
                    />
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color:
                          fundingOption === 'DIRECT_DEBIT' ? 'var(--clay)' : 'var(--text)',
                      }}
                    >
                      Direct Debit
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Auto-save on set day
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFundingOption('BANK_TRANSFER')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border:
                      fundingOption === 'BANK_TRANSFER'
                        ? '2px solid var(--clay)'
                        : '1px solid var(--border)',
                    background:
                      fundingOption === 'BANK_TRANSFER'
                        ? 'var(--clay-faint, rgba(200, 107, 73, 0.08))'
                        : 'var(--surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 3,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                    <Landmark
                      size={14}
                      color={fundingOption === 'BANK_TRANSFER' ? 'var(--clay)' : 'var(--text-muted)'}
                    />
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color:
                          fundingOption === 'BANK_TRANSFER' ? 'var(--clay)' : 'var(--text)',
                      }}
                    >
                      Bank Transfer
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Personal account
                  </span>
                </button>
              </div>
            </div>

            {/* Paystack Fee Breakdown */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Amount: <strong>₦{numericFundAmount.toLocaleString()}</strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Paystack fee {fundingOption === 'BANK_TRANSFER' ? '(1%, max ₦300)' : '(1.5% + ₦100, max ₦2k)'}:{' '}
                  <strong>₦{paystackFee.toLocaleString()}</strong>
                </span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--clay)' }}>
                Total: ₦{totalFundAmount.toLocaleString()}
              </span>
            </div>

            {/* Option A: Direct Debit Details & Setup */}
            {fundingOption === 'DIRECT_DEBIT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="rent-calculator__field" style={{ margin: 0 }}>
                  <label
                    className="rent-calculator__label"
                    style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}
                  >
                    Debit Day of Every Month
                  </label>
                  <select
                    className="rent-calculator__input rent-calculator__input--no-prefix"
                    value={debitDay}
                    onChange={(e) => setDebitDay(Number(e.target.value))}
                    style={{ height: 42, fontSize: '0.8125rem' }}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {getOrdinalSuffix(d)} of every month
                        {d === 25 ? ' (Salary Day • Recommended)' : ''}
                      </option>
                    ))}
                    <option value={0}>Last day of every month (28th–31st)</option>
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: '0.6875rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Sparkles size={14} color="var(--clay)" style={{ flexShrink: 0 }} />
                  <span>
                    Debited on the {debitDay === 0 ? 'last day' : getOrdinalSuffix(debitDay)} monthly. Earns 14.5% daily interest.
                  </span>
                </div>

                <button
                  type="button"
                  className="vault-btn-primary"
                  onClick={handleDirectDebitSubmit}
                  disabled={simulateMutation.isPending || numericFundAmount < 1000}
                  style={{ height: 44, marginTop: 4 }}
                >
                  {simulateMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Setting up Direct Debit...</span>
                    </>
                  ) : (
                    <>
                      <span>Setup Direct Debit (₦{totalFundAmount.toLocaleString()})</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Option B: Bank Transfer Details */}
            {fundingOption === 'BANK_TRANSFER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="vault-dva-card" style={{ margin: 0 }}>
                  <div className="vault-dva-card__header">
                    <span className="vault-dva-card__title">Personal Rent Account</span>
                    <span className="vault-dva-card__badge">
                      <Zap size={11} /> Instant Credit
                    </span>
                  </div>
                  <div className="vault-dva-card__number-row">
                    <div className="vault-dva-card__number-block">
                      <span className="vault-dva-card__number-label">Account Number</span>
                      <span className="vault-dva-card__number">{dvaToShow.account_number}</span>
                    </div>
                    <button
                      type="button"
                      className={`vault-dva-card__copy-btn ${
                        copiedAccount ? 'vault-dva-card__copy-btn--copied' : ''
                      }`}
                      onClick={() => {
                        navigator.clipboard.writeText(dvaToShow.account_number)
                        setCopiedAccount(true)
                        toastSuccess('Account number copied!')
                        setTimeout(() => setCopiedAccount(false), 2000)
                      }}
                      title="Copy Account Number"
                    >
                      {copiedAccount ? (
                        <>
                          <Check size={14} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="vault-dva-card__meta-list">
                    <div className="vault-dva-card__meta-row">
                      <span className="vault-dva-card__meta-label">Bank Name</span>
                      <span className="vault-dva-card__meta-value">
                        {dvaToShow.bank_name || 'Wema Bank'}
                      </span>
                    </div>
                    <div className="vault-dva-card__meta-row">
                      <span className="vault-dva-card__meta-label">Account Name</span>
                      <span className="vault-dva-card__meta-value">{dvaToShow.account_name}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="vault-btn-primary"
                    onClick={handleBankTransferConfirm}
                    style={{ height: 44 }}
                  >
                    <span>I Have Transferred</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="vault-btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Account Number: ${dvaToShow.account_number}\nBank: ${dvaToShow.bank_name || 'Wema Bank'}\nAccount Name: ${dvaToShow.account_name}\nAmount: ₦${totalFundAmount.toLocaleString()}`,
                      )
                      setCopiedDetails(true)
                      toastSuccess('Account details copied!')
                      setTimeout(() => setCopiedDetails(false), 2000)
                    }}
                  >
                    {copiedDetails ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
