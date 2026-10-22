'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Flame,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Zap,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Landmark,
  PiggyBank,
  Home,
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { type CompletedPayment, type PendingPayment } from '../types'
import { type UserProfile } from '@/features/auth/types'
import { ActionCarousel } from './ActionCarousel'
import { RentDepositCard } from './RentDepositCard'
import { RentRunwayHero } from './RentRunwayHero'
import { MyHomeQuickHub } from './MyHomeQuickHub'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'

interface DashboardHomeProps {
  user: UserProfile
  pendingPayments: PendingPayment[]
  completedPayments: CompletedPayment[]
  credScore: number
  maxScore: number
  band: string
  rank: string
  isScorable: boolean
  streak: number
  onTimePct: number
  profileCompletion: number
  propertyReminders: Array<{
    id?: string
    property_address?: string
    rentEndDate?: string
    action?: () => void
    isCritical?: boolean
  } | null>
  isIdentityVerified: boolean
  verificationOn: boolean
  isNewUser: boolean
  notifCount: number
  anyOverdue: boolean
  showAppBanner?: boolean
  onDismissAppBanner?: () => void
  benefitsActive?: boolean
  benefitsEndsAt?: string | null
  isLoading?: boolean
}

function formatPropertyShort(address?: string): string {
  if (!address) return 'Your property'
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
  return address
}

