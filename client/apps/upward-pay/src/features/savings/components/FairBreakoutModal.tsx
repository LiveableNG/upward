'use client'

import React, { useState } from 'react'
import { X, Shield, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBreakoutRentVault } from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'

interface FairBreakoutModalProps {
  vaultId: string
  principalKobo: number
  accruedYieldKobo: number
  onClose: () => void
}

export function FairBreakoutModal({
  vaultId,
  principalKobo,
  accruedYieldKobo,
  onClose,
}: FairBreakoutModalProps) {
  const [breakoutResult, setBreakoutResult] = useState<any | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  const { error: toastError, success: toastSuccess } = useToast()
  const breakoutMutation = useBreakoutRentVault()

  // Estimated preview figures
  // 7% p.a. base yield vs 1.5% admin fee
  const principalNaira = principalKobo / 100
  const accruedYieldNaira = accruedYieldKobo / 100
  const estimatedAdminFeeNaira = principalNaira * 0.015
  const estimatedRecalculatedYieldNaira = principalNaira * (0.07 / 365) * 30 // indicative
  const estimatedNetPayoutNaira = Math.max(
    0,
    principalNaira + estimatedRecalculatedYieldNaira - estimatedAdminFeeNaira,
  )

  const handleExecuteBreakout = async () => {
    try {
      const res = await breakoutMutation.mutateAsync(vaultId)
      setBreakoutResult(res.data)
      toastSuccess('Vault breakout executed. Funds liquidated.')
    } catch (err: any) {
      toastError(err?.message || 'Failed to execute vault breakout')
    }
  }

  return (
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color="var(--warning)" />
            <span className="vault-modal-title">Fair Exit & Recalculation</span>
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
                Vault Liquidated
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {breakoutResult.breakout_reference}
              </p>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Principal Returned</span>
                <span>{formatCurrency(breakoutResult.original_principal_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Recalculated Base Yield (7.0%)</span>
                <span>
                  +{formatCurrency(breakoutResult.recalculated_base_yield_kobo / 100, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Early Exit Admin Fee (1.5%)</span>
                <span style={{ color: 'var(--error)' }}>
                  -{formatCurrency(breakoutResult.admin_fee_kobo / 100, 'NGN')}
                </span>
              </div>
              {breakoutResult.advance_deduction_kobo > 0 && (
                <div className="vault-fee-breakdown__row">
                  <span>Advance Offset Deduction</span>
                  <span style={{ color: 'var(--error)' }}>
                    -{formatCurrency(breakoutResult.advance_deduction_kobo / 100, 'NGN')}
                  </span>
                </div>
              )}
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Net Payout to Wallet</span>
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
              Upward is built to protect your roof. If you choose to break your maturity lock early,
              we do not confiscate your principal, but premium 14.5% p.a. returns will be forfeited.
            </p>

            {/* Recalculation Breakdown Card */}
            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Current Principal</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(principalNaira, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Forfeited Compound Yield (14.5%)</span>
                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  {formatCurrency(accruedYieldNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Fair Recalculation Yield (7.0% p.a.)</span>
                <span style={{ color: 'var(--success)' }}>
                  +{formatCurrency(estimatedRecalculatedYieldNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Administrative Liquidation Fee (1.5%)</span>
                <span style={{ color: 'var(--error)' }}>
                  -{formatCurrency(estimatedAdminFeeNaira, 'NGN')}
                </span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Estimated Net Payout</span>
                <span>{formatCurrency(estimatedNetPayoutNaira, 'NGN')}</span>
              </div>
            </div>

            {/* Upward Score Deterrent Warning */}
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

            {/* Action Buttons: Primary is Keep Rent Safe */}
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
    </div>
  )
}
