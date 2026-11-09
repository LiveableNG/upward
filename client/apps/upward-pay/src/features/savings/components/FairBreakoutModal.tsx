'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, X, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBreakoutRentVault } from '../hooks/useRentSavings'
import type { BreakoutResultData } from '../services/savingsService'
import { useToast } from '@/components/common/Toast'

interface FairBreakoutModalProps {
  vaultId: string
  principalKobo: number
  accruedYieldKobo: number
  onClose: () => void
}

const emptySubscribe = () => () => {}

export function FairBreakoutModal({
  vaultId,
  principalKobo,
  accruedYieldKobo,
  onClose,
}: FairBreakoutModalProps) {
  const [breakoutResult, setBreakoutResult] = useState<BreakoutResultData | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const { error: toastError, success: toastSuccess } = useToast()
  const breakoutMutation = useBreakoutRentVault()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!isClient || typeof document === 'undefined') return null

  const principalNaira = principalKobo / 100
  const accruedYieldNaira = accruedYieldKobo / 100
  const estimatedAdminFeeNaira = principalNaira * 0.015
  const estimatedRecalculatedYieldNaira = principalNaira * (0.07 / 365) * 30
  const estimatedNetPayoutNaira = Math.max(
    0,
    principalNaira + estimatedRecalculatedYieldNaira - estimatedAdminFeeNaira,
  )

  const handleExecuteBreakout = async () => {
    try {
      const res = await breakoutMutation.mutateAsync(vaultId)
      setBreakoutResult(res)
      toastSuccess('Vault breakout executed. Funds liquidated.')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to execute vault breakout')
    }
  }

  return createPortal(
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color="var(--warning)" />
            <span className="vault-modal-title">Withdraw Early Before Rent Day</span>
          </div>
          <button type="button" className="vault-modal-close" onClick={onClose}>
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
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)',
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
                Early Withdrawal Successful
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
                <span>Base Interest Kept (7.0%)</span>
                <span>
                  +{formatCurrency(breakoutResult.recalculated_base_yield_kobo / 100, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Early Withdrawal Fee (1.5%)</span>
                <span style={{ color: 'var(--error)' }}>
                  -{formatCurrency(breakoutResult.admin_fee_kobo / 100, 'NGN')}
                </span>
              </div>
              {breakoutResult.advance_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Emergency Cash Deducted</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatCurrency(breakoutResult.advance_deduction_kobo / 100, 'NGN')}
                  </span>
                </div>
              )}
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Sent to Your Wallet</span>
                <span>{formatCurrency(breakoutResult.net_payout_kobo / 100, 'NGN')}</span>
              </div>
            </div>

            <button type="button" className="vault-btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Upward is built to protect your roof. If you need to withdraw your savings before rent
              day, your money is completely safe, but the 14.5% annual bonus returns will be
              adjusted to the 7% base rate.
            </p>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Your Total Savings</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(principalNaira, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Forfeited Bonus Interest (14.5%)</span>
                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  {formatCurrency(accruedYieldNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Base Interest Kept (7.0%)</span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatCurrency(estimatedRecalculatedYieldNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Early Withdrawal Fee (1.5%)</span>
                <span style={{ color: 'var(--error)' }}>
                  -{formatCurrency(estimatedAdminFeeNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Estimated Amount You Receive</span>
                <span>{formatCurrency(estimatedNetPayoutNaira, 'NGN')}</span>
              </div>
            </div>

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
              <strong>Discipline Impact:</strong> Early breakout deducts 30 points from your Upward
              Savings Discipline Score and resets your streak.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <button type="button" className="vault-btn-primary" onClick={onClose}>
                <Shield size={18} />
                <span>Keep My Rent Safe</span>
              </button>

              {!confirmStep ? (
                <button
                  type="button"
                  className="vault-btn-destructive"
                  onClick={() => setConfirmStep(true)}
                >
                  I Understand, Liquidate Early
                </button>
              ) : (
                <button
                  type="button"
                  className="vault-btn-destructive"
                  style={{ background: 'var(--error)', color: '#ffffff' }}
                  disabled={breakoutMutation.isPending}
                  onClick={handleExecuteBreakout}
                >
                  {breakoutMutation.isPending
                    ? 'Liquidating Vault...'
                    : 'Confirm Breakout & Forfeit Yield'}
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
