'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import {
  Copy,
  Check,
  Landmark,
  CheckCircle2,
  Loader2,
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
  const [copiedField, setCopiedField] = useState<'account' | null>(null)

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField('account')
    toastSuccess('Account number copied!')
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
      toastSuccess(`Deposit of ${formatCurrency(rawNumber, 'NGN')} credited to your vault!`)
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
    'MONTHLY',
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

  const monthlyDepositNaira = dynamicPlan.periodicDepositNaira
  const projectedInterestNaira = dynamicPlan.projectedYieldNaira

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Make a Deposit"
      icon={<Landmark size={20} color="var(--clay)" />}
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 8px' }}>
        {/* Compact Amount Input */}
        <div>
          <div className="vault-sandbox-card__input-wrapper" style={{ height: 44 }}>
            <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              ₦
            </span>
            <input
              id="quick-save-amount"
              type="text"
              inputMode="numeric"
              className="vault-sandbox-card__input"
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
              placeholder="e.g. 1,000,000"
              value={customAmount}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, '')
                setCustomAmount(digits ? Number(digits).toLocaleString() : '')
              }}
            />
          </div>

          {/* Punchy 1-line benefit pitch */}
          {parsedDepositAmount > 0 && effectiveTargetRent > 0 && (
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
                marginTop: 6,
                padding: '0 2px',
              }}
            >
              Pay <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today, then deposit at least{' '}
              <strong style={{ color: 'var(--clay)' }}>
                {formatCurrency(monthlyDepositNaira, 'NGN')}
              </strong>{' '}
              monthly for the rest of the year{' '}
              <span style={{ color: '#059669', fontWeight: 600 }}>
                (est. +{formatCurrency(projectedInterestNaira, 'NGN')} in returns)
              </span>.
            </div>
          )}
        </div>

        {/* Compact Account Card */}
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
              {accountNumber}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bankName} · {accountName}
            </div>
          </div>
          <button
            type="button"
            className={`vault-dva-card__copy-btn ${copiedField === 'account' ? 'vault-dva-card__copy-btn--copied' : ''}`}
            style={{ padding: '6px 12px', fontSize: '0.75rem', height: 32, flexShrink: 0 }}
            onClick={() => handleCopy(accountNumber)}
          >
            {copiedField === 'account' ? (
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          <button
            type="button"
            className="vault-btn-primary"
            style={{ height: 44 }}
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
              style={{ fontSize: '0.75rem', height: 36 }}
            >
              {simulateMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Simulating Transfer...
                </>
              ) : (
                <span>Simulate Instant Transfer (₦{customAmount || '0'})</span>
              )}
            </button>
          )}

          {/* Quiet Skip Link: faint, unobtrusive text link as hard to see as possible */}
          <div style={{ textAlign: 'center', marginTop: 2 }}>
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
