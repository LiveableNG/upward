'use client'

import React, { useState } from 'react'
import {
  X,
  Lock,
  ShieldCheck,
  Building2,
  User,
  Phone,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useOnboardSavingsInvestor } from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'

interface SavingsInvestorKycModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '232', name: 'Sterling Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
  { code: '090267', name: 'Kuda Bank' },
  { code: '090110', name: 'VFD Microfinance Bank' },
  { code: '090405', name: 'OPay' },
  { code: '090328', name: 'PalmPay' },
]

export function SavingsInvestorKycModal({
  isOpen,
  onClose,
  onSuccess,
}: SavingsInvestorKycModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

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

  // Step 3: Linked Bank Account
  const [bankCode, setBankCode] = useState('058')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  const [formError, setFormError] = useState<string | null>(null)

  const onboardMutation = useOnboardSavingsInvestor()
  const { success: toastSuccess, error: toastError } = useToast()

  if (!isOpen) return null

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

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setAccountNumber(val)
    if (formError) setFormError(null)
  }

  const handleStep1Next = () => {
    if (bvn.length !== 11) {
      setFormError('Please enter a valid 11-digit Bank Verification Number.')
      return
    }
    if (!mothersMaidenName.trim()) {
      setFormError("Mother's Maiden Name is required for SEC regulatory compliance.")
      return
    }
    setFormError(null)
    setStep(2)
  }

  const handleStep2Next = () => {
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
    setStep(3)
  }

  const handleSubmit = async () => {
    if (accountNumber.length !== 10) {
      setFormError('Please enter a valid 10-digit NUBAN account number.')
      return
    }
    if (!accountName.trim()) {
      setFormError('Please enter the account name matching your bank account.')
      return
    }

    setFormError(null)
    const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode)

    try {
      await onboardMutation.mutateAsync({
        bvn,
        mothers_maiden_name: mothersMaidenName.trim(),
        occupation: occupation.trim(),
        source_of_funds: sourceOfFunds,
        income_range: '1M-5M',
        next_of_kin_name: nextOfKinName.trim(),
        next_of_kin_relationship: nextOfKinRelationship,
        next_of_kin_phone: nextOfKinPhone.trim(),
        settlement_bank_code: bankCode,
        settlement_account_number: accountNumber,
        settlement_account_name: accountName.trim(),
        settlement_bank_name: selectedBank?.name || 'Commercial Bank',
      })

      toastSuccess('Investor profile verified and registered successfully!')
      onSuccess()
      onClose()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg =
        err?.message || 'Verification failed with identity provider. Please check details.'
      setFormError(msg)
      toastError(msg)
    }
  }

  const isLoading = onboardMutation.isPending

  return (
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
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="vault-modal-title" style={{ fontSize: '1.0625rem' }}>
                Investor KYC Verification
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Required by SEC regulation &bull;{' '}
                <span style={{ opacity: 0.75 }}>powered by ARM</span>
              </p>
            </div>
          </div>
          {!isLoading && (
            <button type="button" className="vault-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Stepper Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= 1 ? 'var(--clay)' : 'var(--border)',
            }}
          />
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= 2 ? 'var(--clay)' : 'var(--border)',
            }}
          />
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= 3 ? 'var(--clay)' : 'var(--border)',
            }}
          />
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
                Encrypted with AES-256 and NDPR compliance. Verified via NIBSS in 2 seconds.
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
              <label className="rent-calculator__label">Source of Funds</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['Salary', 'Business', 'Savings', 'Investment'] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSourceOfFunds(source)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: `1.5px solid ${sourceOfFunds === source ? 'var(--clay)' : 'var(--border)'}`,
                      background: sourceOfFunds === source ? 'var(--clay-faint)' : 'transparent',
                      color: sourceOfFunds === source ? 'var(--clay)' : 'var(--text)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
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
                onClick={handleStep2Next}
                disabled={!occupation.trim() || !nextOfKinName.trim() || isLoading}
                style={{ flex: 2 }}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Settlement Bank Account */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Payout Settlement Bank</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="rent-calculator__input rent-calculator__input--no-prefix"
                disabled={isLoading}
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Account where your surplus interest will be disbursed
              </span>
            </div>

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Account Number (NUBAN)</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="10-digit NUBAN"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={accountNumber}
                  onChange={handleAccountNumberChange}
                  maxLength={10}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Account Holder Name</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  placeholder="Full name on bank account"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                className="vault-btn-secondary"
                onClick={() => setStep(2)}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="vault-btn-primary"
                onClick={handleSubmit}
                disabled={accountNumber.length !== 10 || !accountName.trim() || isLoading}
                style={{ flex: 2 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Verifying details...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Complete &amp; Register Vault
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
