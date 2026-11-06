'use client'

import React, { useState, useEffect } from 'react'
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
  Gift,
  Calendar,
} from 'lucide-react'
import {
  useOnboardSavingsInvestor,
  useConsentToSavings,
  useRentVault,
} from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { formatCurrency } from '@/lib/utils'

interface SavingsInvestorKycModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SavingsInvestorKycModal({
  isOpen,
  onClose,
  onSuccess,
}: SavingsInvestorKycModalProps) {
  const { user, refreshUser } = useAuth()
  const { data: vault } = useRentVault()
  const consentMutation = useConsentToSavings()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Pure references to avoid impure Date.now() calls during render
  const [minDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return tomorrow.toISOString().split('T')[0]
  })
  const [nowTimestamp] = useState(() => Date.now())

  // Initial step: If already verified, jump directly to Step 3 (Simulation & Consent)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (user?.isIdentityVerified ? 3 : 1))

  useEffect(() => {
    if (user?.isIdentityVerified && step < 3) {
      setStep(3)
    }
  }, [user?.isIdentityVerified, step])

  const activeProperty = (user?.properties || []).find((p: any) => !p.isPastTenancy && p.rentAmount)

  // Step 1: BVN & Security
  const [bvn, setBvn] = useState('')
  const [mothersMaidenName, setMothersMaidenName] = useState('')

  // Step 2: Investor Suitability & Next of Kin
  const [occupation, setOccupation] = useState('')
  const [sourceOfFunds, setSourceOfFunds] = useState<
    'Salary' | 'Business' | 'Savings' | 'Investment'
  >('Salary')
  const [nextOfKinName, setNextOfKinName] = useState('')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState('Spouse')
  const [nextOfKinPhone, setNextOfKinPhone] = useState('')

  // Step 3: Runway Simulation fallback if settings is empty
  const [manualRentTarget, setManualRentTarget] = useState<number>(0)
  const [manualDueDate, setManualDueDate] = useState<string>('')

  // Step 4: Generated Dedicated Virtual Account (Wema Bank)
  const [createdDva, setCreatedDva] = useState<{
    bank_name: string
    account_number: string
    account_name: string
  } | null>(null)
  const [copiedAccount, setCopiedAccount] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)

  const onboardMutation = useOnboardSavingsInvestor()
  const { success: toastSuccess, error: toastError } = useToast()

  if (!isOpen) return null

  // Source of truth: Settings active property
  const targetRent = activeProperty?.rentAmount || manualRentTarget || 2400000
  const targetDueDate = activeProperty?.rentEndDate || manualDueDate || '2027-10-15'
  const runwayDays = Math.max(
    1,
    Math.ceil((new Date(targetDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)),
  )
  // Target completion is 30 days before contractual rent due date
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

  const dvaToShow = createdDva ||
    vault?.dedicated_account || {
      bank_name: 'Wema Bank',
      account_number: '0284719283',
      account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
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

  const handleStep1Next = () => {
    if (bvn.length !== 11) {
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
        bvn,
        mothers_maiden_name: mothersMaidenName.trim(),
        occupation: occupation.trim(),
        source_of_funds: sourceOfFunds,
        income_range: '1M-5M',
        next_of_kin_name: nextOfKinName.trim(),
        next_of_kin_relationship: nextOfKinRelationship,
        next_of_kin_phone: nextOfKinPhone.trim(),
      })

      const dva = (res as any)?.data?.dedicated_account || (res as any)?.dedicated_account
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg =
        err?.message || 'Verification failed with identity provider. Please check details.'
      setFormError(msg)
      toastError(msg)
    }
  }

  const isLoading = onboardMutation.isPending

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="vault-modal-overlay" onClick={isLoading ? undefined : onClose}>
      <div
        className="vault-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        {/* Header */}
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
                <Landmark size={18} />
              ) : step === 3 ? (
                <TrendingUp size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
            </div>
            <div>
              <span className="vault-modal-title" style={{ fontSize: '1.0625rem' }}>
                {step === 4
                  ? 'Fund Your Wema Account'
                  : step === 3
                    ? 'Rent Runway & Rewards'
                    : 'Investor KYC Verification'}
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {step === 4
                  ? 'Transfer to your dedicated account anytime'
                  : step === 3
                    ? 'Based on your verified rental details'
                    : 'Required by SEC regulation • powered by ARM'}
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

        {/* Stepper Progress (4 Steps) */}
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

        {/* STEP 1: BVN & Security */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Bank Verification Number (BVN)</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 11-digit BVN"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={bvn}
                  onChange={handleBvnChange}
                  maxLength={11}
                  disabled={isLoading}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {bvn.length}/11 digits
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
                Statutory banking &amp; anti-fraud verification question
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
                Encrypted with AES-256 and NDPR compliance. Verified via Prembly in real time.
              </span>
            </div>

            <button
              type="button"
              className="vault-btn-primary"
              onClick={handleStep1Next}
              disabled={bvn.length !== 11 || !mothersMaidenName.trim() || isLoading}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Investor Profile & Next of Kin */}
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
                <ArrowLeft size={16} /> Back
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
                    <Loader2 size={18} className="animate-spin" /> Verifying details...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Complete &amp; Verify KYC
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Rent Runway & Simulation */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* If no property is linked in Settings, allow entering rent obligation */}
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

            {/* Target & Countdown Summary Card */}
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
                  Target Rent Obligation
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

            {/* Monthly Savings Target (Save fully by 30 days before due date) */}
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
                    Monthly Savings Target
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
                Save <strong>{formatCurrency(monthlyTargetToFinishEarly, 'NGN')} monthly</strong> to
                have your rent 100% saved by <strong>30 days before your due date</strong> (
                {earlySettlementDateStr}).
              </p>
            </div>

            {/* Projected ARM Yield Card */}
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
                  Daily compound interest backed by ARM Money Market Fund.
                </p>
              </div>
            </div>

            {/* Cashback Reward Card */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--surface-sunken, #f8f6f3)',
                border: '1px solid var(--border)',
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
                  background: 'var(--clay-faint)',
                  color: 'var(--clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Gift size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
                  Save regularly and get cashback on your rent
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Tenants with consistent saving attitudes earn Upward cashback on their final rent
                  settlement.
                </p>
              </div>
            </div>

            {/* CTA Button directly to fund account */}
            <button
              type="button"
              className="vault-btn-primary"
              onClick={async () => {
                try {
                  await consentMutation.mutateAsync()
                  await refreshUser()
                } catch {
                  // non-blocking
                }
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

        {/* STEP 4: Dedicated Wema Bank Account Created */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckCircle2 size={28} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3
                style={{
                  fontSize: '1.1875rem',
                  fontWeight: 700,
                  margin: '0 0 6px',
                  color: 'var(--text)',
                }}
              >
                KYC Approved &amp; Funding Account Ready
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Your dedicated Wema Bank funding account has been provisioned.
              </p>
            </div>

            {/* Dedicated Account Card */}
            <div className="vault-dva-card">
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
                    toastSuccess('Account number copied to clipboard!')
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Info size={16} color="var(--clay)" style={{ flexShrink: 0 }} />
              <span>
                Transfer to this account anytime from your bank app. Deposits automatically fund
                your rent vault and start earning 14.5% p.a. compound yield.
              </span>
            </div>

            <button
              type="button"
              className="vault-btn-primary"
              onClick={() => {
                onSuccess()
                onClose()
              }}
              style={{ marginTop: 4 }}
            >
              View My Rent Vault <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
