'use client'

import React, { useState } from 'react'
import {
  Lock,
  TrendingUp,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ArrowDownToLine,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { EmergencyAdvanceModal } from './EmergencyAdvanceModal'
import { FairBreakoutModal } from './FairBreakoutModal'
import { FundVaultModal } from './FundVaultModal'

interface VaultDashboardViewProps {
  vault: {
    vault_id: string
    lock_status: string
    current_balance_kobo: number
    principal_kobo: number
    accrued_yield_kobo: number
    daily_yield_rate: number
    days_to_unlock: number
    days_remaining: number
    target_amount_kobo: number
    target_completion_percentage: number
    contractual_due_date: string
    unlock_date: string
    dedicated_account?: {
      bank_name: string
      account_number: string
      account_name: string
      assignment_status: string
    } | null
    emergency_advance: {
      has_active_loan: boolean
      max_borrowable_kobo: number
      active_loan_details?: Record<string, unknown> | null
    }
    savings_score: {
      total_score: number
      cadence_points: number
      velocity_points: number
      loan_discipline_points: number
    }
  }
  onGoToSettlementHub?: () => void
}

export function VaultDashboardView({ vault, onGoToSettlementHub }: VaultDashboardViewProps) {
  const [showFundModal, setShowFundModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showBreakoutModal, setShowBreakoutModal] = useState(false)

  const { user } = useAuth()
  const [nowTimestamp] = useState(() => Date.now())
  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  const currentBalanceNaira = vault.current_balance_kobo / 100
  const targetAmountNaira = activeProperty?.rentAmount || vault.target_amount_kobo / 100
  const targetDueDate = activeProperty?.rentEndDate || vault.contractual_due_date
  const daysRemaining = targetDueDate
    ? Math.max(
        0,
        Math.ceil((new Date(targetDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)),
      )
    : vault.days_remaining

  const accruedYieldNaira = vault.accrued_yield_kobo / 100
  const dailyRate = vault.daily_yield_rate || 0.145 / 365
  const estimatedDailyAddNaira = currentBalanceNaira * dailyRate

  const targetCompletionPercentage =
    targetAmountNaira > 0
      ? Math.min(100, Math.round((currentBalanceNaira / targetAmountNaira) * 1000) / 10)
      : vault.target_completion_percentage

  const isSettlementReady = vault.days_to_unlock <= 0 || vault.lock_status === 'SETTLEMENT_READY'

  return (
    <div className="rent-savings">
      <div className="vault-dashboard__hero">
        <div className="vault-dashboard__top-row">
          <div className="vault-dashboard__lock-pill">
            <Lock size={13} color="var(--clay)" />
            <span>{isSettlementReady ? 'Ready to Pay Rent' : 'Rent Locked'}</span>
          </div>
          <span className="vault-dashboard__countdown-pill">{daysRemaining} Days to Rent Day</span>
        </div>

        <div className="vault-dashboard__amounts">
          <span className="vault-dashboard__target-label">
            Target: {formatCurrency(targetAmountNaira, 'NGN')} due on{' '}
            {targetDueDate
              ? new Date(targetDueDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Rent Day'}
          </span>
          <span className="vault-dashboard__current-balance">
            {formatCurrency(currentBalanceNaira, 'NGN')}
          </span>
        </div>

        <div className="vault-dashboard__gauge-wrapper">
          <div className="vault-dashboard__gauge-header">
            <span>Target Progress</span>
            <span style={{ fontWeight: 700 }}>{targetCompletionPercentage}%</span>
          </div>
          <div className="vault-dashboard__progress-bar">
            <div
              className="vault-dashboard__progress-fill"
              style={{ width: `${Math.min(100, targetCompletionPercentage)}%` }}
            />
          </div>
        </div>

        <div className="vault-dashboard__interest-card">
          <div className="vault-dashboard__interest-text">
            <TrendingUp size={16} />
            <span>+{formatCurrency(accruedYieldNaira, 'NGN')} Total Profit</span>
          </div>
          <span className="vault-dashboard__interest-rate">
            Earning ~{formatCurrency(estimatedDailyAddNaira, 'NGN')} / day (14.5% p.a.)
          </span>
        </div>

        <button
          type="button"
          className="vault-btn-primary"
          onClick={() => setShowFundModal(true)}
          style={{
            background: 'var(--clay)',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(200, 107, 73, 0.35)',
            marginTop: 4,
          }}
        >
          <PlusCircle size={18} />
          <span>Fund Vault</span>
        </button>

        {isSettlementReady && (
          <button
            type="button"
            className="vault-btn-primary"
            style={{ background: '#2563eb' }}
            onClick={onGoToSettlementHub}
          >
            <span>Proceed to Settlement & Claim Cashback</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      <div className="vault-score-card">
        <div className="vault-score-card__header">
          <div className="vault-score-card__title">
            <ShieldCheck size={20} color="var(--clay)" />
            <span>Upward Savings Discipline</span>
          </div>
          <span className="vault-score-card__points-pill">
            {vault.savings_score.total_score} / 100 Points
          </span>
        </div>

        <div className="vault-score-card__metrics">
          <div>
            <div className="vault-score-card__metric-val">
              {vault.savings_score.cadence_points} / 40
            </div>
            <div className="vault-score-card__metric-label">Cadence (On-time)</div>
          </div>
          <div>
            <div className="vault-score-card__metric-val">
              {vault.savings_score.velocity_points} / 40
            </div>
            <div className="vault-score-card__metric-label">Milestone Target</div>
          </div>
          <div>
            <div className="vault-score-card__metric-val">
              {vault.savings_score.loan_discipline_points} / 20
            </div>
            <div className="vault-score-card__metric-label">Loan Discipline</div>
          </div>
        </div>
      </div>

      <div className="vault-actions-grid">
        <div className="vault-action-btn" onClick={() => setShowFundModal(true)}>
          <div className="vault-action-btn__icon">
            <ArrowDownToLine size={18} />
          </div>
          <span className="vault-action-btn__title">Fund Vault</span>
          <span className="vault-action-btn__subtitle">
            {vault.dedicated_account
              ? `${vault.dedicated_account.bank_name} • ${vault.dedicated_account.account_number}`
              : 'Direct bank transfer'}
          </span>
        </div>

        <div className="vault-action-btn" onClick={() => setShowAdvanceModal(true)}>
          <div className="vault-action-btn__icon">
            <Sparkles size={18} />
          </div>
          <span className="vault-action-btn__title">Borrow Emergency Cash</span>
          <span className="vault-action-btn__subtitle">
            {vault.emergency_advance.has_active_loan
              ? 'Active advance in progress'
              : `Up to ${formatCurrency(vault.emergency_advance.max_borrowable_kobo / 100, 'NGN')} (40%)`}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setShowBreakoutModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Need funds early? Review Fair Exit & Breakout Policy
        </button>
      </div>

      <FundVaultModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        dedicatedAccount={vault.dedicated_account}
      />

      {showAdvanceModal && (
        <EmergencyAdvanceModal
          vaultId={vault.vault_id}
          currentBalanceKobo={vault.current_balance_kobo}
          maxBorrowableKobo={vault.emergency_advance.max_borrowable_kobo}
          hasActiveLoan={vault.emergency_advance.has_active_loan}
          onClose={() => setShowAdvanceModal(false)}
        />
      )}

      {showBreakoutModal && (
        <FairBreakoutModal
          vaultId={vault.vault_id}
          principalKobo={vault.principal_kobo}
          accruedYieldKobo={vault.accrued_yield_kobo}
          onClose={() => setShowBreakoutModal(false)}
        />
      )}
    </div>
  )
}
