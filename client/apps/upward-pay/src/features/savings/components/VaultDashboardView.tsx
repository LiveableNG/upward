'use client'

import React, { useState } from 'react'
import {
  Lock,
  Calendar,
  TrendingUp,
  PlusCircle,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ArrowDownToLine,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
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
      active_loan_details?: any
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
  const [copiedDva, setCopiedDva] = useState(false)

  const { success: toastSuccess } = useToast()

  const currentBalanceNaira = vault.current_balance_kobo / 100
  const targetAmountNaira = vault.target_amount_kobo / 100
  const accruedYieldNaira = vault.accrued_yield_kobo / 100
  const dailyRate = vault.daily_yield_rate || 0.145 / 365
  const estimatedDailyAddNaira = currentBalanceNaira * dailyRate

  const isSettlementReady = vault.days_to_unlock <= 0 || vault.lock_status === 'SETTLEMENT_READY'

  const handleCopyDva = () => {
    if (vault.dedicated_account?.account_number) {
      navigator.clipboard.writeText(vault.dedicated_account.account_number)
      setCopiedDva(true)
      toastSuccess('Dedicated account number copied to clipboard!')
      setTimeout(() => setCopiedDva(false), 2500)
    }
  }

  return (
    <div className="rent-savings">
      {/* Active Locked Hero Banner */}
      <div className="vault-dashboard__hero">
        <div className="vault-dashboard__top-row">
          <div className="vault-dashboard__lock-pill">
            <Lock size={13} color="var(--clay)" />
            <span>{isSettlementReady ? 'Settlement Ready' : 'Maturity Locked'}</span>
          </div>
          <span className="vault-dashboard__countdown-pill">
            {vault.days_remaining} Days to Rent Day
          </span>
        </div>

        <div className="vault-dashboard__amounts">
          <span className="vault-dashboard__target-label">
            Target: {formatCurrency(targetAmountNaira, 'NGN')} due on{' '}
            {new Date(vault.contractual_due_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="vault-dashboard__current-balance">
            {formatCurrency(currentBalanceNaira, 'NGN')}
          </span>
        </div>

        {/* Target Progress Bar */}
        <div className="vault-dashboard__gauge-wrapper">
          <div className="vault-dashboard__gauge-header">
            <span>Target Progress</span>
            <span style={{ fontWeight: 700 }}>{vault.target_completion_percentage}%</span>
          </div>
          <div className="vault-dashboard__progress-bar">
            <div
              className="vault-dashboard__progress-fill"
              style={{ width: `${Math.min(100, vault.target_completion_percentage)}%` }}
            />
          </div>
        </div>

        {/* Daily Accrued Yield Card */}
        <div className="vault-dashboard__interest-card">
          <div className="vault-dashboard__interest-text">
            <TrendingUp size={16} />
            <span>+{formatCurrency(accruedYieldNaira, 'NGN')} profit earned</span>
          </div>
          <span className="vault-dashboard__interest-rate">
            (+{formatCurrency(estimatedDailyAddNaira, 'NGN')} added today)
          </span>
        </div>

        {/* Quick Fund Action */}
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

        {/* If T-30 has arrived, present Settlement Hub banner */}
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

      {/* Upward Score Discipline Meter */}
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

      {/* Quick Action Cards Grid */}
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

      {/* Fair Exit Deterrent Footer Link */}
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

      {/* Modals */}
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
