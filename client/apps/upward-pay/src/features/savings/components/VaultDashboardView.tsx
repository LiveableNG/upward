'use client'

import React, { useState } from 'react'
import {
  TrendingUp,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpRight,
  Copy,
  Check,
  FileText,
  Receipt,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
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
    } | null
    savings_score: {
      total_score: number
      cadence_points?: number
      velocity_points?: number
      loan_discipline_points?: number
      consistency_points?: number
      goal_points?: number
    }
    transactions?: VaultTransactionItem[]
  }
  onGoToSettlementHub?: () => void
}

export function VaultDashboardView({ vault, onGoToSettlementHub }: VaultDashboardViewProps) {
  const [showFundModal, setShowFundModal] = useState(false)
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

  // Landlord settlement is ONLY available when rent due date is 30 days away or less
  const canSettleLandlord = Boolean(onGoToSettlementHub && daysRemaining <= 30)

  // Readjusted scoring (2 clear pillars totaling 100 pts without borrow/advance):
  // 1. Regular Saving (up to 50 pts)
  // 2. Target Progress (up to 50 pts)
  const consistencyPoints =
    vault.savings_score.consistency_points ??
    Math.min(
      50,
      Math.round(((vault.savings_score.cadence_points ?? 0) / 40) * 50) ||
        (currentBalanceNaira > 0 ? 15 : 10),
    )
  const goalPoints =
    vault.savings_score.goal_points ??
    Math.min(50, Math.round((targetCompletionPercentage / 100) * 50))
  const totalScore = Math.min(100, consistencyPoints + goalPoints)

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
          <div className="vault-arm-badge">
            <ShieldCheck size={14} className="vault-arm-badge__icon" />
            <span>
              Powered by <strong>Asset &amp; Resource Management Holding Company (ARM)</strong>
            </span>
          </div>
          <span className="vault-dashboard__countdown-pill">{daysRemaining} Days Left</span>
        </div>

        <div className="vault-dashboard__amounts">
          <span className="vault-dashboard__balance-caption">Total Savings</span>
          <span className="vault-dashboard__current-balance">
            {formatCurrency(currentBalanceNaira, 'NGN')}
          </span>
          <div className="vault-dashboard__target-row">
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
            <span className="vault-dashboard__target-pct">{targetCompletionPercentage}%</span>
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
            <span className="vault-dashboard__breakdown-label">Principal</span>
            <span className="vault-dashboard__breakdown-val">
              {formatCurrency(vaultPrincipalNaira, 'NGN')}
            </span>
          </div>
          {depositBalanceNaira > 0 && (
            <div className="vault-dashboard__breakdown-item">
              <span className="vault-dashboard__breakdown-label">Deposit Credit</span>
              <span className="vault-dashboard__breakdown-val">
                {formatCurrency(depositBalanceNaira, 'NGN')}
              </span>
            </div>
          )}
          <div className="vault-dashboard__breakdown-item">
            <span className="vault-dashboard__breakdown-label">Returns (14.5% p.a.)</span>
            <span className="vault-dashboard__breakdown-val vault-dashboard__breakdown-val--yield">
              +{formatCurrency(accruedYieldNaira, 'NGN')}
              <span className="vault-dashboard__yield-sub">
                +{formatCurrency(estimatedDailyAddNaira, 'NGN')}/day
              </span>
            </span>
          </div>
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

          {canSettleLandlord && (
            <button
              type="button"
              className="vault-btn-secondary"
              onClick={onGoToSettlementHub}
            >
              <span>Pay Landlord</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {vault.dedicated_account?.account_number && (
        <div className="vault-dva-card">
          <div className="vault-dva-card__header">
            <span className="vault-dva-card__title">Personal Rent Account</span>
            <span className="vault-dva-card__badge">
              {vault.dedicated_account.bank_name || 'Wema Bank'}
            </span>
          </div>
          <div className="vault-dva-card__number-row">
            <div className="vault-dva-card__number-block">
              <span className="vault-dva-card__number">
                {vault.dedicated_account.account_number}
              </span>
              <span className="vault-dva-card__sub-label">
                {vault.dedicated_account.account_name}
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
        </div>
      )}

      <div className="vault-score-card">
        <div className="vault-score-card__header">
          <div className="vault-score-card__title">
            <ShieldCheck size={18} color="var(--clay)" />
            <span>Savings Score</span>
          </div>
          <span className="vault-score-card__points-pill">
            {totalScore} / 100
          </span>
        </div>

        <div className="vault-score-card__metrics vault-score-card__metrics--two">
          <div>
            <div className="vault-score-card__metric-val">
              {consistencyPoints} / 50
            </div>
            <div className="vault-score-card__metric-label">Regular Saving</div>
          </div>
          <div>
            <div className="vault-score-card__metric-val">
              {goalPoints} / 50
            </div>
            <div className="vault-score-card__metric-label">Target Progress</div>
          </div>
        </div>
      </div>

      <div className="vault-ledger">
        <div className="vault-ledger__header">
          <div className="vault-ledger__title">
            <Receipt size={18} color="var(--clay)" />
            <span>Recent Activity</span>
          </div>
          <span className="vault-ledger__count">
            {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
          </span>
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
          Review Fair Exit &amp; Breakout Policy
        </button>
      </div>

      <FundVaultModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        dedicatedAccount={vault.dedicated_account}
      />

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
