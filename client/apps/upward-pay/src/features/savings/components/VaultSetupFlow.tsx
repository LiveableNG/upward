'use client'

import React, { useState } from 'react'
import {
  Landmark,
  Lock,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCreateRentVault } from '../hooks/useRentSavings'
import { calculatePayLessPlan, type SavingsCadence } from '../services/savingsService'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { SavingsInvestorKycModal } from './SavingsInvestorKycModal'

interface VaultSetupFlowProps {
  initialConfig: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: SavingsCadence
    periodicDepositKobo: number
  }
  onBack: () => void
  onSuccess: () => void
}

export function VaultSetupFlow({ initialConfig, onBack, onSuccess }: VaultSetupFlowProps) {
  const [selectedCadence, setSelectedCadence] = useState<SavingsCadence>(
    initialConfig.cadence || 'MONTHLY',
  )
  const [agreeToLock, setAgreeToLock] = useState<boolean>(false)
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false)
  const [nowTimestamp] = useState(() => Date.now())

  const { user, refreshUser } = useAuth()
  const createVaultMutation = useCreateRentVault()
  const { error: toastError, success: toastSuccess } = useToast()

  const targetAmountNaira = initialConfig.targetAmountKobo / 100
  const runwayDays = Math.max(
    1,
    Math.ceil(
      (new Date(initialConfig.contractualDueDate).getTime() - nowTimestamp) /
        (1000 * 60 * 60 * 24),
    ),
  )

  const payLessPlan = calculatePayLessPlan(targetAmountNaira, runwayDays, selectedCadence)
  const cadenceUnitLabel =
    selectedCadence === 'DAILY'
      ? 'day'
      : selectedCadence === 'WEEKLY'
        ? 'week'
        : 'month'

  const executeVaultCreation = async () => {
    await createVaultMutation.mutateAsync({
      target_amount_kobo: initialConfig.targetAmountKobo,
      contractual_due_date: initialConfig.contractualDueDate,
      cadence: selectedCadence,
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

        <h2 className="rent-calculator__title" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
          Pay less for your next rent
        </h2>
        <p className="rent-calculator__subtitle" style={{ fontSize: '0.8125rem' }}>
          Target Rent: <strong>{formatCurrency(targetAmountNaira, 'NGN')}</strong> due on {formattedDueDate}.
        </p>

        {/* Frequency Selection: Daily / Weekly / Monthly */}
        <div style={{ marginTop: 14, marginBottom: 14 }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Choose your savings frequency
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {(
              [
                { id: 'DAILY' as const, label: 'Daily' },
                { id: 'WEEKLY' as const, label: 'Weekly' },
                { id: 'MONTHLY' as const, label: 'Monthly' },
              ]
            ).map((freq) => {
              const isActive = selectedCadence === freq.id
              return (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => setSelectedCadence(freq.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isActive ? 'var(--clay)' : 'var(--border)'}`,
                    background: isActive ? 'var(--clay-faint)' : 'var(--surface)',
                    color: isActive ? 'var(--clay)' : 'var(--text)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {freq.label}
                </button>
              )
            })}
          </div>
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
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Save Every {cadenceUnitLabel}
              </span>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--clay)', marginTop: 2 }}>
                {formatCurrency(payLessPlan.periodicDepositNaira, 'NGN')}
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>
                  / {cadenceUnitLabel}
                </span>
              </div>
            </div>
            <span className="vault-setup__badge">
              <TrendingUp size={12} /> 14.5% p.a.
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
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            By saving consistently, your earned interest pays <strong>{formatCurrency(payLessPlan.projectedYieldNaira, 'NGN')}</strong> toward your rent so you pay less out of pocket.
          </p>
        </div>

        {/* Dedicated Personal Rent Account Method */}
        <div className="vault-setup__method-options">
          <div className="vault-setup__option vault-setup__option--active">
            <Landmark size={22} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="vault-setup__option-content" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="vault-setup__option-title">Personal Rent Bank Account</span>
                <span className="vault-setup__badge">Zero Direct Debit Fees</span>
              </div>
              <span className="vault-setup__option-desc">
                Transfer {formatCurrency(payLessPlan.periodicDepositNaira, 'NGN')} every {cadenceUnitLabel} from your bank app to your personal Wema Bank rent account.
              </span>
            </div>
          </div>
        </div>

        {/* Rent Lock Agreement */}
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
            : 'Confirm & Get Personal Rent Account'}
          <CheckCircle2 size={18} />
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
