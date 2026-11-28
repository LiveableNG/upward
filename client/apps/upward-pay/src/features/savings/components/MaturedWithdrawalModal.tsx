'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Landmark, X, Award, ArrowRight, Clock } from 'lucide-react'
import {
  useSavingsOnboardingPrefill,
  useWithdrawMaturedRentVault,
} from '../hooks/useRentSavings'
import type { MaturedWithdrawalResultData } from '../services/savingsService'
import { useToast } from '@/components/common/Toast'

interface MaturedWithdrawalModalProps {
  vaultId: string
  principalKobo: number
  accruedYieldKobo: number
  onClose: () => void
  onCompleted?: () => void
  onRestartVault?: () => void
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

export function MaturedWithdrawalModal({
  vaultId,
  principalKobo,
  accruedYieldKobo,
  onClose,
  onCompleted,
  onRestartVault,
}: MaturedWithdrawalModalProps) {
  const [result, setResult] = useState<MaturedWithdrawalResultData | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const { error: toastError, success: toastSuccess } = useToast()
  const { data: prefill, isLoading: prefillLoading } = useSavingsOnboardingPrefill(true)
  const withdrawMutation = useWithdrawMaturedRentVault()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!isClient || typeof document === 'undefined') return null

  const totalBalanceKobo = principalKobo + accruedYieldKobo
  const settlementBank = prefill?.settlement_bank ?? null
  const isProcessingRedemption = result?.payout_status === 'PROCESSING_REDEMPTION'

  const handleConfirmWithdraw = async () => {
    try {
      const res = await withdrawMutation.mutateAsync({ vaultId })
      setResult(res)
      toastSuccess(
        res.payout_status === 'PROCESSING_REDEMPTION'
          ? `Withdrawal of ${formatExactNaira(res.net_payout_kobo)} submitted to ${res.destination_bank_name}.`
          : `Sent ${formatExactNaira(res.net_payout_kobo)} to your ${res.destination_bank_name} account.`,
      )
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Could not complete matured withdrawal.')
    }
  }

  const handleFinish = () => {
    onClose()
    if (onCompleted) {
      onCompleted()
    } else if (onRestartVault) {
      onRestartVault()
    }
  }

  return createPortal(
    <div className="vault-modal-overlay" onClick={result ? handleFinish : onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={20} color="var(--clay)" />
            <span className="vault-modal-title">Withdraw Matured Savings</span>
          </div>
          <button
            type="button"
            className="vault-modal-close"
            onClick={result ? handleFinish : onClose}
          >
            <X size={20} />
          </button>
        </div>

        {result ? (
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
                {isProcessingRedemption ? 'Withdrawal Submitted' : 'Funds Sent to Your Bank'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {result.withdrawal_reference}
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
                <span>Principal Returned</span>
                <span>{formatExactNaira(result.principal_kobo)}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>100% Interest Earned</span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatExactNaira(result.accrued_yield_kobo)}
                </span>
              </div>
              {result.advance_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Emergency Advance Offset</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatExactNaira(result.advance_deduction_kobo)}
                  </span>
                </div>
              )}
              {result.premium_recovery_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Unrecovered Rent Protec Premium</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatExactNaira(result.premium_recovery_deduction_kobo)}
                  </span>
                </div>
              )}
              <div className="vault-fee-breakdown__row">
                <span>Destination</span>
                <span style={{ fontWeight: 600 }}>
                  {result.destination_bank_name} ••••{result.destination_account_number.slice(-4)}
                </span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Payout</span>
                <span>{formatExactNaira(result.net_payout_kobo)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onRestartVault && (
                <button
                  type="button"
                  className="vault-btn-primary"
                  onClick={() => {
                    onClose()
                    onRestartVault()
                  }}
                >
                  <span>Start Next Rent Savings Plan</span>
                  <ArrowRight size={16} />
                </button>
              )}
              <button
                type="button"
                className={onRestartVault ? 'vault-btn-secondary' : 'vault-btn-primary'}
                onClick={handleFinish}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your rent savings have reached maturity. You can withdraw 100% of your principal and
              interest to your verified bank account with ₦0 withdrawal fee.
            </p>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Principal Saved</span>
                <span style={{ fontWeight: 600 }}>{formatExactNaira(principalKobo)}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Accrued Interest (100% kept)</span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatExactNaira(accruedYieldKobo)}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Withdrawal Fee</span>
                <span style={{ color: 'var(--success)' }}>₦0</span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Payout</span>
                <span>{formatExactNaira(totalBalanceKobo)}</span>
              </div>
            </div>

            {prefillLoading ? (
              <div
                className="animate-pulse"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                }}
              >
                Loading your verified bank account...
              </div>
            ) : settlementBank ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Landmark size={18} color="var(--clay)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                    {settlementBank.account_name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {settlementBank.bank_name} · ••••{settlementBank.account_number.slice(-4)}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.8125rem',
                  color: 'var(--error)',
                }}
              >
                No verified personal bank account found. Complete investor KYC bank verification to
                withdraw to your bank.
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--clay-faint)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              <Award size={15} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Note: Landlord rent cashback only applies when you pay your landlord directly
                through Upward.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {!confirmStep ? (
                <button
                  type="button"
                  className="vault-btn-primary"
                  disabled={!settlementBank || totalBalanceKobo <= 0}
                  onClick={() => setConfirmStep(true)}
                >
                  Withdraw {formatExactNaira(totalBalanceKobo)} to My Bank
                </button>
              ) : (
                <button
                  type="button"
                  className="vault-btn-primary"
                  disabled={withdrawMutation.isPending}
                  onClick={handleConfirmWithdraw}
                >
                  {withdrawMutation.isPending
                    ? 'Submitting Withdrawal...'
                    : `Confirm Payout to ${settlementBank?.bank_name || 'My Bank'}`}
                </button>
              )}

              <button type="button" className="vault-btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
