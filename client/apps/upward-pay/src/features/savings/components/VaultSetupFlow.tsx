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
  const selectedCadence: SavingsCadence = initialConfig.cadence || 'MONTHLY'
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
            {platformRates.partnerShortName || 'ARM'} Money Market Fund (MMF) • {annualRatePct}% p.a.
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
        </div>

        {/* Clean 2-Stat Summary Card */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                You Contribute
              </span>
              <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)', marginTop: 2, display: 'block' }}>
                {formatCurrency(payLessPlan.totalTenantContributionNaira, 'NGN')}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                Est. Interest ({annualRatePct}% p.a.)
              </span>
              <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#059669', marginTop: 2, display: 'block' }}>
                +{formatCurrency(payLessPlan.projectedYieldNaira, 'NGN')}
              </span>
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
            <span>Personal Rent Bank Account · Zero direct debit fees</span>
          </div>
        </div>

        {/* Rent Lock Notice */}
        <div className="vault-setup__lock-notice" style={{ marginTop: 0, padding: '10px 12px' }}>
          <Lock size={15} color="var(--clay)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Funds are locked safely towards rent until 30 days before your rent day.
          </span>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
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
          <span>I agree to lock my rent savings until rent day.</span>
        </label>

        <button
          type="button"
          className="vault-btn-primary"
          style={{ marginTop: 16, width: '100%' }}
          onClick={handleCreate}
          disabled={!agreeToLock || createVaultMutation.isPending}
        >
          {createVaultMutation.isPending ? (
            'Activating...'
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
