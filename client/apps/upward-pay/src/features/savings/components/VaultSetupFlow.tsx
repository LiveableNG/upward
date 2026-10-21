'use client'

import React, { useState } from 'react'
import { Landmark, CreditCard, Lock, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCreateRentVault } from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'

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
  const [fundingMethod, setFundingMethod] = useState<'DVA' | 'CARD_TOKEN'>('DVA')
  const [paydayOfMonth, setPaydayOfMonth] = useState<number>(25)
  const [agreeToLock, setAgreeToLock] = useState<boolean>(false)

  const createVaultMutation = useCreateRentVault()
  const { error: toastError, success: toastSuccess } = useToast()

  const handleCreate = async () => {
    if (!agreeToLock) {
      toastError('Please acknowledge the Vault Lock Agreement to proceed.')
      return
    }

    try {
      await createVaultMutation.mutateAsync({
        target_amount_kobo: initialConfig.targetAmountKobo,
        contractual_due_date: initialConfig.contractualDueDate,
        cadence: initialConfig.cadence,
        preferred_funding_method: fundingMethod,
        payday_day_of_month: fundingMethod === 'CARD_TOKEN' ? paydayOfMonth : undefined,
      })
      toastSuccess('Your Rent Vault has been successfully created and locked!')
      onSuccess()
    } catch (err: any) {
      toastError(err?.message || 'Failed to create rent vault. Please try again.')
    }
  }

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

        <h1 className="rent-calculator__title">Choose Your Funding Method</h1>
        <p className="rent-calculator__subtitle">
          Locking {formatCurrency(initialConfig.targetAmountKobo / 100, 'NGN')} due on{' '}
          {new Date(initialConfig.contractualDueDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>

        <div className="vault-setup__method-options">
          <div
            className={`vault-setup__option ${
              fundingMethod === 'DVA' ? 'vault-setup__option--active' : ''
            }`}
            onClick={() => setFundingMethod('DVA')}
          >
            <Landmark size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="vault-setup__option-content">
              <span className="vault-setup__option-title">Dedicated Bank Account (DVA)</span>
              <span className="vault-setup__option-desc">
                We assign a personalized Wema/Providus bank account to your vault for free bank
                transfers, salary standing orders, or bonus top-ups.
              </span>
            </div>
          </div>

          <div
            className={`vault-setup__option ${
              fundingMethod === 'CARD_TOKEN' ? 'vault-setup__option--active' : ''
            }`}
            onClick={() => setFundingMethod('CARD_TOKEN')}
          >
            <CreditCard size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="vault-setup__option-content">
              <span className="vault-setup__option-title">Automated Payday Debit Card Sweep</span>
              <span className="vault-setup__option-desc">
                Automatically debit your salary card on payday (24th–28th of every month) via
                Paystack.
              </span>
            </div>
          </div>
        </div>

        {fundingMethod === 'CARD_TOKEN' && (
          <div className="rent-calculator__field" style={{ marginTop: 16 }}>
            <label className="rent-calculator__label" htmlFor="payday-select">
              Select Payday (Day of Month)
            </label>
            <select
              id="payday-select"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              value={paydayOfMonth}
              onChange={(e) => setPaydayOfMonth(Number(e.target.value))}
            >
              {[24, 25, 26, 27, 28].map((day) => (
                <option key={day} value={day}>
                  {day}th of every month
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="vault-setup__lock-notice">
          <Lock size={20} color="var(--clay)" style={{ flexShrink: 0 }} />
          <div>
            <strong>Maturity Lock Agreement:</strong> Funds in this vault are strictly locked to
            safeguard your rent until 30 days before expiration. You can borrow up to 40% in an
            emergency, and daily interest continues compounding at 14.5% p.a.
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 20,
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
          <span>I understand and agree to the Rent Lock terms and conditions.</span>
        </label>

        <button
          type="button"
          className="vault-btn-primary"
          style={{ marginTop: 24 }}
          onClick={handleCreate}
          disabled={!agreeToLock || createVaultMutation.isPending}
        >
          {createVaultMutation.isPending
            ? 'Locking Rent Vault...'
            : 'Confirm & Activate Rent Vault'}
          <CheckCircle2 size={18} />
        </button>
      </div>
    </div>
  )
}
