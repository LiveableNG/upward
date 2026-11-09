'use client'

import React, { useState } from 'react'
import {
  Landmark,
  CreditCard,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Calendar,
  Building2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCreateRentVault } from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { SavingsInvestorKycModal } from './SavingsInvestorKycModal'

interface VaultSetupFlowProps {
  initialConfig: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    periodicDepositKobo: number
  }
  onBack: () => void
  onSuccess: () => void
}

export function VaultSetupFlow({ initialConfig, onBack, onSuccess }: VaultSetupFlowProps) {
  // Direct Debit is the primary option by default (Cowrywise pattern)
  const [fundingMode, setFundingMode] = useState<'DIRECT_DEBIT' | 'MANUAL_TRANSFER'>('DIRECT_DEBIT')
  const [directDebitSource, setDirectDebitSource] = useState<'CARD' | 'BANK'>('CARD')
  const [paydayOfMonth, setPaydayOfMonth] = useState<number>(25)
  const [agreeToLock, setAgreeToLock] = useState<boolean>(false)
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false)

  const { user, refreshUser } = useAuth()
  const createVaultMutation = useCreateRentVault()
  const { error: toastError, success: toastSuccess } = useToast()

  const executeVaultCreation = async () => {
    const preferredMethod =
      fundingMode === 'MANUAL_TRANSFER'
        ? 'DVA'
        : directDebitSource === 'CARD'
          ? 'CARD_TOKEN'
          : 'DIRECT_DEBIT'

    await createVaultMutation.mutateAsync({
      target_amount_kobo: initialConfig.targetAmountKobo,
      contractual_due_date: initialConfig.contractualDueDate,
      cadence: initialConfig.cadence,
      preferred_funding_method: preferredMethod,
      payday_day_of_month: fundingMode === 'DIRECT_DEBIT' ? paydayOfMonth : undefined,
    })
    toastSuccess('Your Rent Savings plan is now active and locked!')
    onSuccess()
  }

  const handleCreate = async () => {
    if (!agreeToLock) {
      toastError('Please acknowledge the Rent Lock Agreement to proceed.')
      return
    }

    if (!user?.isIdentityVerified) {
      setIsKycModalOpen(true)
      return
    }

    try {
      await executeVaultCreation()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to setup rent savings. Please try again.')
    }
  }

  const handleKycSuccess = async () => {
    try {
      await refreshUser()
      await executeVaultCreation()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to activate savings after verification. Please try again.')
    }
  }

  const targetAmountNaira = initialConfig.targetAmountKobo / 100
  const periodicAmountNaira = initialConfig.periodicDepositKobo / 100
  const formattedDueDate = new Date(initialConfig.contractualDueDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const PAYDAY_PRESETS = [25, 26, 27, 28, 1]

  return (
    <div className="rent-calculator">
      <div className="rent-calculator__card">
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} /> Back to Calculator
        </button>

        <h2 className="rent-calculator__title" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
          How would you like to save?
        </h2>
        <p className="rent-calculator__subtitle" style={{ fontSize: '0.8125rem' }}>
          Target: <strong>{formatCurrency(targetAmountNaira, 'NGN')}</strong> due on {formattedDueDate}.
        </p>

        <div className="vault-setup__method-options">
          {/* PRIMARY OPTION: Automatic Direct Debit (Cowrywise pattern) */}
          <div
            className={`vault-setup__option ${
              fundingMode === 'DIRECT_DEBIT' ? 'vault-setup__option--active' : ''
            }`}
            onClick={() => setFundingMode('DIRECT_DEBIT')}
          >
            <Zap size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="vault-setup__option-content" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="vault-setup__option-title">Automatic Direct Debit (Auto-Save)</span>
                <span className="vault-setup__badge">⚡ Recommended</span>
              </div>
              <span className="vault-setup__option-desc">
                Save automatically without stress. We debit your card or bank account on your chosen date so you never miss your rent.
              </span>

              {fundingMode === 'DIRECT_DEBIT' && (
                <div className="vault-setup__config-box" onClick={(e) => e.stopPropagation()}>
                  {/* Source of Funds Selection */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                      Set Primary Source of Funds
                    </span>
                    <div className="vault-setup__source-grid">
                      <div
                        className={`vault-setup__source-card ${
                          directDebitSource === 'CARD' ? 'vault-setup__source-card--active' : ''
                        }`}
                        onClick={() => setDirectDebitSource('CARD')}
                      >
                        <CreditCard size={18} color="var(--clay)" />
                        <div className="vault-setup__source-info">
                          <span className="vault-setup__source-title">Debit Card</span>
                          <span className="vault-setup__source-sub">Mastercard, Visa, Verve</span>
                        </div>
                      </div>

                      <div
                        className={`vault-setup__source-card ${
                          directDebitSource === 'BANK' ? 'vault-setup__source-card--active' : ''
                        }`}
                        onClick={() => setDirectDebitSource('BANK')}
                      >
                        <Building2 size={18} color="var(--clay)" />
                        <div className="vault-setup__source-info">
                          <span className="vault-setup__source-title">Bank Account</span>
                          <span className="vault-setup__source-sub">Direct debit from bank</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date to be debited */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Calendar size={13} color="var(--clay)" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>
                        What day of the month should we debit?
                      </span>
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      Choose the day of the month that works best for you.
                    </span>

                    <div className="vault-setup__chip-row">
                      {PAYDAY_PRESETS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={`vault-setup__chip ${
                            paydayOfMonth === day ? 'vault-setup__chip--active' : ''
                          }`}
                          onClick={() => setPaydayOfMonth(day)}
                        >
                          {day === 1 ? '1st of month' : `${day}th of month`}
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <label htmlFor="custom-payday" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Or choose any day of the month:
                      </label>
                      <select
                        id="custom-payday"
                        className="rent-calculator__input rent-calculator__input--no-prefix"
                        value={paydayOfMonth}
                        onChange={(e) => setPaydayOfMonth(Number(e.target.value))}
                        style={{ height: 38, fontSize: '0.8125rem' }}
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of every month
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary note */}
                  <div className="vault-setup__summary-note">
                    <strong>Auto-Save Plan:</strong> {formatCurrency(periodicAmountNaira, 'NGN')} will be automatically debited from your {directDebitSource === 'CARD' ? 'card' : 'bank account'} on the {paydayOfMonth}th of every month.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ALTERNATIVE OPTION: Manual Bank Transfer */}
          <div
            className={`vault-setup__option ${
              fundingMode === 'MANUAL_TRANSFER' ? 'vault-setup__option--active' : ''
            }`}
            onClick={() => setFundingMode('MANUAL_TRANSFER')}
          >
            <Landmark size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="vault-setup__option-content" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="vault-setup__option-title">Manual Bank Transfer</span>
                <span className="vault-setup__badge vault-setup__badge--alt">Alternative</span>
              </div>
              <span className="vault-setup__option-desc">
                Transfer money anytime from your bank mobile app or USSD to your personal rent bank account without charges.
              </span>
            </div>
          </div>
        </div>

        {/* Rent Lock Agreement (Nigerian English) */}
        <div className="vault-setup__lock-notice">
          <Lock size={18} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Rent Lock Agreement:</strong> Funds saved here are locked safely towards your rent until 30 days before your rent day so you don&apos;t spend it on other things. Your savings earn 14.5% returns every year, added daily.
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 18,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={agreeToLock}
            onChange={(e) => setAgreeToLock(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--clay)' }}
          />
          <span>I understand and agree to lock my rent savings until rent day.</span>
        </label>

        <button
          type="button"
          className="vault-btn-primary"
          style={{ marginTop: 20 }}
          onClick={handleCreate}
          disabled={!agreeToLock || createVaultMutation.isPending}
        >
          {createVaultMutation.isPending
            ? 'Activating Your Rent Plan...'
            : fundingMode === 'DIRECT_DEBIT'
              ? 'Setup Direct Debit & Start Saving'
              : 'Confirm & Get Bank Account'}
          <CheckCircle2 size={18} />
        </button>

        <SavingsInvestorKycModal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          onSuccess={handleKycSuccess}
        />
      </div>
    </div>
  )
}
