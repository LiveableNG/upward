'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Calendar,
  Sparkles,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'
import { FundVaultModal } from '@/features/savings/components/FundVaultModal'
import { SavingsInvestorKycModal } from '@/features/savings/components/SavingsInvestorKycModal'
import { useAuth } from '@/features/auth/AuthContext'
import '@/styles/savings-v1.css'

interface RentRunwayHeroProps {
  rentDue: {
    amount: number
    currency: string
    address: string
    days: number
    isOverdue: boolean
    isReviewing: boolean
    isRejected: boolean
    label: string
    daysLabel: string
    href: string
  } | null
}

export function RentRunwayHero({ rentDue }: RentRunwayHeroProps) {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { data: vault } = useRentVault()
  const [showFundModal, setShowFundModal] = useState(false)
  const [showKycModal, setShowKycModal] = useState(false)
  const [nowTimestamp] = useState(() => Date.now())

  // Settings is the absolute single source of truth for rental details
  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )

  // 1. ACTIVE VAULT SCENARIO
  if (vault && vault.lock_status !== 'SETTLED' && vault.lock_status !== 'BROKEN_OUT') {
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
    const isSettlementReady = daysRemaining <= 30 || vault.lock_status === 'SETTLEMENT_READY'

    const targetCompletionPercentage =
      targetAmountNaira > 0
        ? Math.min(100, Math.round((currentBalanceNaira / targetAmountNaira) * 1000) / 10)
        : vault.target_completion_percentage

    const hasConsentedToSavings = Boolean(
      user?.savingsWalletEnabled || (vault && vault.current_balance_kobo > 0),
    )
    const isKycVerified = Boolean(user?.isIdentityVerified)
    const shouldBlur = !isKycVerified || !hasConsentedToSavings

    return (
      <div className="runway-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          className="runway-hero__content-layer"
          style={{
            filter: shouldBlur ? 'blur(4px)' : 'none',
            pointerEvents: shouldBlur ? 'none' : 'auto',
            userSelect: shouldBlur ? 'none' : 'auto',
            transition: 'filter 0.2s ease',
          }}
        >
          <div className="runway-hero__top-row">
            <div className="runway-hero__eyebrow">
              <Lock size={12} color="var(--skin-primary, #c2501f)" />
              <span>{isSettlementReady ? 'READY TO PAY RENT' : 'RENT SAVINGS · LOCKED'}</span>
            </div>
            <span className="runway-hero__countdown-badge">
              <Calendar size={12} />
              <span>{daysRemaining} Days to Rent Day</span>
            </span>
          </div>

          <div className="runway-hero__amounts">
            <span className="runway-hero__target-label">
              Target: {formatCurrency(targetAmountNaira, 'NGN')} due on{' '}
              {targetDueDate
                ? new Date(targetDueDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Rent Day'}
            </span>
            <span className="runway-hero__current-balance">
              {formatCurrency(currentBalanceNaira, 'NGN')}
            </span>
          </div>

          {/* Target Progress Bar */}
          <div className="runway-hero__gauge">
            <div className="runway-hero__gauge-header">
              <span>Target Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                {targetCompletionPercentage}%
              </span>
            </div>
            <div className="runway-hero__progress-bar">
              <div
                className="runway-hero__progress-fill"
                style={{ width: `${Math.min(100, targetCompletionPercentage)}%` }}
              />
            </div>
          </div>

          {/* Accrued Yield Widget */}
          <div className="runway-hero__interest-card">
            <div className="runway-hero__interest-text">
              <TrendingUp size={15} />
              <span>+{formatCurrency(accruedYieldNaira, 'NGN')} profit earned</span>
            </div>
            <span className="runway-hero__interest-rate">
              (+{formatCurrency(estimatedDailyAddNaira, 'NGN')} added today @ 14.5% p.a.)
            </span>
          </div>

          {/* Actions */}
          <div className="runway-hero__actions">
            <button
              type="button"
              className="runway-hero__btn-primary"
              onClick={() => setShowFundModal(true)}
            >
              <PlusCircle size={16} />
              <span>Fund Vault</span>
            </button>
            <button
              type="button"
              className="runway-hero__btn-secondary"
              onClick={() => router.push('/dashboard/savings')}
            >
              <span>Manage Vault</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {shouldBlur && (
          <div
            className="runway-hero__overlay"
            onClick={() => setShowKycModal(true)}
            role="button"
            tabIndex={0}
          >
            <div className="runway-hero__overlay-icon-wrap">
              {!isKycVerified ? <ShieldCheck size={22} /> : <Sparkles size={22} />}
            </div>
            <span className="runway-hero__overlay-title">
              {!isKycVerified ? 'Investor Verification Required' : 'Rent Savings Plan Ready'}
            </span>
            <p className="runway-hero__overlay-desc">
              {!isKycVerified
                ? 'Complete regulatory KYC to unlock your 14.5% compound yield rent vault.'
                : 'Get cash back on your next rent when you save up for it regularly.'}
            </p>
            <button
              type="button"
              className="runway-hero__overlay-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowKycModal(true)
              }}
            >
              {!isKycVerified ? (
                <>
                  <ShieldCheck size={16} /> Verify Now
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Start Saving Today
                </>
              )}
            </button>
          </div>
        )}

        <FundVaultModal
          isOpen={showFundModal}
          onClose={() => setShowFundModal(false)}
          dedicatedAccount={vault.dedicated_account}
        />

        <SavingsInvestorKycModal
          isOpen={showKycModal}
          onClose={() => setShowKycModal(false)}
          onSuccess={async () => {
            await refreshUser()
          }}
        />
      </div>
    )
  }

  // 2. NO ACTIVE VAULT BUT RENT OBLIGATION KNOWN (Settings is source of truth)
  const targetRentFromSettings = activeProperty?.rentAmount
  const rentEndDateFromSettings = activeProperty?.rentEndDate
  const daysFromSettings = rentEndDateFromSettings
    ? Math.max(
        0,
        Math.ceil(
          (new Date(rentEndDateFromSettings).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24),
        ),
      )
    : null

  const targetAmount = targetRentFromSettings || rentDue?.amount || 0
  const runwayDays = daysFromSettings ?? (rentDue?.days || 0)
  const propertyAddress =
    activeProperty?.location?.address ||
    activeProperty?.address ||
    rentDue?.address ||
    'Your Rental'

  const hasFarAwayRent = runwayDays > 45 && targetAmount > 0
  if (hasFarAwayRent) {
    const monthsRemaining = Math.max(1, Math.round(runwayDays / 30))
    const monthlyDeposit = Math.round(targetAmount / monthsRemaining)
    const estimatedYieldNaira = Math.round(targetAmount * 0.145 * (runwayDays / 365) * 0.52)

    return (
      <div className="runway-hero">
        <div className="runway-hero__top-row">
          <div className="runway-hero__eyebrow">
            <Sparkles size={12} color="var(--skin-primary, #c2501f)" />
            <span>RENT RUNWAY · 14.5% COMPOUND YIELD</span>
          </div>
          <span className="runway-hero__countdown-badge">
            <Calendar size={12} />
            <span>{runwayDays} Days to Next Rent</span>
          </span>
        </div>

        <div className="runway-hero__amounts">
          <span className="runway-hero__target-label">
            Target Rent Obligation · {propertyAddress}
          </span>
          <span className="runway-hero__current-balance">
            {formatCurrency(targetAmount, 'NGN')}
          </span>
        </div>

        <div className="runway-hero__pitch">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              marginBottom: 3,
              color: '#16a34a',
            }}
          >
            <TrendingUp size={15} />
            <span>
              Earn up to +{formatCurrency(estimatedYieldNaira, 'NGN')} in compound returns
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--shell-ink-muted, #7a7268)' }}>
            Save approx. <strong>{formatCurrency(monthlyDeposit, 'NGN')}/month</strong>. Earns 14.5%
            daily compounding mutual fund returns. Save regularly to get cashback on rent day.
          </p>
        </div>

        <div className="runway-hero__actions">
          <button
            type="button"
            className="runway-hero__btn-primary"
            onClick={() => router.push('/dashboard/savings')}
          >
            <Sparkles size={15} />
            <span>Lock Rent Runway &amp; Earn 14.5%</span>
          </button>
          {rentDue?.href && (
            <button
              type="button"
              className="runway-hero__btn-secondary"
              onClick={() => router.push(rentDue.href)}
            >
              <span>Pay Rent Early</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // 3. RENT DUE SOON (<= 45 DAYS) OR NO UPCOMING RENT CONFIGURED
  const amountToPay = rentDue?.amount || 0
  const isUrgent = rentDue && (rentDue.days <= 14 || rentDue.isOverdue)

  return (
    <div className={`runway-hero ${isUrgent ? 'runway-hero--urgent' : ''}`}>
      <div className="runway-hero__top-row">
        <div
          className="runway-hero__eyebrow"
          style={{ color: rentDue?.isOverdue ? 'var(--error)' : 'var(--skin-primary)' }}
        >
          <Clock size={12} />
          <span>{rentDue?.isOverdue ? 'OVERDUE RENT PAYMENT' : 'UPCOMING RENT OBLIGATION'}</span>
        </div>
        {rentDue && (
          <span
            className="runway-hero__countdown-badge"
            style={{
              background: rentDue.isOverdue ? '#fee2e2' : 'var(--shell-tint)',
              color: rentDue.isOverdue ? '#dc2626' : 'var(--skin-primary)',
            }}
          >
            <Calendar size={12} />
            <span>
              {rentDue.isOverdue ? `${rentDue.days} Days Overdue` : `Due in ${rentDue.days} Days`}
            </span>
          </span>
        )}
      </div>

      <div className="runway-hero__amounts">
        <span className="runway-hero__target-label">{rentDue?.address || 'Your Primary Home'}</span>
        <span className="runway-hero__current-balance">
          {amountToPay > 0
            ? formatCurrency(amountToPay, rentDue?.currency || 'NGN')
            : 'No Pending Rent'}
        </span>
      </div>

      <div className="runway-hero__actions">
        {amountToPay > 0 ? (
          <>
            <button
              type="button"
              className="runway-hero__btn-primary"
              onClick={() => router.push(rentDue?.href || '/dashboard/pay-rent')}
            >
              <ArrowRight size={15} />
              <span>{rentDue?.isOverdue ? 'Pay Overdue Rent Now' : 'Pay Rent Now'}</span>
            </button>
            <button
              type="button"
              className="runway-hero__btn-secondary"
              onClick={() => router.push('/dashboard/savings')}
            >
              <span>Setup Next Year&apos;s Vault</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="runway-hero__btn-primary"
            onClick={() => router.push('/dashboard/savings')}
          >
            <Sparkles size={15} />
            <span>Setup Rent Savings Vault (Earn 14.5%)</span>
          </button>
        )}
      </div>
    </div>
  )
}
