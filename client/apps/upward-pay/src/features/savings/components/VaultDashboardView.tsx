'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpRight,
  FileText,
  FileCheck2,
  Receipt,
  Loader2,
  Calendar,
  Unlock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { API_BASE } from '@/lib/api-client'
import { getAccessToken } from '@/lib/auth-token'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { getRentDepositReceipt } from '@/features/payments/services/paymentService'
import { useUpdateVaultSchedule } from '../hooks/useRentSavings'
import { FundVaultModal, type VaultFundingMode } from './FundVaultModal'
import { FairBreakoutModal } from './FairBreakoutModal'
import { MaturedWithdrawalModal } from './MaturedWithdrawalModal'
import { readSavingsRentPlan } from '../utils/savingsRentPlan'
import { ordinalDay, REMINDER_DAYS } from '../utils/reminderDay'
import {
  type SavingsCadence,
  type SavingsLockMode,
  type SavingsPlanPattern,
  type SavingsProductOption,
  type VaultOnTrackStatus,
  type VaultTransactionItem,
} from '../services/savingsService'
import { SAVINGS_FUND_CODE, SAVINGS_FUND_NAME } from '../constants/savingsLegal'

interface VaultDashboardViewProps {
  vault: {
    vault_id: string
    lock_status: string
    cadence?: SavingsCadence
    product_option?: SavingsProductOption
    lock_mode?: SavingsLockMode
    plan_pattern?: SavingsPlanPattern
    initial_deposit_kobo?: number
    minimum_initial_deposit_kobo?: number
    minimum_initial_deposit_pct?: number
    planned_monthly_deposit_kobo?: number
    current_month_paid_kobo?: number
    current_month_remaining_kobo?: number
    current_month_fulfilled?: boolean
    suggested_deposit_today_kobo?: number
    catch_up_today_kobo?: number
    on_track_status?: VaultOnTrackStatus
    is_target_reached_early?: boolean
    remaining_scheduled_deposits?: number
    active_compounding_days?: number
    preferred_payday_day?: number
    is_rent_protec?: boolean
    insurance_premium_pct?: number
    has_completed_arm_kyc?: boolean
    address_verification_status?: string | null
    consent?: {
      consent_uuid: string
      terms_version: string
      consent_doc_version: string
      fund_code: string
      fund_name: string
      accepted_at: string
      has_document: boolean
    } | null
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
  onRestartVault?: () => void
  onPinVault?: () => void
  onUnpinVault?: () => void
}

export function VaultDashboardView({
  vault,
  onGoToSettlementHub,
  onRestartVault,
  onPinVault,
  onUnpinVault,
}: VaultDashboardViewProps) {
  const isInitialPrompt = vault.current_balance_kobo === 0
  const [fundModalMode, setFundModalMode] = useState<VaultFundingMode>(() =>
    isInitialPrompt ? 'INITIAL_DEPOSIT' : vault.current_month_fulfilled ? 'EXTRA_TOPUP' : 'MONTHLY',
  )
  const [showFundModal, setShowFundModal] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const dismissed = sessionStorage.getItem('upward_dismissed_initial_deposit_prompt')
        return !dismissed && isInitialPrompt
      } catch {}
    }
    return isInitialPrompt
  })
  const [editingPayday, setEditingPayday] = useState(false)
  const [showBreakoutModal, setShowBreakoutModal] = useState(false)
  const [showMaturedWithdrawModal, setShowMaturedWithdrawModal] = useState(false)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)
  const [downloadingConsent, setDownloadingConsent] = useState(false)
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const updateScheduleMutation = useUpdateVaultSchedule()
  const [nowTimestamp] = useState(() => Date.now())
  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  const currentBalanceNaira = vault.current_balance_kobo / 100
  const depositedPrincipalNaira = (vault.principal_kobo ?? vault.current_balance_kobo) / 100
  const interestEarnedNaira = (vault.accrued_yield_kobo ?? 0) / 100
  const expectedReturnsNaira = (vault.pay_less_projection?.projected_yield_kobo ?? 0) / 100
  const showDeposited =
    interestEarnedNaira > 0 &&
    Math.round(depositedPrincipalNaira) !== Math.round(currentBalanceNaira)
  const balanceStatus: { key: string; text: string; gain?: boolean }[] = []
  if (showDeposited) {
    balanceStatus.push({
      key: 'deposited',
      text: `Deposited ${formatCurrency(depositedPrincipalNaira, 'NGN')}`,
    })
  }
  if (interestEarnedNaira > 0) {
    balanceStatus.push({
      key: 'interest',
      text: `Interest earned +${formatCurrency(interestEarnedNaira, 'NGN')}`,
      gain: true,
    })
  }
  if (expectedReturnsNaira > 0) {
    balanceStatus.push({
      key: 'expected',
      text: `Expected by rent day +${formatCurrency(expectedReturnsNaira, 'NGN')}`,
      gain: true,
    })
  }
  const targetAmountNaira = activeProperty?.rentAmount || vault.target_amount_kobo / 100
  const targetDueDate = activeProperty?.rentEndDate || vault.contractual_due_date
  const daysRemaining = targetDueDate
    ? Math.max(
        0,
        Math.ceil((new Date(targetDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24)),
      )
    : vault.days_remaining

  const { rates: platformRates } = usePlatformRates()
  const isFlexiblePlan = vault.lock_mode === 'FLEXIBLE' && !vault.is_rent_protec
  const savingsAnnualRatePct =
    vault.annual_yield_rate_pct ??
    (vault.is_rent_protec
      ? platformRates.rentProtecRatePct
      : isFlexiblePlan
        ? platformRates.flexibleSavingsAnnualRatePct
        : platformRates.savingsAnnualRatePct)

  const plannedMonthlyNaira = Math.round(
    (vault.planned_monthly_deposit_kobo && vault.planned_monthly_deposit_kobo > 0
      ? vault.planned_monthly_deposit_kobo
      : vault.pay_less_projection?.periodic_deposit_kobo ?? 0) / 100,
  )
  const currentMonthRemainingNaira = Math.round(
    (vault.current_month_remaining_kobo ??
      Math.max(
        0,
        (vault.planned_monthly_deposit_kobo ?? 0) - (vault.current_month_paid_kobo ?? 0),
      )) / 100,
  )
  const currentMonthFulfilled = Boolean(vault.current_month_fulfilled)
  const onTrackStatus: VaultOnTrackStatus = vault.on_track_status ?? 'ON_TRACK'
  const isTargetReachedEarly = Boolean(
    vault.is_target_reached_early || onTrackStatus === 'TARGET_REACHED',
  )
  const plannedInitialDepositNaira = Math.round((vault.initial_deposit_kobo ?? 0) / 100)
  const isPendingInitialDeposit =
    vault.plan_pattern === 'INITIAL_DEPOSIT' &&
    plannedInitialDepositNaira > 0 &&
    currentBalanceNaira < plannedInitialDepositNaira &&
    !isTargetReachedEarly
  const remainingInitialDepositNaira = isPendingInitialDeposit
    ? Math.max(0, Math.round(plannedInitialDepositNaira - currentBalanceNaira))
    : 0
  const isBehindPlan =
    currentBalanceNaira > 0 &&
    !isPendingInitialDeposit &&
    !isTargetReachedEarly &&
    onTrackStatus === 'BEHIND'
  const suggestedDepositTodayNaira =
    vault.suggested_deposit_today_kobo !== undefined && vault.suggested_deposit_today_kobo > 0
      ? Math.round(vault.suggested_deposit_today_kobo / 100)
      : isPendingInitialDeposit
        ? remainingInitialDepositNaira
        : currentMonthRemainingNaira > 0
          ? currentMonthRemainingNaira
          : plannedMonthlyNaira
  const monthTargetMet =
    isTargetReachedEarly ||
    (!isPendingInitialDeposit &&
      currentBalanceNaira > 0 &&
      plannedMonthlyNaira > 0 &&
      !isBehindPlan &&
      (currentMonthFulfilled || currentMonthRemainingNaira <= 0))
  const monthlyButtonLabel =
    currentBalanceNaira === 0
      ? 'Pay Initial Deposit'
      : isPendingInitialDeposit && remainingInitialDepositNaira > 0
        ? `Complete Initial Deposit (${formatCurrency(remainingInitialDepositNaira, 'NGN')})`
        : isBehindPlan && suggestedDepositTodayNaira > 0
          ? `Save ${formatCurrency(suggestedDepositTodayNaira, 'NGN')} to catch up`
          : currentMonthRemainingNaira > 0 && currentMonthRemainingNaira < plannedMonthlyNaira
            ? `Save ${formatCurrency(currentMonthRemainingNaira, 'NGN')} to stay on plan`
            : suggestedDepositTodayNaira > 0
              ? `Save ${formatCurrency(suggestedDepositTodayNaira, 'NGN')} to stay on plan`
              : plannedMonthlyNaira > 0
                ? `Save ${formatCurrency(plannedMonthlyNaira, 'NGN')} to stay on plan`
                : 'Save to stay on plan'
  const preferredPaydayDay = vault.preferred_payday_day ?? 28
  const currentMonthShort = new Date(nowTimestamp).toLocaleDateString('en-GB', { month: 'short' })

  const targetCompletionPercentage =
    targetAmountNaira > 0
      ? Math.min(100, Math.round((currentBalanceNaira / targetAmountNaira) * 1000) / 10)
      : vault.target_completion_percentage

  const canSettleLandlord = Boolean(onGoToSettlementHub && daysRemaining <= 30)
  const transactions = vault.transactions || []

  const openFundingModal = (mode: VaultFundingMode) => {
    setFundModalMode(mode)
    setShowFundModal(true)
  }

  const handlePaydayChange = async (nextDay: number) => {
    try {
      await updateScheduleMutation.mutateAsync(nextDay)
      toastSuccess(`Reminder set to the ${ordinalDay(nextDay)}. You can still save any day.`)
      setEditingPayday(false)
    } catch {
      toastError('Could not update monthly savings day.')
    }
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

  const handleOpenConsentPdf = async () => {
    if (downloadingConsent) return
    setDownloadingConsent(true)
    try {
      const token = getAccessToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/rent-vaults/consent-document`, {
        method: 'GET',
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        throw new Error('Could not open your signed consent mandate yet.')
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer')
      if (!opened) {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `ARM_MMF_Consent_Mandate.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to download your signed consent document.'
      toastError(message)
    } finally {
      setDownloadingConsent(false)
    }
  }

  const fundDisplayName = platformRates.fundName || SAVINGS_FUND_NAME
  const isOptInOnly = platformRates.savingsMode === 'OPT_IN_ONLY'

  return (
    <div className="rent-savings">
      {isOptInOnly && (
        <div
          className="savings-kyc-banner savings-kyc-banner--verified"
          style={{ marginBottom: 14 }}
        >
          <div className="savings-kyc-banner__icon">
            <ShieldCheck size={18} color="#059669" />
          </div>
          <div className="savings-kyc-banner__content">
            <span className="savings-kyc-banner__title">
              Activation Opt-In Complete — Deposits Opening Soon
            </span>
            <span className="savings-kyc-banner__desc">
              Your Rent Vault and ARM investor onboarding are locked in. Any activation cashback
              credited to your vault appears in your balance below, and live deposits will open
              shortly.
            </span>
          </div>
        </div>
      )}

      <div className="vault-dashboard__hero">
        <div className="vault-dashboard__top-row">
          <div className="vault-dashboard__plan-pills">
            {vault.is_rent_protec ? (
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
                Rent Protec • Up to {savingsAnnualRatePct}% p.a.
              </span>
            ) : isFlexiblePlan ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: '#ECFDF5',
                  color: '#047857',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                }}
              >
                <Unlock size={11} />
                Flexible • Up to {savingsAnnualRatePct}% p.a.
              </span>
            ) : (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'var(--clay-faint)',
                  color: 'var(--clay)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                }}
              >
                Full Lock • Up to {savingsAnnualRatePct}% p.a.
              </span>
            )}
            <span className="vault-dashboard__countdown-pill">{daysRemaining} Days Left</span>
          </div>
        </div>

        <div className="vault-dashboard__amounts">
          <span className="vault-dashboard__balance-caption">Total Balance</span>
          <span className="vault-dashboard__current-balance">
            {formatCurrency(currentBalanceNaira, 'NGN')}
          </span>

          {balanceStatus.length > 0 && (
            <p className="vault-dashboard__status-line">
              {balanceStatus.map((part) => (
                <span key={part.key} className="vault-dashboard__status-part">
                  <span className={part.gain ? 'vault-dashboard__status-gain' : undefined}>
                    {part.text}
                  </span>
                </span>
              ))}
            </p>
          )}

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

        {/* Monthly amount, with live daily-compounding status & editable reminder day */}
        {(plannedMonthlyNaira > 0 || isTargetReachedEarly) && (
          <div className="vault-monthly-strip">
            <div className="vault-monthly-strip__title-row">
              <Calendar size={14} color="var(--clay)" />
              <span className="vault-monthly-strip__label">
                {isTargetReachedEarly ? (
                  <>
                    Rent target <strong>reached</strong>
                  </>
                ) : isPendingInitialDeposit ? (
                  <>
                    Initial deposit{' '}
                    <strong>{formatCurrency(remainingInitialDepositNaira, 'NGN')}</strong> left
                  </>
                ) : isBehindPlan && suggestedDepositTodayNaira > 0 ? (
                  <>
                    Stay on plan <strong>{formatCurrency(suggestedDepositTodayNaira, 'NGN')}</strong>
                  </>
                ) : (
                  <>
                    Monthly <strong>{formatCurrency(plannedMonthlyNaira, 'NGN')}</strong>
                  </>
                )}
              </span>
              <span
                className={`vault-monthly-strip__pill ${
                  isTargetReachedEarly || (!isPendingInitialDeposit && currentMonthFulfilled)
                    ? 'vault-monthly-strip__pill--paid'
                    : isBehindPlan
                      ? 'vault-monthly-strip__pill--behind'
                      : 'vault-monthly-strip__pill--due'
                }`}
              >
                {isTargetReachedEarly
                  ? 'Target reached'
                  : isPendingInitialDeposit
                    ? 'Upfront due'
                    : isBehindPlan
                      ? 'Catch-up due'
                      : currentMonthFulfilled
                        ? `Paid for ${currentMonthShort}`
                        : currentMonthRemainingNaira > 0 &&
                            currentMonthRemainingNaira < plannedMonthlyNaira
                          ? `${formatCurrency(currentMonthRemainingNaira, 'NGN')} left`
                          : 'This month'}
              </span>
            </div>
            {isTargetReachedEarly ? (
              <div className="vault-monthly-strip__note">
                Your balance keeps earning an indicative {savingsAnnualRatePct}% p.a. (ARM MMF,
                compounded daily) until rent day.
              </div>
            ) : isPendingInitialDeposit ? (
              <div className="vault-monthly-strip__note">
                Finish your {formatCurrency(plannedInitialDepositNaira, 'NGN')} upfront deposit to
                keep your {formatCurrency(plannedMonthlyNaira, 'NGN')}/mo plan on schedule.
              </div>
            ) : isBehindPlan ? (
              <div className="vault-monthly-strip__note">
                Updated today to keep you on track for your rent due date with daily compounding.
              </div>
            ) : null}
            <div className="vault-monthly-strip__sub">
              <span>Reminder on the {ordinalDay(preferredPaydayDay)}</span>
              <button
                type="button"
                className="vault-monthly-strip__edit-btn"
                onClick={() => setEditingPayday((v) => !v)}
              >
                {editingPayday ? 'Close' : 'Change day'}
              </button>
            </div>

            {editingPayday && (
              <div className="vault-monthly-strip__picker">
                <label className="vault-monthly-strip__picker-label" htmlFor="vault-reminder-day">
                  Reminder day
                </label>
                <select
                  id="vault-reminder-day"
                  className="rent-protec-payday__select"
                  disabled={updateScheduleMutation.isPending}
                  value={preferredPaydayDay}
                  onChange={(e) => handlePaydayChange(Number(e.target.value))}
                >
                  {REMINDER_DAYS.map((day) => (
                    <option key={day} value={day}>
                      {ordinalDay(day)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="vault-dashboard__actions">
          {canSettleLandlord && monthTargetMet ? (
            <>
              <button
                type="button"
                className="vault-btn-primary"
                onClick={onGoToSettlementHub}
              >
                <span>Pay Landlord</span>
                <ArrowRight size={16} />
              </button>
              {!isOptInOnly && (
                <button
                  type="button"
                  className="vault-btn-secondary"
                  onClick={() => openFundingModal('EXTRA_TOPUP')}
                >
                  <span>Top up any amount</span>
                </button>
              )}
            </>
          ) : (
            <>
              {!isOptInOnly && !monthTargetMet && (
                <button
                  type="button"
                  className="vault-btn-primary"
                  onClick={() =>
                    openFundingModal(
                      currentBalanceNaira === 0 || isPendingInitialDeposit
                        ? 'INITIAL_DEPOSIT'
                        : 'MONTHLY',
                    )
                  }
                >
                  <PlusCircle size={17} />
                  <span>{monthlyButtonLabel}</span>
                </button>
              )}

              {!isOptInOnly && monthTargetMet && (
                <button
                  type="button"
                  className="vault-btn-primary"
                  onClick={() => openFundingModal('EXTRA_TOPUP')}
                >
                  <span>Top up any amount</span>
                </button>
              )}

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

              {!isOptInOnly && currentBalanceNaira > 0 && !monthTargetMet && (
                <button
                  type="button"
                  className="vault-dashboard__text-action"
                  onClick={() => openFundingModal('EXTRA_TOPUP')}
                >
                  Top up any amount
                </button>
              )}
            </>
          )}

          {currentBalanceNaira > 0 && daysRemaining <= 30 && (
            <button
              type="button"
              className="vault-dashboard__text-action"
              onClick={() => {
                onPinVault?.()
                setShowMaturedWithdrawModal(true)
              }}
            >
              Withdraw to My Bank (₦0 Fee)
            </button>
          )}

          {currentBalanceNaira > 0 && daysRemaining > 30 && (
            <button
              type="button"
              className="vault-dashboard__text-action"
              style={
                isFlexiblePlan
                  ? undefined
                  : { color: 'var(--text-muted)', fontSize: '0.8125rem' }
              }
              onClick={() => {
                onPinVault?.()
                setShowBreakoutModal(true)
              }}
            >
              {isFlexiblePlan ? 'Withdraw Savings (₦0 Fee)' : 'Need your money early? Withdraw'}
            </button>
          )}
        </div>
      </div>

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

      <div className="vault-dashboard__footer">
        <p className="vault-dashboard__fund-note">
          <ShieldCheck size={13} aria-hidden />
          <span>
            {fundDisplayName} ({SAVINGS_FUND_CODE}), managed by{' '}
            {platformRates.partnerName || 'Asset & Resource Management Holding Company (ARM)'}
          </span>
        </p>
        <div className="vault-hero-docs">
          <Link href="/dashboard/legal/savings-terms" className="vault-hero-docs__link">
            <FileText size={12} />
            <span>Savings Terms</span>
          </Link>
          {vault.consent?.has_document && (
            <button
              type="button"
              className="vault-hero-docs__link"
              onClick={handleOpenConsentPdf}
              disabled={downloadingConsent}
            >
              {downloadingConsent ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileCheck2 size={12} />
              )}
              <span>Signed Mandate</span>
            </button>
          )}
        </div>
      </div>

      <FundVaultModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        initialFundingMode={fundModalMode}
        plannedMonthlyNaira={plannedMonthlyNaira}
        currentMonthRemainingNaira={currentMonthRemainingNaira}
        currentMonthFulfilled={currentMonthFulfilled}
        suggestedTodayNaira={suggestedDepositTodayNaira}
        onTrackStatus={onTrackStatus}
        isTargetReachedEarly={isTargetReachedEarly}
        contractualDueDate={targetDueDate}
        paydayDayOfMonth={preferredPaydayDay}
        recommendedAmountNaira={(() => {
          const periodicNaira = plannedMonthlyNaira

          if (isPendingInitialDeposit && remainingInitialDepositNaira > 0) {
            return remainingInitialDepositNaira
          }

          if (vault.current_balance_kobo > 0) {
            if (isBehindPlan && suggestedDepositTodayNaira > 0) {
              return suggestedDepositTodayNaira
            }
            if (currentMonthRemainingNaira > 0) {
              return currentMonthRemainingNaira
            }
            if (suggestedDepositTodayNaira > 0) {
              return suggestedDepositTodayNaira
            }
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

          return targetAmountNaira > 0 ? Math.round(targetAmountNaira * 0.2) : 100_000
        })()}
        cadence="MONTHLY"
        dedicatedAccount={vault.dedicated_account}
        targetAmountNaira={targetAmountNaira}
        daysRemaining={Math.max(1, daysRemaining - 30)}
        annualRatePct={savingsAnnualRatePct}
        productOption={vault.product_option || (vault.is_rent_protec ? 'RENT_PROTEC' : 'SAVE_AND_EARN')}
        planPattern={vault.plan_pattern || 'INITIAL_DEPOSIT'}
        currentBalanceNaira={currentBalanceNaira}
        isInitialDeposit={vault.current_balance_kobo === 0 || isPendingInitialDeposit}
      />

      {showBreakoutModal && (
        <FairBreakoutModal
          vaultId={vault.vault_id}
          principalKobo={vault.principal_kobo ?? vault.current_balance_kobo}
          accruedYieldKobo={vault.accrued_yield_kobo ?? 0}
          lockMode={vault.lock_mode ?? 'LOCKED'}
          productOption={
            vault.product_option || (vault.is_rent_protec ? 'RENT_PROTEC' : 'SAVE_AND_EARN')
          }
          annualRatePct={savingsAnnualRatePct}
          onClose={() => {
            setShowBreakoutModal(false)
            onUnpinVault?.()
          }}
          onCompleted={onRestartVault}
        />
      )}

      {showMaturedWithdrawModal && (
        <MaturedWithdrawalModal
          vaultId={vault.vault_id}
          principalKobo={vault.principal_kobo ?? vault.current_balance_kobo}
          accruedYieldKobo={vault.accrued_yield_kobo ?? 0}
          onClose={() => {
            setShowMaturedWithdrawModal(false)
            onUnpinVault?.()
          }}
          onCompleted={onRestartVault}
          onRestartVault={onRestartVault}
        />
      )}
    </div>
  )
}
