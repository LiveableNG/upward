'use client'

import React, { useState } from 'react'
import {
  Landmark,
  Lock,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { useCreateRentVault } from '../hooks/useRentSavings'
import {
  calculatePayLessPlan,
  type SavingsCadence,
  type SavingsProductOption,
} from '../services/savingsService'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { SavingsInvestorKycModal } from './SavingsInvestorKycModal'

interface VaultSetupFlowProps {
  initialConfig: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: SavingsCadence
    periodicDepositKobo: number
    productOption?: SavingsProductOption
  }
  onBack: () => void
  onSuccess: () => void
}

const START_PRESETS = [50_000, 100_000, 250_000, 500_000]

export function VaultSetupFlow({ initialConfig, onBack, onSuccess }: VaultSetupFlowProps) {
  const productOption: SavingsProductOption = initialConfig.productOption || 'RENT_PROTEC'
  const [selectedFrequency, setSelectedFrequency] = useState<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FLEXIBLE'
  >(() => {
    if (initialConfig.cadence === 'DAILY' || initialConfig.cadence === 'WEEKLY') {
      return initialConfig.cadence
    }
    return 'MONTHLY'
  })
  const selectedCadence: SavingsCadence =
    selectedFrequency === 'FLEXIBLE' ? 'MONTHLY' : selectedFrequency
  const [startAmountRaw, setStartAmountRaw] = useState<string>('50,000')
  const [agreeToLock, setAgreeToLock] = useState<boolean>(false)
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false)
  const [nowTimestamp] = useState(() => Date.now())

  const { user, refreshUser } = useAuth()
  const { rates: platformRates } = usePlatformRates()
  const createVaultMutation = useCreateRentVault()
  const { error: toastError, success: toastSuccess } = useToast()

  const targetAmountNaira = initialConfig.targetAmountKobo / 100
  const initialDepositNaira = parseCurrencyInput(startAmountRaw) || 0
  // Rent is released 30 days before contractual due date (unlock date)
  const daysToDueDate = Math.max(
    1,
    Math.ceil(
      (new Date(initialConfig.contractualDueDate).getTime() - nowTimestamp) /
        (1000 * 60 * 60 * 24),
    ),
  )
  const savingsDays = Math.max(1, daysToDueDate - 30)

  const annualRatePct =
    productOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : platformRates.savingsAnnualRatePct

  const payLessPlan = calculatePayLessPlan(
    targetAmountNaira,
    savingsDays,
    selectedCadence,
    initialDepositNaira,
    annualRatePct,
    {
      productOption,
      planPattern: 'INITIAL_DEPOSIT',
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
    },
  )

  const cadenceUnitLabel =
    selectedFrequency === 'DAILY'
      ? 'day'
      : selectedFrequency === 'WEEKLY'
        ? 'week'
        : selectedFrequency === 'FLEXIBLE'
          ? 'flexible'
          : 'month'

  const cadenceShortLabel =
    selectedFrequency === 'DAILY'
      ? 'day'
      : selectedFrequency === 'WEEKLY'
        ? 'wk'
        : selectedFrequency === 'FLEXIBLE'
          ? 'flex'
          : 'mo'

  const executeVaultCreation = async () => {
    await createVaultMutation.mutateAsync({
      target_amount_kobo: initialConfig.targetAmountKobo,
      contractual_due_date: initialConfig.contractualDueDate,
      cadence: selectedCadence,
      product_option: productOption,
      initial_deposit_kobo: Math.round(initialDepositNaira * 100),
      preferred_funding_method: 'DVA',
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

  const formattedDueDate = new Date(initialConfig.contractualDueDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

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

        <div className="vault-setup__badge" style={{ marginBottom: 10 }}>
          <TrendingUp size={12} color="var(--clay)" />
          <span>
            Powered by ARM • {annualRatePct}% p.a.
            {productOption === 'RENT_PROTEC' ? ' • Rent Protec' : ' • Save & Earn'}
          </span>
        </div>

        <h2 className="rent-calculator__title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          Pay less for your next rent
        </h2>
        <p className="rent-calculator__subtitle" style={{ fontSize: '0.8125rem' }}>
          Target Rent: <strong>{formatCurrency(targetAmountNaira, 'NGN')}</strong> due on {formattedDueDate}.
        </p>

        {/* Initial Deposit: How much do you want to start with today? */}
        <div style={{ marginTop: 18, marginBottom: 16 }}>
          <label
            htmlFor="vault-setup-start-amount"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--text)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            How much do you want to start with today?
          </label>
          <div className="rent-calculator__input-wrapper">
            <span className="rent-calculator__input-prefix">₦</span>
            <input
              id="vault-setup-start-amount"
              type="text"
              inputMode="numeric"
              className="rent-calculator__input"
              placeholder="50,000"
              value={startAmountRaw}
              onChange={(e) => {
                const num = parseCurrencyInput(e.target.value)
                setStartAmountRaw(num ? formatCurrencyInput(num) : '')
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {START_PRESETS.map((preset) => {
              const isSelected = initialDepositNaira === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setStartAmountRaw(formatCurrencyInput(preset))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: `1px solid ${isSelected ? 'var(--clay)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--clay-faint)' : 'var(--surface)',
                    color: isSelected ? 'var(--clay)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ₦{preset.toLocaleString()}
                </button>
              )
            })}
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'block',
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Start with any amount today. Your regular deposits adjust to cover the rest.
          </span>
        </div>

        {/* Frequency Selection: Daily / Weekly / Monthly / Flexible */}
        <div style={{ marginTop: 14, marginBottom: 16 }}>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--text)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Choose your savings frequency
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
                  onClick={() => setSelectedFrequency(freq.id)}
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
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'block',
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              Save anytime via bank transfer at your own pace. Daily compound interest still applies.
            </span>
          )}
        </div>

        {/* Pay Less Breakdown Card */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {selectedFrequency === 'FLEXIBLE'
                  ? 'Flexible Deposits'
                  : `Save Every ${cadenceUnitLabel} (${payLessPlan.numberOfPayments} payments)`}
              </span>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--clay)', marginTop: 2 }}>
                {selectedFrequency === 'FLEXIBLE' ? (
                  'At Your Own Pace'
                ) : (
                  <>
                    {formatCurrency(payLessPlan.periodicDepositNaira, 'NGN')}
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginLeft: 4,
                      }}
                    >
                      / {cadenceShortLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="vault-setup__badge">
              <TrendingUp size={12} /> {annualRatePct}% p.a.
            </span>
          </div>

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
                {formatCurrency(payLessPlan.totalTenantContributionNaira, 'NGN')}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                Completed by Interest
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#059669' }}>
                +{formatCurrency(payLessPlan.projectedYieldNaira, 'NGN')}
              </span>
            </div>
          </div>

          {initialDepositNaira > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'var(--clay-faint)',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Starting Deposit Today:</span>
              <strong style={{ color: 'var(--clay)', fontWeight: 800 }}>
                {formatCurrency(initialDepositNaira, 'NGN')}
              </strong>
            </div>
          )}

          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            Earn {annualRatePct}% p.a. returns and let interest pay the remaining{' '}
            <strong>{formatCurrency(payLessPlan.projectedYieldNaira, 'NGN')}</strong> of your rent.
          </p>
        </div>

        {/* Dedicated Personal Rent Account Method */}
        <div className="vault-setup__method-options">
          <div className="vault-setup__option vault-setup__option--active">
            <Landmark size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="vault-setup__option-content" style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span className="vault-setup__option-title">Personal Rent Bank Account</span>
                <span className="vault-setup__badge">Zero Direct Debit Fees</span>
              </div>
              <span className="vault-setup__option-desc">
                Transfer {formatCurrency(initialDepositNaira > 0 ? initialDepositNaira : payLessPlan.periodicDepositNaira, 'NGN')}{' '}
                to start, then {formatCurrency(payLessPlan.periodicDepositNaira, 'NGN')} every{' '}
                {cadenceUnitLabel} ({payLessPlan.numberOfPayments} payments) from your bank app.
              </span>
            </div>
          </div>
        </div>

        {/* Rent Lock Agreement */}
        <div className="vault-setup__lock-notice">
          <Lock size={18} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Rent Lock Agreement:</strong> Funds saved here are locked safely towards your rent until 30 days before your rent day so you don&apos;t spend it on other things. Your savings earn {annualRatePct}% returns every year, added daily.
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
          style={{ marginTop: 20, width: '100%' }}
          onClick={handleCreate}
          disabled={!agreeToLock || createVaultMutation.isPending}
        >
          {createVaultMutation.isPending ? (
            'Activating Your Rent Plan...'
          ) : (
            <>
              <span>Confirm</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      <SavingsInvestorKycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={handleKycSuccess}
      />
    </div>
  )
}
