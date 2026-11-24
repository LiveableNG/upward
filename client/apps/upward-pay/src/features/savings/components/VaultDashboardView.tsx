'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  PlusCircle,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpRight,
  Copy,
  Check,
  FileText,
  Receipt,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { getRentDepositReceipt } from '@/features/payments/services/paymentService'
import { FundVaultModal } from './FundVaultModal'
import { readSavingsRentPlan } from '../utils/savingsRentPlan'
import {
  type SavingsCadence,
  type SavingsPlanPattern,
  type SavingsProductOption,
  type VaultTransactionItem,
} from '../services/savingsService'

interface VaultDashboardViewProps {
  vault: {
    vault_id: string
    lock_status: string
    cadence?: SavingsCadence
    product_option?: SavingsProductOption
    plan_pattern?: SavingsPlanPattern
    initial_deposit_kobo?: number
    is_rent_protec?: boolean
    insurance_premium_pct?: number
    current_balance_kobo: number
    principal_kobo: number
    vault_principal_kobo?: number
    deposit_balance_kobo?: number
    accrued_yield_kobo: number
    annual_yield_rate_pct?: number
    daily_yield_rate: number
    days_to_unlock: number
    days_remaining: number
    target_amount_kobo: number
    target_completion_percentage: number
    contractual_due_date: string
    unlock_date: string
    pay_less_projection?: {
      cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
      periodic_deposit_kobo: number
      number_of_payments: number
      total_tenant_contribution_kobo: number
      projected_yield_kobo: number
      rent_discount_pct: number
    } | null
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
  const isInitialPrompt = vault.current_balance_kobo === 0
  const [showFundModal, setShowFundModal] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const dismissed = sessionStorage.getItem('upward_dismissed_initial_deposit_prompt')
        return !dismissed && isInitialPrompt
      } catch {}
    }
    return isInitialPrompt
  })
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
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

  const { rates: platformRates } = usePlatformRates()
  const savingsAnnualRatePct =
    vault.annual_yield_rate_pct ??
    (vault.is_rent_protec ? platformRates.rentProtecRatePct : platformRates.savingsAnnualRatePct)

  const targetCompletionPercentage =
    targetAmountNaira > 0
      ? Math.min(100, Math.round((currentBalanceNaira / targetAmountNaira) * 1000) / 10)
      : vault.target_completion_percentage

  const canSettleLandlord = Boolean(onGoToSettlementHub && daysRemaining <= 30)

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

  const handleOpenReceipt = async (tx: VaultTransactionItem) => {
    if (downloadingReceiptId) return
    setDownloadingReceiptId(tx.id)

    try {
      const txIdentifier = tx.uuid || tx.reference || ''
      if (txIdentifier) {
        const res = await getRentDepositReceipt(txIdentifier)
        const receiptUrl: string | undefined = res?.url
        const fileName: string = res?.fileName || `upward_receipt_${txIdentifier}.pdf`

        if (receiptUrl && receiptUrl.startsWith('data:application/pdf;base64,')) {
          const base64Data = receiptUrl.split(',')[1] || ''
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const pdfBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
          const blobUrl = URL.createObjectURL(pdfBlob)
          const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer')
          if (!opened) {
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
          return
        }

        if (receiptUrl && /^https?:\/\//i.test(receiptUrl)) {
          window.open(receiptUrl, '_blank', 'noopener,noreferrer')
          return
        }
      }

      if (tx.receipt_url) {
        const apiRoot =
          process.env.NEXT_PUBLIC_API_URL ||
          (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '')
        const normalizedPath = tx.receipt_url.replace(/^\/api\/v1/, '')
        const fullUrl = /^https?:\/\//i.test(tx.receipt_url)
          ? tx.receipt_url
          : `${apiRoot}${normalizedPath}${tx.receipt_url.includes('?') ? '&' : '?'}format=pdf`
        window.open(fullUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Unable to generate receipt right now.')
    } finally {
      setDownloadingReceiptId(null)
    }
  }

  return (
    <div className="rent-savings">
      <div className="vault-dashboard__hero">
        <div className="vault-dashboard__top-row">
          <div className="vault-arm-badge">
            <ShieldCheck size={14} className="vault-arm-badge__icon" />
            <span>
              <strong>Money Market Fund (MMF)</strong> managed by{' '}
              <strong>
                {platformRates.partnerName || 'Asset & Resource Management Holding Company (ARM)'}
              </strong>
            </span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {vault.is_rent_protec && (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: '#ECFDF5',
                  color: '#047857',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                }}
              >
                Rent Protec • Protected
              </span>
            )}
            <span className="vault-dashboard__countdown-pill">{daysRemaining} Days Left</span>
          </div>
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

      {/* Savings Score Card (Commented out)
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

        <Link
          href="/dashboard/score-breakdown"
          className="vault-score-card__explainer"
        >
          <span>How savings activity contributes to your Upward Score</span>
          <ChevronRight size={14} className="vault-score-card__explainer-chevron" />
        </Link>
      </div>
      */}

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
            earning {savingsAnnualRatePct}% p.a. daily interest.
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
                      <button
                        type="button"
                        className="vault-ledger__receipt-link"
                        onClick={() => handleOpenReceipt(tx)}
                        disabled={downloadingReceiptId === tx.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: downloadingReceiptId === tx.id ? 'wait' : 'pointer',
                          padding: 0,
                        }}
                      >
                        {downloadingReceiptId === tx.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <FileText size={11} />
                        )}{' '}
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FundVaultModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        recommendedAmountNaira={(() => {
          const periodicNaira = Math.round(
            (vault.pay_less_projection?.periodic_deposit_kobo ?? 0) / 100,
          )

          // Once the user has already started saving, recommend their next periodic deposit
          // capped at the remaining rent target (never repeat the upfront initial deposit).
          if (vault.current_balance_kobo > 0) {
            const remainingToTarget = Math.max(
              0,
              Math.round(targetAmountNaira - currentBalanceNaira),
            )
            if (remainingToTarget > 0) {
              return periodicNaira > 0
                ? Math.min(remainingToTarget, periodicNaira)
                : remainingToTarget
            }
            return periodicNaira > 0 ? periodicNaira : 50_000
          }

          // First deposit (balance === 0): clamp any stale >50% initial deposit to 25% of target rent
          const maxSensibleInitial =
            targetAmountNaira > 0 ? Math.round(targetAmountNaira * 0.5) : Infinity
          const savedPlan = readSavingsRentPlan(user?.id)

          if (vault.initial_deposit_kobo && vault.initial_deposit_kobo > 0) {
            const vaultInitialNaira = Math.round(vault.initial_deposit_kobo / 100)
            if (vaultInitialNaira <= maxSensibleInitial) {
              return vaultInitialNaira
            }
          }

          if (savedPlan?.initialDeposit && Number(savedPlan.initialDeposit) > 0) {
            const planInit = Math.round(Number(savedPlan.initialDeposit))
            const matchesRent =
              !targetAmountNaira || Number(savedPlan.rentAmount || 0) === targetAmountNaira
            if (matchesRent && planInit <= maxSensibleInitial) {
              return planInit
            }
          }

          if (vault.plan_pattern === 'EQUAL' || vault.plan_pattern === 'STEP_UP') {
            return periodicNaira || (targetAmountNaira > 0 ? Math.round(targetAmountNaira / 10) : 100_000)
          }

          return targetAmountNaira > 0 ? Math.round(targetAmountNaira * 0.25) : 100_000
        })()}
        cadence="MONTHLY"
        dedicatedAccount={vault.dedicated_account}
        targetAmountNaira={targetAmountNaira}
        daysRemaining={Math.max(1, daysRemaining - 30)}
        annualRatePct={savingsAnnualRatePct}
        productOption={vault.product_option || (vault.is_rent_protec ? 'RENT_PROTEC' : 'SAVE_AND_EARN')}
        planPattern={vault.plan_pattern || 'INITIAL_DEPOSIT'}
        currentBalanceNaira={currentBalanceNaira}
        isInitialDeposit={vault.current_balance_kobo === 0}
      />
    </div>
  )
}
