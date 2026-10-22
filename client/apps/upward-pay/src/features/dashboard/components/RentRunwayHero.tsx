'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Calendar, Sparkles, TrendingUp, PlusCircle, ArrowRight, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'
import { FundVaultModal } from '@/features/savings/components/FundVaultModal'

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
  const { data: vault } = useRentVault()
  const [showFundModal, setShowFundModal] = useState(false)

  // 1. ACTIVE VAULT SCENARIO
  if (vault && vault.lock_status !== 'SETTLED' && vault.lock_status !== 'BROKEN_OUT') {
    const currentBalanceNaira = vault.current_balance_kobo / 100
    const targetAmountNaira = vault.target_amount_kobo / 100
    const accruedYieldNaira = vault.accrued_yield_kobo / 100
    const dailyRate = vault.daily_yield_rate || 0.145 / 365
    const estimatedDailyAddNaira = currentBalanceNaira * dailyRate
    const isSettlementReady = vault.days_to_unlock <= 0 || vault.lock_status === 'SETTLEMENT_READY'

    return (
      <div className="runway-hero">
        <div className="runway-hero__top-row">
          <div className="runway-hero__eyebrow">
            <Lock size={12} color="var(--skin-primary, #c2501f)" />
            <span>{isSettlementReady ? 'SETTLEMENT READY' : 'RENT VAULT · MATURITY LOCKED'}</span>
          </div>
          <span className="runway-hero__countdown-badge">
            <Calendar size={12} />
            <span>{vault.days_remaining} Days to Rent Day</span>
          </span>
        </div>

        <div className="runway-hero__amounts">
          <span className="runway-hero__target-label">
            Target: {formatCurrency(targetAmountNaira, 'NGN')} due on{' '}
            {new Date(vault.contractual_due_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
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
              {vault.target_completion_percentage}%
            </span>
          </div>
          <div className="runway-hero__progress-bar">
            <div
              className="runway-hero__progress-fill"
              style={{ width: `${Math.min(100, vault.target_completion_percentage)}%` }}
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

        <FundVaultModal
          isOpen={showFundModal}
          onClose={() => setShowFundModal(false)}
          dedicatedAccount={vault.dedicated_account}
        />
      </div>
    )
  }

  // 2. NO ACTIVE VAULT BUT RENT OBLIGATION KNOWN (> 45 DAYS TO RENT DAY)
  const hasFarAwayRent = rentDue && rentDue.days > 45
  if (hasFarAwayRent) {
    const targetAmount = rentDue.amount || 2400000
    const monthsRemaining = Math.max(1, Math.round(rentDue.days / 30))
    const monthlyDeposit = Math.round(targetAmount / monthsRemaining)
    const estimatedYieldNaira = Math.round(targetAmount * 0.145 * (rentDue.days / 365) * 0.52)

    return (
      <div className="runway-hero">
        <div className="runway-hero__top-row">
          <div className="runway-hero__eyebrow">
            <Sparkles size={12} color="var(--skin-primary, #c2501f)" />
            <span>RENT RUNWAY · 14.5% COMPOUND YIELD</span>
          </div>
          <span className="runway-hero__countdown-badge">
            <Calendar size={12} />
            <span>{rentDue.days} Days to Next Rent</span>
          </span>
        </div>

        <div className="runway-hero__amounts">
          <span className="runway-hero__target-label">
            Target Rent Obligation · {rentDue.address}
          </span>
          <span className="runway-hero__current-balance">
            {formatCurrency(targetAmount, rentDue.currency || 'NGN')}
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
            daily compounding mutual fund returns with 40% emergency cash access.
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
          <button
            type="button"
            className="runway-hero__btn-secondary"
            onClick={() => router.push(rentDue.href)}
          >
            <span>Pay Rent Early</span>
          </button>
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
