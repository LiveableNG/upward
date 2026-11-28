'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Landmark, X, Award, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
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
  onRestartVault?: () => void
}

const emptySubscribe = () => () => {}

export function MaturedWithdrawalModal({
  vaultId,
  principalKobo,
  accruedYieldKobo,
  onClose,
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

  const principalNaira = principalKobo / 100
  const accruedYieldNaira = accruedYieldKobo / 100
  const totalBalanceNaira = (principalKobo + accruedYieldKobo) / 100
  const settlementBank = prefill?.settlement_bank ?? null

  const handleConfirmWithdraw = async () => {
    try {
      const res = await withdrawMutation.mutateAsync({ vaultId })
      setResult(res)
      toastSuccess(
        `Sent ${formatCurrency(res.net_payout_kobo / 100, 'NGN')} to your ${res.destination_bank_name} account.`,
      )
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Could not complete matured withdrawal.')
    }
  }

  return createPortal(
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={20} color="var(--clay)" />
            <span className="vault-modal-title">Withdraw Matured Savings</span>
          </div>
          <button type="button" className="vault-modal-close" onClick={onClose}>
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
                Funds Sent to Your Bank
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {result.withdrawal_reference}
              </p>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Principal Returned</span>
                <span>{formatCurrency(result.principal_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>100% Interest Earned</span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatCurrency(result.accrued_yield_kobo / 100, 'NGN')}
                </span>
              </div>
              {result.advance_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Emergency Advance Offset</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatCurrency(result.advance_deduction_kobo / 100, 'NGN')}
                  </span>
                </div>
              )}
              {result.premium_recovery_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Unrecovered Rent Protec Premium</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatCurrency(result.premium_recovery_deduction_kobo / 100, 'NGN')}
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
                <span>Total Disbursed</span>
                <span>{formatCurrency(result.net_payout_kobo / 100, 'NGN')}</span>
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
                onClick={onClose}
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
                <span style={{ fontWeight: 600 }}>{formatCurrency(principalNaira, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Accrued Interest (100% kept)</span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatCurrency(accruedYieldNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Withdrawal Fee</span>
                <span style={{ color: 'var(--success)' }}>₦0</span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Payout</span>
                <span>{formatCurrency(totalBalanceNaira, 'NGN')}</span>
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
                    {settlementBank.bank_name} · {settlementBank.account_number}
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
                  disabled={!settlementBank || totalBalanceNaira <= 0}
                  onClick={() => setConfirmStep(true)}
                >
                  Withdraw {formatCurrency(totalBalanceNaira, 'NGN')} to My Bank
                </button>
              ) : (
                <button
                  type="button"
                  className="vault-btn-primary"
                  disabled={withdrawMutation.isPending}
                  onClick={handleConfirmWithdraw}
                >
                  {withdrawMutation.isPending
                    ? 'Sending to Your Bank...'
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
