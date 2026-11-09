'use client'

import React, { useState } from 'react'
import {
  Lock,
  TrendingUp,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpRight,
  Landmark,
  Sparkles,
  Copy,
  Check,
  FileText,
  Receipt,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { EmergencyAdvanceModal } from './EmergencyAdvanceModal'
import { FairBreakoutModal } from './FairBreakoutModal'
import { FundVaultModal } from './FundVaultModal'
import type { VaultTransactionItem } from '../services/savingsService'

interface VaultDashboardViewProps {
  vault: {
    vault_id: string
    lock_status: string
    current_balance_kobo: number
    principal_kobo: number
    vault_principal_kobo?: number
    deposit_balance_kobo?: number
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
    emergency_advance?: {
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
    transactions?: VaultTransactionItem[]
  }
  onGoToSettlementHub?: () => void
}

export function VaultDashboardView({ vault, onGoToSettlementHub }: VaultDashboardViewProps) {
  const [showFundModal, setShowFundModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showBreakoutModal, setShowBreakoutModal] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)

  const { user } = useAuth()
  const { success: toastSuccess } = useToast()
  const [nowTimestamp] = useState(() => Date.now())
  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  const currentBalanceNaira = vault.current_balance_kobo / 100
  const vaultPrincipalNaira = (vault.vault_principal_kobo ?? vault.principal_kobo) / 100
  const depositBalanceNaira = (vault.deposit_balance_kobo ?? 0) / 100
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
  const transactions = vault.transactions || []

  const handleCopyAccount = () => {
    if (!vault.dedicated_account?.account_number) return
    navigator.clipboard.writeText(vault.dedicated_account.account_number)
    setCopiedAccount(true)
    toastSuccess('Rent savings account number copied!')
    setTimeout(() => setCopiedAccount(false), 2000)
  }

  return (
    <div className="rent-savings">
      <div className="vault-dashboard__hero">
        <div className="vault-dashboard__top-row">
          <div className="vault-dashboard__lock-pill">
            <Lock size={13} color="var(--clay)" />
            <span>{isSettlementReady ? 'Ready to Pay Rent' : 'Target Rent Savings'}</span>
          </div>
          <span className="vault-dashboard__countdown-pill">{daysRemaining} Days to Rent Day</span>
        </div>

        <div className="vault-dashboard__amounts">
          <span className="vault-dashboard__balance-caption">Total Rent Savings &amp; Deposit</span>
          <span className="vault-dashboard__current-balance">
            {formatCurrency(currentBalanceNaira, 'NGN')}
          </span>
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
        </div>

        <div className="vault-dashboard__gauge-wrapper">
          <div className="vault-dashboard__gauge-header">
            <span>Target Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--clay)' }}>
              {targetCompletionPercentage}%
            </span>
          </div>
          <div className="vault-dashboard__progress-bar">
            <div
              className="vault-dashboard__progress-fill"
              style={{ width: `${Math.min(100, targetCompletionPercentage)}%` }}
            />
          </div>
        </div>

        <div className="vault-dashboard__breakdown-grid">
          <div className="vault-dashboard__breakdown-item">
            <span className="vault-dashboard__breakdown-label">Vault Principal</span>
            <span className="vault-dashboard__breakdown-val">
              {formatCurrency(vaultPrincipalNaira, 'NGN')}
            </span>
          </div>
          {depositBalanceNaira > 0 && (
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">Rent Deposit Credit</span>
              <span className="vault-dashboard__breakdown-val">
                {formatCurrency(depositBalanceNaira, 'NGN')}
              </span>
            </div>
          )}
          <div className="vault-dashboard__breakdown-item">
            <span className="vault-dashboard__breakdown-label">Interest Earned (14.5% p.a.)</span>
            <span className="vault-dashboard__breakdown-val vault-dashboard__breakdown-val--yield">
              +{formatCurrency(accruedYieldNaira, 'NGN')}
            </span>
          </div>
        </div>

        <div className="vault-dashboard__interest-card">
          <div className="vault-dashboard__interest-text">
            <TrendingUp size={16} />
            <span>+{formatCurrency(accruedYieldNaira, 'NGN')} Total Returns</span>
          </div>
          <span className="vault-dashboard__interest-rate">
            +{formatCurrency(estimatedDailyAddNaira, 'NGN')} / day at 14.5% p.a.
          </span>
        </div>

        <div className="vault-dashboard__actions">
          <button
            type="button"
            className="vault-btn-primary"
            onClick={() => setShowFundModal(true)}
          >
            <PlusCircle size={18} />
            <span>Add Funds</span>
          </button>

          {onGoToSettlementHub && (
            <button
              type="button"
              className={isSettlementReady ? 'vault-btn-primary' : 'vault-btn-secondary'}
              onClick={onGoToSettlementHub}
            >
              <span>{isSettlementReady ? 'Settle Landlord & Claim Bonus' : 'Pay Landlord'}</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {vault.dedicated_account?.account_number && (
        <div className="vault-dva-card">
          <div className="vault-dva-card__header">
            <span className="vault-dva-card__title">Your Personal Rent Account</span>
            <span className="vault-dva-card__badge">
              {vault.dedicated_account.bank_name || 'Wema Bank'}
            </span>
          </div>
          <div className="vault-dva-card__number-row">
            <div className="vault-dva-card__number-block">
              <span className="vault-dva-card__number-label">Account Number</span>
              <span className="vault-dva-card__number">
                {vault.dedicated_account.account_number}
              </span>
            </div>
            <button
              type="button"
              className={`vault-dva-card__copy-btn ${
                copiedAccount ? 'vault-dva-card__copy-btn--copied' : ''
              }`}
              onClick={handleCopyAccount}
            >
              {copiedAccount ? (
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
              <span className="vault-dva-card__meta-label">Account Name</span>
              <span className="vault-dva-card__meta-value">
                {vault.dedicated_account.account_name}
              </span>
            </div>
            <div className="vault-dva-card__meta-row">
              <span className="vault-dva-card__meta-label">Bank Name</span>
              <span className="vault-dva-card__meta-value">
                {vault.dedicated_account.bank_name || 'Wema Bank'}
              </span>
            </div>
          </div>
        </div>
      )}

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
            <div className="vault-score-card__metric-label">Lock Consistency</div>
          </div>
        </div>
      </div>

      <div className="vault-actions-grid">
        <button type="button" className="vault-action-btn" onClick={() => setShowFundModal(true)}>
          <div className="vault-action-btn__icon">
            <ArrowDownToLine size={18} />
          </div>
          <span className="vault-action-btn__title">Top Up Savings</span>
          <span className="vault-action-btn__subtitle">
            {vault.dedicated_account
              ? `${vault.dedicated_account.bank_name} • ${vault.dedicated_account.account_number}`
              : 'Direct bank transfer'}
          </span>
        </button>

        {vault.emergency_advance && (
          <button
            type="button"
            className="vault-action-btn"
            onClick={() => setShowAdvanceModal(true)}
          >
            <div className="vault-action-btn__icon">
              <Sparkles size={18} />
            </div>
            <span className="vault-action-btn__title">Borrow Emergency Cash</span>
            <span className="vault-action-btn__subtitle">
              {vault.emergency_advance.has_active_loan
                ? 'Active advance in progress'
                : `Up to ${formatCurrency(vault.emergency_advance.max_borrowable_kobo / 100, 'NGN')} (40%)`}
            </span>
          </button>
        )}

        <button
          type="button"
          className="vault-action-btn vault-action-btn--featured"
          onClick={() => onGoToSettlementHub?.()}
        >
          <div className="vault-action-btn__icon">
            <Landmark size={18} />
          </div>
          <div className="vault-action-btn__content">
            <span className="vault-action-btn__title">Settle Rent to Landlord</span>
            <span className="vault-action-btn__subtitle">
              Direct NIP transfer + 1.5% on-time rent bonus
            </span>
          </div>
          <ArrowRight size={16} className="vault-action-btn__arrow" />
        </button>
      </div>

      <div className="vault-ledger">
        <div className="vault-ledger__header">
          <div className="vault-ledger__title">
            <Receipt size={18} color="var(--clay)" />
            <span>Savings &amp; Deposit Activity</span>
          </div>
          <span className="vault-ledger__count">{transactions.length} entries</span>
        </div>

        {transactions.length === 0 ? (
          <div className="vault-ledger__empty">
            No savings or deposit transactions yet. Transfer to your dedicated account to start
            earning 14.5% p.a. daily interest.
          </div>
        ) : (
          <div className="vault-ledger__list">
            {transactions.slice(0, 12).map((tx) => {
              const isCredit = tx.direction === 'CREDIT'
              const amountNaira = (tx.amount_kobo || 0) / 100
              return (
                <div key={tx.id} className="vault-ledger__row">
                  <div className="vault-ledger__left">
                    <div
                      className={`vault-ledger__icon ${
                        isCredit ? 'vault-ledger__icon--credit' : 'vault-ledger__icon--debit'
                      }`}
                    >
                      {isCredit ? <ArrowDownToLine size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="vault-ledger__meta">
                      <span className="vault-ledger__label">{tx.source_label}</span>
                      <span className="vault-ledger__sub">
                        {tx.narration || tx.reference || 'Rent savings transaction'} •{' '}
                        {new Date(tx.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="vault-ledger__right">
                    <span
                      className={`vault-ledger__amount ${
                        isCredit ? 'vault-ledger__amount--credit' : 'vault-ledger__amount--debit'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatCurrency(amountNaira, 'NGN')}
                    </span>
                    {tx.receipt_url && (
                      <a
                        href={tx.receipt_url}
                        className="vault-ledger__receipt-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={11} /> Receipt
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
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
          Need funds early? Review Fair Exit &amp; Breakout Policy
        </button>
      </div>

      <FundVaultModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        dedicatedAccount={vault.dedicated_account}
      />

      {showAdvanceModal && vault.emergency_advance && (
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