function daysUntil(dateStr: string | Date): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getRentDue(pendingPayments: PendingPayment[], user: UserProfile) {
  const firstPending = pendingPayments[0]
  if (firstPending) {
    const dateStr = firstPending.due_date || firstPending.dueDate
    const remaining = firstPending.total_amount - (firstPending.amountPaid || 0)
    const amount = remaining > 0 ? remaining : firstPending.total_amount
    const isOverdue = dateStr ? new Date(dateStr) < new Date() : false
    const days = dateStr ? Math.abs(daysUntil(dateStr)) : 0
    let label = isOverdue ? 'Overdue' : 'Rent Due'
    let isRejected = false
    let isReviewing = false

    if (firstPending.latestProof) {
      if (firstPending.latestProof.status === 'PENDING') {
        label = 'In Review'
        isReviewing = true
      } else if (firstPending.latestProof.status === 'REJECTED') {
        label = 'Proof Rejected'
        isRejected = true
      }
    }

    return {
      amount,
      currency: firstPending.currency || 'NGN',
      address: formatPropertyShort(firstPending.property_address),
      days,
      isOverdue,
      isReviewing,
      isRejected,
      label,
      daysLabel: isOverdue ? 'OVERDUE' : 'DAYS',
      href: `/dashboard/pay-rent${firstPending.uuid ? `?paymentUuid=${firstPending.uuid}` : ''}`,
    }
  }

  const activeProps = (user.properties || []).filter((p) => !p.isPastTenancy && p.rentEndDate)
  const upcoming = activeProps
    .map((prop) => {
      const days = daysUntil(prop.rentEndDate!)
      if (days < 0) return null
      const address = prop.location
        ? [prop.location.area, prop.location.state].filter(Boolean).join(', ')
        : prop.address
      return {
        amount: prop.rentAmount || 0,
        currency: 'NGN',
        address: formatPropertyShort(address),
        days,
        isOverdue: false,
        isReviewing: false,
        isRejected: false,
        label: 'Rent Due',
        daysLabel: 'DAYS',
        href: `/dashboard/pay-rent?propertyUuid=${prop.uuid}`,
        sortKey: days,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a!.sortKey ?? 0) - (b!.sortKey ?? 0))[0]

  return upcoming || null
}

export function DashboardHome({
  user,
  pendingPayments,
  completedPayments,
  credScore,
  maxScore,
  band,
  rank,
  isScorable,
  streak,
  onTimePct,
  profileCompletion,
  propertyReminders,
  isIdentityVerified,
  verificationOn,
  isNewUser,
  notifCount,
  anyOverdue,
  benefitsActive = false,
  benefitsEndsAt = null,
  isLoading = false,
}: DashboardHomeProps) {
  const router = useRouter()
  const [isNavigatingToBreakdown, setIsNavigatingToBreakdown] = useState(false)
  const { data: rentVault } = useRentVault()

  const rentDue = getRentDue(pendingPayments, user)
  const recent = completedPayments.slice(0, 3)

  const handleScoreClick = () => {
    setIsNavigatingToBreakdown(true)
    setTimeout(() => {
      router.push('/dashboard/score-breakdown')
    }, 140)
  }

  if (isLoading) {
    return (
      <div className="dash-home animate-pulse">
        <div style={{ height: 220, background: 'var(--border)', borderRadius: 18 }} />
        <div style={{ height: 90, background: 'var(--border)', borderRadius: 14 }} />
        <div style={{ height: 180, background: 'var(--border)', borderRadius: 18 }} />
      </div>
    )
  }

  const ringPct = Math.min(100, Math.max((credScore / maxScore) * 100, 4))
  const displayBand =
    !isScorable || band?.toLowerCase().includes('not score')
      ? 'STARTER'
      : (band || 'STARTER').toUpperCase()
  const showActivityCenter =
    pendingPayments.length > 0 ||
    isNewUser ||
    propertyReminders.length > 0 ||
    (verificationOn && !isIdentityVerified)

  const activityCritical = anyOverdue

  return (
    <div className="dash-home">
      {/* 0. Optional Deposit Overpayment Refund Card */}
      <RentDepositCard />

      {/* Optional Activity / Critical Action Center */}
      {showActivityCenter && (
        <div
          className={`dash-home__activity-center activity-center ${activityCritical ? 'activity-center--critical' : ''}`}
        >
          <div className="activity-center__header">
            <h3 className="activity-center__title">
              {activityCritical ? 'CRITICAL ACTIONS' : 'Activity Center'}
            </h3>
            <button
              type="button"
              className="activity-center__see-all"
              onClick={() => router.push('/dashboard/notifications?tab=Activities')}
            >
              See all{' '}
              {notifCount > 0 && <span className="activity-center__badge">{notifCount}</span>}
            </button>
          </div>
          <ActionCarousel
            pendingPayments={pendingPayments}
            gtBills={[]}
            showKYC={isNewUser}
            rentReminders={propertyReminders}
            isIdentityVerified={!verificationOn || isIdentityVerified}
            skin="proto"
            showBenefitsUpsell={!benefitsActive}
          />
        </div>
      )}

      {/* 1. MAIN COLUMN (LEFT): Runway Hero, Score, and Actions */}
      <div className="dash-home__main">
        {/* PRIMARY HERO: Context-Aware Rent Runway & Savings Engine */}
        <RentRunwayHero rentDue={rentDue} />

        {/* PILLAR 3: Upward Rent Score & Financial Credibility */}
        <button
          type="button"
          className={`dash-home__score ${isNavigatingToBreakdown ? 'dash-home__score--clicked' : ''}`}
          onClick={handleScoreClick}
          aria-label="View score breakdown"
        >
          <div className="dash-home__score-top">
            <div>
              <div className="dash-home__score-eyebrow">Upward Rent Score</div>
              <div className="dash-home__score-value-row">
                <span className="dash-home__score-value">{credScore}</span>
                <span className="dash-home__score-max">/ {maxScore}</span>
              </div>
              <div className="dash-home__score-sub">
                {isScorable
                  ? 'Verified Rental Reputation'
                  : 'Starter Profile • Building Track Record'}
              </div>
              <span className="dash-home__score-pill">
                <span>View full breakdown</span>
                <ChevronRight size={13} className="dash-home__score-pill-arrow" />
              </span>
            </div>
            <div
              className="dash-home__score-ring"
              style={{
                background: `conic-gradient(#fff 0% ${ringPct}%, rgba(255,255,255,0.22) ${ringPct}% 100%)`,
              }}
            >
              <div className="dash-home__score-ring-inner">
                <span className="dash-home__score-band">{displayBand}</span>
                {rank && rank !== 'N/A' && <span className="dash-home__score-rank">{rank}</span>}
              </div>
            </div>
          </div>
        </button>

        {/* Behavioral Metrics Strip */}
        <div className="dash-home__metrics">
          <div className="dash-home__metric">
            <Flame
              size={18}
              className={
                streak > 0 ? 'dash-home__metric-icon--active' : 'dash-home__metric-icon--muted'
              }
            />
            <span className="dash-home__metric-val">{streak}</span>
            <span className="dash-home__metric-lbl">Payment Streak</span>
          </div>
          <div className="dash-home__metric">
            <ShieldCheck
              size={18}
              className={
                onTimePct > 0 ? 'dash-home__metric-icon--active' : 'dash-home__metric-icon--muted'
              }
            />
            <span className="dash-home__metric-val">{onTimePct}%</span>
            <span className="dash-home__metric-lbl">On-Time Rate</span>
          </div>
          <div className="dash-home__metric">
            <Zap
              size={18}
              className={
                profileCompletion > 0
                  ? 'dash-home__metric-icon--active'
                  : 'dash-home__metric-icon--muted'
              }
            />
            <span className="dash-home__metric-val">{profileCompletion}%</span>
            <span className="dash-home__metric-lbl">Profile Health</span>
          </div>
        </div>

        {/* Quick Navigation Direct Action Chips */}
        <div className="dash-home__actions">
          <button
            type="button"
            className="dash-home__action dash-home__action--secondary"
            onClick={() => router.push('/dashboard/savings')}
          >
            <Landmark size={15} style={{ marginRight: 4, verticalAlign: -2 }} />
            <span>Rent Vault</span>
          </button>
          <button
            type="button"
            className="dash-home__action dash-home__action--primary"
            onClick={() => router.push('/dashboard/pay-rent')}
          >
            <Receipt size={15} style={{ marginRight: 4, verticalAlign: -2 }} />
            <span>Pay Rent</span>
          </button>
          <button
            type="button"
            className="dash-home__action dash-home__action--secondary"
            onClick={() => router.push('/dashboard/save-for-home')}
          >
            <Home size={15} style={{ marginRight: 4, verticalAlign: -2 }} />
            <span>Save for Home</span>
          </button>
        </div>
      </div>

      {/* ASIDE COLUMN: Pillars 4 (My Home), 1 (Liquidity) & 5 (Protection) */}
      <div className="dash-home__aside">
        {/* PILLAR 4: My Home High-Frequency Living Operations */}
        <MyHomeQuickHub />

        {/* Pillar 1: Emergency Cash Advance */}
        <div className="pillar-card" onClick={() => router.push('/dashboard/savings')}>
          <div className="pillar-card__head">
            <div className="pillar-card__icon">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="pillar-card__title">Emergency Cash Advance</span>
            </div>
            <span className="pillar-card__badge">Up to 40%</span>
          </div>
          <p className="pillar-card__desc">
            Borrow instantly against your rent vault balance during unforeseen shocks. Your
            remaining principal keeps compounding at 14.5% p.a.
          </p>
          <span className="pillar-card__footer">
            <span>Access Emergency Advance</span>
            <ArrowRight size={13} />
          </span>
        </div>

        {/* Pillar 5: Tenant Protection Cover */}
        <div className="pillar-card" onClick={() => router.push('/dashboard/benefits')}>
          <div className="pillar-card__head">
            <div
              className="pillar-card__icon"
              style={{
                color: benefitsActive ? '#10b981' : 'var(--clay)',
                background: benefitsActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--clay-faint)',
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <span className="pillar-card__title">Tenant Protection Package</span>
            </div>
            <span
              className="pillar-card__badge"
              style={{
                background: benefitsActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(217, 119, 87, 0.1)',
                color: benefitsActive ? '#10b981' : 'var(--clay)',
              }}
            >
              {benefitsActive ? 'Active Cover' : 'Annual Cover'}
            </span>
          </div>
          <p className="pillar-card__desc">
            {benefitsActive
              ? `Your tenancy protection is active${benefitsEndsAt ? ` until ${formatDate(benefitsEndsAt)}` : ''}. Covers job loss, medical rent support, and eviction defense.`
              : 'Safeguard your home. Comprehensive coverage against involuntary job loss, acute medical emergencies, and legal eviction defense.'}
          </p>
          <span className="pillar-card__footer">
            <span>{benefitsActive ? 'View Active Policy' : 'Activate Account Protection'}</span>
            <ArrowRight size={13} />
          </span>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY & AUDIT TRAIL */}
      <div className="dash-home__wide">
        <div className="dash-home__section-head">
          <h2 className="dash-home__section-title">Recent Activity</h2>
          {recent.length > 0 && (
            <button
              type="button"
              className="dash-home__section-link"
              onClick={() => router.push('/dashboard/transactions')}
            >
              View all →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="dash-home__activity-empty">
            <div className="dash-home__activity-empty-icon">
              <Receipt size={24} />
            </div>
            <div className="dash-home__activity-empty-title">No transactions yet</div>
            <div className="dash-home__activity-empty-desc">
              Start your rent runway or make a payment to build your verified tenancy record.
            </div>
            <button
              type="button"
              className="dash-home__activity-empty-btn"
              onClick={() => router.push('/dashboard/savings')}
            >
              Start Rent Savings
            </button>
          </div>
        ) : (
          <div className="dash-home__activity-card">
            {recent.map((tx) => {
              const isCredit = tx.type === 'credit'
              return (
                <button
                  key={tx.uuid}
                  type="button"
                  className="dash-home__activity-item"
                  onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                >
                  <span
                    className={`dash-home__activity-item-icon ${isCredit ? 'dash-home__activity-item-icon--credit' : 'dash-home__activity-item-icon--debit'}`}
                  >
                    {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <span className="dash-home__activity-item-info">
                    <div className="dash-home__activity-item-title">{tx.company_name}</div>
                    <div className="dash-home__activity-item-meta">
                      {tx.channel || 'Paystack'} · {formatDate(tx.paid_at)} ·{' '}
                      {formatTime(tx.paid_at)}
                    </div>
                  </span>
                  <span
                    className={`dash-home__activity-item-amount ${isCredit ? 'dash-home__activity-item-amount--credit' : ''}`}
                  >
                    {isCredit ? '+' : '-'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
