'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, X, Shield, Landmark, Clock } from 'lucide-react'
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

function formatExactNaira(kobo: number): string {
  const naira = kobo / 100
  const hasKobo = Math.round(Math.abs(kobo)) % 100 !== 0
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: hasKobo ? 2 : 0,
  })}`
}

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

  const principalKoboDisplay = preview?.original_principal_kobo ?? principalKobo
  const accruedYieldKoboDisplay = preview?.accrued_yield_kobo ?? accruedYieldKobo
  const recalculatedYieldKoboDisplay =
    preview?.recalculated_base_yield_kobo ?? (isFlexible ? accruedYieldKobo : 0)
  const adminFeeKoboDisplay = preview?.admin_fee_kobo ?? 0
  const advanceDeductionKoboDisplay = preview?.advance_deduction_kobo ?? 0
  const premiumRecoveryKoboDisplay = preview?.premium_recovery_deduction_kobo ?? 0
  const netPayoutKoboDisplay =
    preview !== undefined
      ? preview.net_payout_kobo
      : Math.max(0, principalKoboDisplay + recalculatedYieldKoboDisplay - adminFeeKoboDisplay)

  const payoutDestination = breakoutResult?.payout_destination ?? preview?.payout_destination ?? null
  const isProcessingRedemption = breakoutResult?.payout_status === 'PROCESSING_REDEMPTION'

  const handleExecuteBreakout = async () => {
    try {
      const res = await breakoutMutation.mutateAsync(vaultId)
      setBreakoutResult(res)
      toastSuccess(
        res.payout_status === 'PROCESSING_REDEMPTION'
          ? 'Withdrawal submitted! Your funds are being redeemed to your bank account.'
          : 'Withdrawal completed! Your funds have been sent to your bank account.',
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
            {breakoutResult ? (
              <CheckCircle2 size={20} color="#059669" />
            ) : (
              <AlertTriangle size={20} color={isFlexible ? 'var(--clay)' : 'var(--warning)'} />
            )}
            <span className="vault-modal-title">
              {breakoutResult
                ? 'Withdrawal Receipt'
                : isFlexible
                  ? 'Withdraw Flexible Savings'
                  : 'Withdraw Early Before Rent Day'}
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
                background: 'rgba(5, 150, 105, 0.12)',
                color: '#059669',
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
                {isProcessingRedemption ? 'Withdrawal Submitted' : 'Withdrawal Successful'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {breakoutResult.breakout_reference}
              </p>
            </div>

            {isProcessingRedemption && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'var(--clay-faint)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                  lineHeight: 1.4,
                }}
              >
                <Clock size={16} color="var(--clay)" style={{ flexShrink: 0 }} />
                <span>
                  ARM Money Market Fund redemption queued. Funds settle to your verified bank
                  account within 24 hours.
                </span>
              </div>
            )}

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Your Savings Returned</span>
                <span>{formatExactNaira(breakoutResult.original_principal_kobo)}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>
                  {isFlexible
                    ? `Interest Kept (${breakoutResult.recalculation_rate_pct ?? annualRate}%)`
                    : `Recalculated Interest (${breakoutResult.recalculation_rate_pct ?? recalcRatePct}% p.a.)`}
                </span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatExactNaira(breakoutResult.recalculated_base_yield_kobo)}
                </span>
              </div>
              {breakoutResult.admin_fee_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>
                    Early Withdrawal Fee ({breakoutResult.admin_fee_rate_pct ?? adminFeeRatePct}%)
                  </span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatExactNaira(breakoutResult.admin_fee_kobo)}
                  </span>
                </div>
              )}
              {breakoutResult.advance_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Emergency Cash Deducted</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatExactNaira(breakoutResult.advance_deduction_kobo)}
                  </span>
                </div>
              )}
              {(breakoutResult.premium_recovery_deduction_kobo ?? 0) > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Unrecovered Rent Protec Premium</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatExactNaira(breakoutResult.premium_recovery_deduction_kobo ?? 0)}
                  </span>
                </div>
              )}
              {payoutDestination && (
                <div className="vault-fee-breakdown__row">
                  <span>Destination</span>
                  <span style={{ fontWeight: 600 }}>
                    {payoutDestination.bank_name} ••••{payoutDestination.account_number.slice(-4)}
                  </span>
                </div>
              )}
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Payout</span>
                <span>{formatExactNaira(breakoutResult.net_payout_kobo)}</span>
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
                ? `Withdrawing closes this savings plan and returns 100% of your principal and accrued ${annualRate}% p.a. interest with ₦0 exit fee.`
                : isFullLock
                  ? `Withdrawing before 30 days to rent day closes this plan and adjusts your ${annualRate}% p.a. Full Lock rate to ${recalcRatePct}% p.a. compounded per deposit from each deposit date, with ₦0 admin fee.`
                  : `Withdrawing from Rent Protec before rent day closes this plan, adjusts returns to ${recalcRatePct}% p.a. compounded per deposit, applies a ${adminFeeRatePct}% admin fee, and offsets any unrecovered insurance premium.`}
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
                    <span style={{ fontWeight: 600 }}>
                      {formatExactNaira(principalKoboDisplay)}
                    </span>
                  </div>
                  {!isFlexible && (
                    <div className="vault-fee-breakdown__row">
                      <span>Accrued Plan Interest ({annualRate}% p.a.)</span>
                      <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {formatExactNaira(accruedYieldKoboDisplay)}
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
                      +{formatExactNaira(recalculatedYieldKoboDisplay)}
                    </span>
                  </div>
                  <div className="vault-fee-breakdown__row">
                    <span>
                      {adminFeeRatePct > 0
                        ? `Early Withdrawal Fee (${adminFeeRatePct}%)`
                        : 'Withdrawal Fee'}
                    </span>
                    <span
                      style={{
                        color: adminFeeKoboDisplay > 0 ? 'var(--error)' : 'var(--success)',
                      }}
                    >
                      {adminFeeKoboDisplay > 0 ? `-${formatExactNaira(adminFeeKoboDisplay)}` : '₦0'}
                    </span>
                  </div>
                  {advanceDeductionKoboDisplay > 0 && (
                    <div className="vault-fee-breakdown__row">
                      <span>Emergency Advance Offset</span>
                      <span style={{ color: 'var(--error)' }}>
                        -{formatExactNaira(advanceDeductionKoboDisplay)}
                      </span>
                    </div>
                  )}
                  {premiumRecoveryKoboDisplay > 0 && (
                    <div className="vault-fee-breakdown__row">
                      <span>Unrecovered Rent Protec Premium</span>
                      <span style={{ color: 'var(--error)' }}>
                        -{formatExactNaira(premiumRecoveryKoboDisplay)}
                      </span>
                    </div>
                  )}
                  <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                    <span>Exact Amount You Receive</span>
                    <span>{formatExactNaira(netPayoutKoboDisplay)}</span>
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
                      lineHeight: 1.4,
                    }}
                  >
                    <Landmark size={17} color="var(--clay)" style={{ flexShrink: 0 }} />
                    <div>
                      {payoutDestination.account_name && (
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                          {payoutDestination.account_name}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {payoutDestination.bank_name} · ••••
                        {payoutDestination.account_number.slice(-4)}
                      </div>
                    </div>
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
