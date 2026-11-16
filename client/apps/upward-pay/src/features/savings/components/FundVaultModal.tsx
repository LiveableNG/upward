'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import {
  Copy,
  Check,
  Landmark,
  Zap,
  CheckCircle2,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { formatCurrency } from '@/lib/utils'
import { useSimulateVaultDeposit } from '../hooks/useRentSavings'
import {
  calculatePayLessPlan,
  type SavingsCadence,
  type SavingsProductOption,
} from '../services/savingsService'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'

interface FundVaultModalProps {
  isOpen: boolean
  onClose: () => void
  recommendedAmountNaira?: number
  cadence?: SavingsCadence
  dedicatedAccount?: {
    bank_name: string
    account_number: string
    account_name: string
  } | null
  targetAmountNaira?: number
  daysRemaining?: number
  annualRatePct?: number
  productOption?: SavingsProductOption
  currentBalanceNaira?: number
  isInitialDeposit?: boolean
}

const emptySubscribe = () => () => {}

export function FundVaultModal({
  isOpen,
  onClose,
  recommendedAmountNaira,
  cadence = 'MONTHLY',
  dedicatedAccount,
  targetAmountNaira,
  daysRemaining,
  annualRatePct,
  productOption = 'RENT_PROTEC',
  currentBalanceNaira = 0,
  isInitialDeposit = false,
}: FundVaultModalProps) {
  const [copiedField, setCopiedField] = useState<'account' | 'all' | null>(null)

  const defaultInitialAmount =
    targetAmountNaira && targetAmountNaira > 0 && (isInitialDeposit || currentBalanceNaira === 0)
      ? Math.round(targetAmountNaira * 0.25)
      : recommendedAmountNaira && recommendedAmountNaira > 0
        ? recommendedAmountNaira
        : 100_000

  const [customAmount, setCustomAmount] = useState(() => defaultInitialAmount.toLocaleString())
  const [hasPaidNotified, setHasPaidNotified] = useState(false)

  const { success: toastSuccess, error: toastError } = useToast()
  const { rates: platformRates } = usePlatformRates()
  const simulateMutation = useSimulateVaultDeposit()

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  useEffect(() => {
    if (targetAmountNaira && targetAmountNaira > 0 && (isInitialDeposit || currentBalanceNaira === 0)) {
      const initial25Pct = Math.round(targetAmountNaira * 0.25)
      setCustomAmount(initial25Pct.toLocaleString())
    }
  }, [targetAmountNaira, isInitialDeposit, currentBalanceNaira])

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

  const handleClose = () => {
    setHasPaidNotified(false)
    onClose()
  }

  const handleQuietSkip = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
      } catch {}
    }
    handleClose()
  }

  if (!isOpen || !isClient || typeof document === 'undefined') return null

  const bankName = dedicatedAccount?.bank_name || 'Wema Bank'
  const accountNumber = dedicatedAccount?.account_number || '9012345678'
  const accountName = dedicatedAccount?.account_name || 'Upward Rent Savings'

  const handleCopy = (text: string, field: 'account' | 'all') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toastSuccess('Account details copied to clipboard!')
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleDeposit = async () => {
    const rawNumber = Number(customAmount.replace(/,/g, ''))
    if (!rawNumber || isNaN(rawNumber) || rawNumber < 1000) {
      toastError('Please enter a valid deposit amount (minimum ₦1,000)')
      return
    }
    const amountKobo = Math.round(rawNumber * 100)

    try {
      await simulateMutation.mutateAsync({
        accountNumber,
        amountKobo,
      })
      toastSuccess(`Instant deposit of ${formatCurrency(rawNumber, 'NGN')} credited to your vault!`)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
        } catch {}
      }
      onClose()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to complete deposit. Please try again.')
    }
  }

  const handleIHavePaid = () => {
    setHasPaidNotified(true)
    toastSuccess('Payment recorded! We will credit your vault as soon as your transfer arrives.')
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
      } catch {}
    }
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  // Dynamic calculations for deposit impact
  const parsedDepositAmount = Number(customAmount.replace(/,/g, '')) || 0
  const effectiveTargetRent = targetAmountNaira || 2_500_000
  const effectiveRunwayDays = Math.max(1, daysRemaining || 330)
  const effectiveRatePct =
    annualRatePct ||
    (productOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : platformRates.savingsAnnualRatePct)

  const dynamicPlan = calculatePayLessPlan(
    effectiveTargetRent,
    effectiveRunwayDays,
    cadence,
    parsedDepositAmount,
    effectiveRatePct,
    {
      productOption,
      planPattern: 'INITIAL_DEPOSIT',
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
    },
  )

  const remainingToPayNaira = Math.max(
    0,
    dynamicPlan.totalTenantContributionNaira - parsedDepositAmount,
  )
  const projectedInterestNaira = dynamicPlan.projectedYieldNaira

  const percentPresets =
    effectiveTargetRent > 0
      ? [
          { label: '10%', amount: Math.round(effectiveTargetRent * 0.1) },
          { label: '25% (Recommended)', amount: Math.round(effectiveTargetRent * 0.25) },
          { label: '50%', amount: Math.round(effectiveTargetRent * 0.5) },
          { label: 'Full Rent', amount: effectiveTargetRent },
        ]
      : [
          { label: '₦50k', amount: 50_000 },
          { label: '₦100k', amount: 100_000 },
          { label: '₦250k', amount: 250_000 },
          { label: '₦500k', amount: 500_000 },
        ]

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isInitialDeposit || currentBalanceNaira === 0 ? 'Make Your Initial Deposit' : 'Add Money to Rent Savings'}
      subtitle={
        isInitialDeposit || currentBalanceNaira === 0
          ? 'Deposit 25% today to lock in compound interest towards your rent.'
          : `Earns ${effectiveRatePct}% returns every year so you pay less for rent.`
      }
      icon={<Landmark size={20} />}
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0 12px' }}>
        {/* Amount input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label
              htmlFor="quick-save-amount"
              style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}
            >
              {isInitialDeposit || currentBalanceNaira === 0 ? 'Initial Deposit Amount' : `Amount to Transfer (${cadence.toLowerCase()} target)`}
            </label>
            {(isInitialDeposit || currentBalanceNaira === 0) && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--clay)',
                  background: 'rgba(194, 80, 31, 0.08)',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                25% of rent recommended
              </span>
            )}
          </div>
          <div className="vault-sandbox-card__input-wrapper" style={{ height: 46 }}>
            <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              ₦
            </span>
            <input
              id="quick-save-amount"
              type="text"
              inputMode="numeric"
              className="vault-sandbox-card__input"
              style={{ fontSize: '1.25rem', fontWeight: 700 }}
              placeholder="e.g. 1,000,000"
              value={customAmount}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, '')
                setCustomAmount(digits ? Number(digits).toLocaleString() : '')
              }}
            />
          </div>

          {/* Quick preset chips */}
          <div className="vault-sandbox-card__chips" style={{ marginTop: 8 }}>
            {percentPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`vault-sandbox-card__chip ${
                  customAmount.replace(/,/g, '') === String(preset.amount)
                    ? 'vault-sandbox-card__chip--active'
                    : ''
                }`}
                onClick={() => setCustomAmount(preset.amount.toLocaleString())}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Benefit Pitch Card */}
        {parsedDepositAmount > 0 && effectiveTargetRent > 0 && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#fffaf7',
              border: '1.5px solid rgba(194, 80, 31, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 2px 8px rgba(194, 80, 31, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: 'rgba(194, 80, 31, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <TrendingUp size={15} color="var(--clay)" />
              </div>
              <div style={{ fontSize: '0.8125rem', lineHeight: 1.45, color: 'var(--text)' }}>
                If you pay <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today, you only pay{' '}
                <strong style={{ color: 'var(--clay)' }}>
                  {formatCurrency(remainingToPayNaira, 'NGN')}
                </strong>{' '}
                for the remaining part of the year.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid rgba(194, 80, 31, 0.12)',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Compound interest earned:</span>
              <strong style={{ color: '#059669', fontSize: '0.8125rem' }}>
                +{formatCurrency(projectedInterestNaira, 'NGN')}
              </strong>
            </div>
          </div>
        )}

        {/* Personal Rent Account Details */}
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
              <span className="vault-dva-card__number">{accountNumber}</span>
            </div>
            <button
              type="button"
              className={`vault-dva-card__copy-btn ${
                copiedField === 'account' ? 'vault-dva-card__copy-btn--copied' : ''
              }`}
              onClick={() => handleCopy(accountNumber, 'account')}
            >
              {copiedField === 'account' ? (
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
              <span className="vault-dva-card__meta-value">{bankName}</span>
            </div>
            <div className="vault-dva-card__meta-row">
              <span className="vault-dva-card__meta-label">Account Name</span>
              <span className="vault-dva-card__meta-value">{accountName}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="vault-btn-primary"
            onClick={handleIHavePaid}
            disabled={hasPaidNotified}
          >
            <CheckCircle2 size={16} />
            <span>{hasPaidNotified ? 'Transfer Recorded!' : 'I Have Transferred'}</span>
          </button>

          {process.env.NODE_ENV !== 'production' && (
            <button
              type="button"
              className="vault-btn-secondary"
              onClick={handleDeposit}
              disabled={simulateMutation.isPending}
              style={{ fontSize: '0.75rem' }}
            >
              {simulateMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Simulating Transfer...
                </>
              ) : (
                <span>Simulate Instant Bank Transfer (₦{customAmount || '0'})</span>
              )}
            </button>
          )}

          {/* Quiet Skip Link: faint, unobtrusive text link as hard to see as possible */}
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={handleQuietSkip}
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
    </BottomSheetModal>
  )
}
