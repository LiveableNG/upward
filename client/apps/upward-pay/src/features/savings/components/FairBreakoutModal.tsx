'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, X, Shield, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBreakoutPreview, useBreakoutRentVault } from '../hooks/useRentSavings'
import type {
  BreakoutResultData,
  SavingsLockMode,
  SavingsProductOption,
} from '../services/savingsService'
import { useToast } from '@/components/common/Toast'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'

interface FairBreakoutModalProps {
  vaultId: string
  principalKobo: number
  accruedYieldKobo: number
  lockMode?: SavingsLockMode
  productOption?: SavingsProductOption
  annualRatePct?: number
  onClose: () => void
  onCompleted?: () => void
}

const emptySubscribe = () => () => {}

export function FairBreakoutModal({
  vaultId,
  principalKobo,
  accruedYieldKobo,
  lockMode = 'LOCKED',
  productOption = 'SAVE_AND_EARN',
  annualRatePct,
  onClose,
  onCompleted,
}: FairBreakoutModalProps) {
  const [breakoutResult, setBreakoutResult] = useState<BreakoutResultData | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const { error: toastError, success: toastSuccess } = useToast()
  const { rates: platformRates } = usePlatformRates()
  const previewQuery = useBreakoutPreview(vaultId, !breakoutResult)
  const breakoutMutation = useBreakoutRentVault()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!isClient || typeof document === 'undefined') return null

  const preview = previewQuery.data
  const resolvedTier =
    preview?.tier ??
    (productOption === 'RENT_PROTEC'
      ? 'RENT_PROTEC'
      : lockMode === 'FLEXIBLE'
        ? 'FLEXIBLE'
        : 'FULL_LOCK')
  const isFlexible = resolvedTier === 'FLEXIBLE'
  const isFullLock = resolvedTier === 'FULL_LOCK'
  const isRentProtec = resolvedTier === 'RENT_PROTEC'

  const annualRate =
    annualRatePct ??
    (isRentProtec
      ? (platformRates?.rentProtecRatePct ?? 10)
      : isFlexible
        ? (platformRates?.flexibleSavingsAnnualRatePct ?? 12)
        : (platformRates?.savingsAnnualRatePct ?? 16))

  const recalcRatePct =
    preview?.recalculation_rate_pct ?? (isFlexible ? annualRate : isFullLock ? 10 : 7)
  const adminFeeRatePct = preview?.admin_fee_rate_pct ?? (isRentProtec ? 1.5 : 0)
  const scorePenaltyPoints = preview?.score_penalty_points ?? (isFlexible ? 0 : 30)

  const principalNaira = (preview?.original_principal_kobo ?? principalKobo) / 100
  const accruedYieldNaira = (preview?.accrued_yield_kobo ?? accruedYieldKobo) / 100
  const recalculatedYieldNaira = (preview?.recalculated_base_yield_kobo ?? (isFlexible ? accruedYieldKobo : 0)) / 100
  const adminFeeNaira = (preview?.admin_fee_kobo ?? 0) / 100
  const advanceDeductionNaira = (preview?.advance_deduction_kobo ?? 0) / 100
  const premiumRecoveryNaira = (preview?.premium_recovery_deduction_kobo ?? 0) / 100
  const netPayoutNaira =
    preview !== undefined
      ? preview.net_payout_kobo / 100
      : Math.max(0, principalNaira + recalculatedYieldNaira - adminFeeNaira)

  const payoutDestination = breakoutResult?.payout_destination ?? preview?.payout_destination ?? null

  const handleExecuteBreakout = async () => {
    try {
      const res = await breakoutMutation.mutateAsync(vaultId)
      setBreakoutResult(res)
      toastSuccess(
        isFlexible
          ? 'Withdrawal executed! Funds sent to your verified account.'
          : 'Early withdrawal executed. Funds liquidated.',
      )
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to execute early withdrawal')
    }
  }

  const handleDone = () => {
    onCompleted?.()
    onClose()
  }

  return createPortal(
    <div className="vault-modal-overlay" onClick={breakoutResult ? handleDone : onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color={isFlexible ? 'var(--clay)' : 'var(--warning)'} />
            <span className="vault-modal-title">
              {isFlexible ? 'Withdraw Flexible Savings' : 'Withdraw Early Before Rent Day'}
            </span>
          </div>
          <button
            type="button"
            className="vault-modal-close"
            onClick={breakoutResult ? handleDone : onClose}
          >
            <X size={20} />
          </button>
        </div>

        {breakoutResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: isFlexible ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                color: isFlexible ? '#059669' : 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {isFlexible ? 'Withdrawal Successful' : 'Early Withdrawal Successful'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {breakoutResult.breakout_reference}
              </p>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Your Savings Returned</span>
                <span>{formatCurrency(breakoutResult.original_principal_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>
                  {isFlexible
                    ? `Interest Kept (${breakoutResult.recalculation_rate_pct ?? annualRate}%)`
                    : `Recalculated Interest (${breakoutResult.recalculation_rate_pct ?? recalcRatePct}% p.a.)`}
                </span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatCurrency(breakoutResult.recalculated_base_yield_kobo / 100, 'NGN')}
                </span>
              </div>
              {breakoutResult.admin_fee_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>
                    Early Withdrawal Fee ({breakoutResult.admin_fee_rate_pct ?? adminFeeRatePct}%)
                  </span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatCurrency(breakoutResult.admin_fee_kobo / 100, 'NGN')}
                  </span>
                </div>
              )}
              {breakoutResult.advance_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Emergency Cash Deducted</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatCurrency(breakoutResult.advance_deduction_kobo / 100, 'NGN')}
                  </span>
                </div>
              )}
              {(breakoutResult.premium_recovery_deduction_kobo ?? 0) > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Unrecovered Rent Protec Premium</span>
                  <span style={{ color: 'var(--error)' }}>
                    -
                    {formatCurrency(
                      (breakoutResult.premium_recovery_deduction_kobo ?? 0) / 100,
                      'NGN',
                    )}
                  </span>
                </div>
              )}
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>
                  {payoutDestination ? `Sent to ${payoutDestination.bank_name}` : 'Total Payout'}
                </span>
                <span>{formatCurrency(breakoutResult.net_payout_kobo / 100, 'NGN')}</span>
              </div>
            </div>

            <button type="button" className="vault-btn-primary" onClick={handleDone}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isFlexible
                ? `Your Flexible Save & Earn plan lets you withdraw anytime with ₦0 exit fee and 100% of your accrued ${annualRate}% p.a. interest intact.`
                : isFullLock
                  ? `Withdrawing before 30 days to rent day adjusts your ${annualRate}% p.a. Full Lock rate to ${recalcRatePct}% p.a. compounded per deposit from each deposit date, with ₦0 admin fee.`
                  : `Withdrawing from Rent Protec before rent day adjusts your returns to ${recalcRatePct}% p.a. compounded per deposit, applies a ${adminFeeRatePct}% admin fee, and offsets any unrecovered insurance premium.`}
            </p>

            {previewQuery.isLoading ? (
              <div
                className="vault-fee-breakdown animate-pulse"
                style={{ minHeight: 132, opacity: 0.7 }}
              >
                <div className="vault-fee-breakdown__row">
                  <span>Calculating exact per-deposit payout...</span>
                  <span>—</span>
                </div>
              </div>
            ) : previewQuery.isError ? (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '12px 14px',
                  fontSize: '0.8125rem',
                  color: 'var(--error)',
                }}
              >
                Unable to load exact withdrawal quote right now. Please try again.
              </div>
            ) : (
              <>
                <div className="vault-fee-breakdown">
                  <div className="vault-fee-breakdown__row">
                    <span>Amount Deposited</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(principalNaira, 'NGN')}</span>
                  </div>
                  {!isFlexible && (
                    <div className="vault-fee-breakdown__row">
                      <span>Accrued Plan Interest ({annualRate}% p.a.)</span>
                      <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {formatCurrency(accruedYieldNaira, 'NGN')}
                      </span>
                    </div>
                  )}
                  <div className="vault-fee-breakdown__row">
                    <span>
                      {isFlexible
                        ? `Interest Earned (${annualRate}% p.a.)`
                        : `Recalculated Interest (${recalcRatePct}% p.a.)`}
                    </span>
                    <span style={{ color: 'var(--success)' }}>
                      +{formatCurrency(recalculatedYieldNaira, 'NGN')}
                    </span>
                  </div>
                  <div className="vault-fee-breakdown__row">
                    <span>
                      {adminFeeRatePct > 0
                        ? `Early Withdrawal Fee (${adminFeeRatePct}%)`
                        : 'Withdrawal Fee'}
                    </span>
                    <span style={{ color: adminFeeNaira > 0 ? 'var(--error)' : 'var(--success)' }}>
                      {adminFeeNaira > 0 ? `-${formatCurrency(adminFeeNaira, 'NGN')}` : '₦0'}
                    </span>
                  </div>
                  {advanceDeductionNaira > 0 && (
                    <div className="vault-fee-breakdown__row">
                      <span>Emergency Advance Offset</span>
                      <span style={{ color: 'var(--error)' }}>
                        -{formatCurrency(advanceDeductionNaira, 'NGN')}
                      </span>
                    </div>
                  )}
                  {premiumRecoveryNaira > 0 && (
                    <div className="vault-fee-breakdown__row">
                      <span>Unrecovered Rent Protec Premium</span>
                      <span style={{ color: 'var(--error)' }}>
                        -{formatCurrency(premiumRecoveryNaira, 'NGN')}
                      </span>
                    </div>
                  )}
                  <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                    <span>Exact Amount You Receive</span>
                    <span>{formatCurrency(netPayoutNaira, 'NGN')}</span>
                  </div>
                </div>

                {payoutDestination && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md, 10px)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Landmark size={16} color="var(--clay)" style={{ flexShrink: 0 }} />
                    <span>
                      Payout to <strong>{payoutDestination.bank_name}</strong> (••••
                      {payoutDestination.account_number.slice(-4)})
                    </span>
                  </div>
                )}
              </>
            )}

            {!isFlexible && scorePenaltyPoints > 0 && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '12px 14px',
                  fontSize: '0.8125rem',
                  color: 'var(--error)',
                  lineHeight: 1.4,
                }}
              >
                <strong>Discipline Impact:</strong> Early breakout deducts {scorePenaltyPoints}{' '}
                points from your Upward Savings Discipline Score and resets your streak.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <button type="button" className="vault-btn-primary" onClick={onClose}>
                <Shield size={18} />
                <span>Keep Saving</span>
              </button>

              {!confirmStep ? (
                <button
                  type="button"
                  className={isFlexible ? 'vault-btn-secondary' : 'vault-btn-destructive'}
                  disabled={previewQuery.isLoading || previewQuery.isError}
                  onClick={() => setConfirmStep(true)}
                >
                  {isFlexible ? 'Withdraw Savings (₦0 Fee)' : 'I Understand, Withdraw Early'}
                </button>
              ) : (
                <button
                  type="button"
                  className={isFlexible ? 'vault-btn-primary' : 'vault-btn-destructive'}
                  style={isFlexible ? undefined : { background: 'var(--error)', color: '#ffffff' }}
                  disabled={breakoutMutation.isPending || previewQuery.isLoading}
                  onClick={handleExecuteBreakout}
                >
                  {breakoutMutation.isPending
                    ? 'Processing Withdrawal...'
                    : isFlexible
                      ? 'Confirm Withdrawal'
                      : 'Confirm Early Withdrawal'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
