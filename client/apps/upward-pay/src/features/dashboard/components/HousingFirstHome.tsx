'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  PiggyBank,
  ShieldCheck,
  Home,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { type UserProfile } from '@/features/auth/types'
import { type PendingPayment } from '../types'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useUserGoals } from '@/features/goals/hooks/useGoals'
import { ActionCarousel } from './ActionCarousel'
import { isProfileSetupComplete, hasRentalInfo } from '../utils/profileCompletion'
import type { GtActivityBill } from '@/features/my-home/hooks/useMyHome'
import type { TenantOrderSummaryDto } from '@/features/goals'

interface HousingFirstHomeProps {
  user: UserProfile
  credScore: number
  maxScore: number
  rank?: string
  band?: string
  isScorable?: boolean
  pendingPaymentsCount: number
  pendingPayments?: PendingPayment[]
  gtBillsCount?: number
  gtBills?: GtActivityBill[]
  activeOrders?: TenantOrderSummaryDto[]
  unpaidOrder?: TenantOrderSummaryDto | null
  anyOverdue: boolean
  benefitsActive: boolean
  benefitsEndsAt?: string | null
  onOpenGoals?: (initialCategory?: string) => void
}

function renderScoreRing(score: number, maxScore: number, size = 42) {
  const max = maxScore || 900
  const val = score || 0
  const pct = Math.min(100, Math.max(4, Math.round((val / max) * 100)))

  return (
    <div
      className="score-pill__ring"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: `conic-gradient(#fff 0% ${pct}%, rgba(255, 255, 255, 0.25) ${pct}% 100%)`,
        flexShrink: 0,
      }}
    >
      <div
        className="score-pill__ring-inner"
        style={{
          width: size - 10,
          height: size - 10,
          borderRadius: '50%',
          background: 'var(--skin-primary, #c2501f)',
        }}
      />
    </div>
  )
}

function renderGoalRing(pct: number, size = 40) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const filled = circ * (Math.min(100, Math.max(0, pct)) / 100)
  const isFilled = pct > 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ede8e2"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFilled ? 'var(--clay, #c2501f)' : '#ede8e2'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: '9.5px',
          fontWeight: 800,
          color: 'var(--text)',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

export function HousingFirstHome({
  user,
  credScore,
  maxScore,
  rank,
  band,
  isScorable,
  pendingPaymentsCount,
  pendingPayments = [],
  gtBillsCount,
  gtBills = [],
  activeOrders,
  unpaidOrder,
  anyOverdue,
  benefitsActive,
  benefitsEndsAt,
  onOpenGoals,
}: HousingFirstHomeProps) {
  const router = useRouter()
  const { data: vault } = useRentVault()
  const { data: userGoals } = useUserGoals()

  const displayGoals = React.useMemo(() => {
    if (userGoals && userGoals.length > 0) {
      const nonHousing = userGoals.filter(
        (g) => (g.categorySlug || g.goal?.category?.slug) !== 'housing',
      )
      if (nonHousing.length > 0) {
        return nonHousing.slice(0, 3).map((g) => {
          const title = (g.icon ? `${g.icon} ` : '') + (g.title || g.goal?.title || 'Goal')
          const cat = g.categorySlug || g.goal?.category?.title || g.goal?.category?.name || 'Upward Goal'
          let subtitle = cat
          if (g.durationDays) {
            const months = Math.round(g.durationDays / 30)
            subtitle += months >= 1 ? ` · ${months} months` : ` · ${g.durationDays} days`
          } else if (g.targetAmountKobo) {
            const amt = Number(g.targetAmountKobo) / 100
            subtitle += ` · ₦${Math.round(amt).toLocaleString('en-NG')}`
          }
          return {
            id: String(g.id || g.uuid),
            title,
            subtitle,
            pct: g.progressPct || 0,
            categorySlug: g.categorySlug || g.goal?.category?.slug || 'all',
          }
        })
      }
    }
    return []
  }, [userGoals])

  // Housing section modes: 'default' | 'compact' | 'full'
  const [housingMode, setHousingMode] = useState<'default' | 'compact' | 'full'>('default')

  const targetRent = vault?.target_amount_kobo
    ? vault.target_amount_kobo / 100
    : user.properties?.[0]?.rentAmount
      ? Number(user.properties[0].rentAmount)
      : 0
  const currentSaved = vault?.current_balance_kobo
    ? vault.current_balance_kobo / 100
    : 0
  const vaultPct =
    vault?.target_completion_percentage !== undefined && vault?.target_completion_percentage !== null
      ? Math.round(vault.target_completion_percentage)
      : targetRent > 0
        ? Math.min(100, Math.round((currentSaved / targetRent) * 100))
        : 0

  const accruedYieldFormatted = vault?.accrued_yield_kobo
    ? `+${formatCurrency(vault.accrued_yield_kobo / 100, 'NGN')} returns accrued`
    : '+₦0 returns accrued'

  const daysLeftFormatted =
    vault?.days_remaining !== undefined && vault?.days_remaining !== null
      ? `${vault.days_remaining} days left`
      : vault?.days_to_unlock !== undefined && vault?.days_to_unlock !== null
        ? `${vault.days_to_unlock} days left`
        : targetRent > 0
          ? 'Rent goal active'
          : 'Set target'

  // Determine top pending payment details for outstanding payment alert chip
  const firstPending = pendingPayments && pendingPayments.length > 0 ? pendingPayments[0] : null
  const hasOutstandingPayment = !!firstPending
  const pendingAmount = firstPending
    ? (firstPending.total_amount ?? (firstPending as any).amount ?? 0)
    : 0
  const pendingAmountFormatted = firstPending
    ? formatCurrency(pendingAmount, firstPending.currency || 'NGN')
    : ''
  const pendingDueDate = firstPending?.due_date
    ? formatDate(firstPending.due_date)
    : ''

  const toggleCollapse = () => {
    setHousingMode((prev) => (prev === 'compact' ? 'default' : 'compact'))
  }

  const toggleExpand = () => {
    setHousingMode((prev) => (prev === 'full' ? 'default' : 'full'))
  }

  const hasRental = Boolean(user?.properties && user.properties.length > 0) || hasRentalInfo(user)

  return (
    <div className="housing-first-home">
      {/* 1. Action Alerts Carousel (Live orders, bills, KYC, bundles) */}
      <div className="dash-home__activity-center activity-center" style={{ width: '100%' }}>
        <ActionCarousel
          pendingPayments={pendingPayments}
          gtBills={gtBills}
          showKYC={!hasRental}
          rentReminders={[]}
          isIdentityVerified={user?.verificationOn === false || Boolean(user?.isVerified)}
          skin="proto"
          showBenefitsUpsell={!benefitsActive}
          benefitsEndsAt={benefitsEndsAt}
          activeOrders={activeOrders}
          unpaidOrder={unpaidOrder}
        />
      </div>

      {/* 2. Main Accordion Card: "Making housing easier" */}
      <section
        className={`housing-acc housing-acc--${housingMode}`}
        aria-label="Housing"
      >
        <div className="housing-acc__head">
          <div className="housing-acc__titles">
            <h1 className="housing-acc__title">Making housing easier</h1>
            <span className="housing-acc__tag">Housing goals</span>
          </div>
          <div className="housing-acc__controls">
            <button
              type="button"
              className="housing-acc__ctrl"
              onClick={toggleCollapse}
              aria-label={housingMode === 'compact' ? 'Show more' : 'Show less'}
              title={housingMode === 'compact' ? 'Show more' : 'Show less'}
            >
              {housingMode === 'compact' ? (
                <ChevronDown size={16} strokeWidth={2} />
              ) : (
                <ChevronUp size={16} strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              className={`housing-acc__ctrl ${housingMode === 'full' ? 'is-active' : ''}`}
              onClick={toggleExpand}
              aria-label={housingMode === 'full' ? 'Exit full screen' : 'Expand housing'}
              title={housingMode === 'full' ? 'Exit full screen' : 'Expand housing'}
            >
              {housingMode === 'full' ? (
                <Minimize2 size={15} strokeWidth={2} />
              ) : (
                <Maximize2 size={15} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* 3 Action Tiles: Pay Rent | Save Rent | Insurance */}
        <div className="housing-acc__actions">
          <button
            type="button"
            className="quick-action"
            onClick={() => router.push('/dashboard/pay-rent')}
          >
            <span className="quick-action__icon">
              <CreditCard size={18} strokeWidth={2} />
            </span>
            <span className="quick-action__lbl">Pay Rent</span>
          </button>

          <button
            type="button"
            className="quick-action"
            onClick={() => router.push('/dashboard/savings')}
          >
            <span className="quick-action__icon">
              <PiggyBank size={18} strokeWidth={2} />
            </span>
            <span className="quick-action__lbl">Save Rent</span>
          </button>

          <button
            type="button"
            className="quick-action"
            onClick={() => router.push('/dashboard/benefits')}
          >
            <span className="quick-action__icon">
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <span className="quick-action__lbl">Insurance</span>
          </button>
        </div>

        {/* Upward Score Banner (Orange/Clay) in default / compact mode */}
        {housingMode !== 'full' && (
          <button
            type="button"
            className="score-pill"
            onClick={() => router.push('/dashboard/score-breakdown')}
            aria-label="View score breakdown"
          >
            <div className="score-pill__left">
              <div className="score-pill__label">UPWARD SCORE</div>
              <div className="score-pill__value">
                {credScore || 0} <span>/ {maxScore || 900}</span>
              </div>
              <div className="score-pill__meta">
                Rent Payment Score · {isScorable ? `${rank || 'Good'} standing` : 'Not scoreable yet'}
              </div>
            </div>
            {renderScoreRing(credScore || 0, maxScore || 900, 42)}
          </button>
        )}

        {/* Accordion Body: Vault Progress + My Home + Full Links */}
        {housingMode !== 'compact' && (
          <div className="housing-acc__body">
            {/* Full Score Banner (Shown in full mode) */}
            {housingMode === 'full' && (
              <button
                type="button"
                className="score-full"
                onClick={() => router.push('/dashboard/score-breakdown')}
              >
                <div className="score-full__top">
                  <div>
                    <div className="score-full__eyebrow">UPWARD SCORE</div>
                    <div className="score-full__value-row">
                      <span className="score-full__value">{credScore || 0}</span>
                      <span className="score-full__max">/ {maxScore || 900}</span>
                    </div>
                    <div className="score-full__sub">Rent Payment Score</div>
                    <span className="score-full__pill">View breakdown ›</span>
                  </div>
                  <div className="score-full__ring">
                    <div className="score-full__ring-inner">
                      <span>{isScorable ? `${rank || 'Good'} standing` : 'Not scoreable yet'}</span>
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Rent Savings Progress Card */}
            <button
              type="button"
              className="vault-card"
              onClick={() => router.push('/dashboard/savings')}
            >
              <div className="vault-card__top">
                <div>
                  <span className="vault-card__amount">
                    {formatCurrency(currentSaved, 'NGN')}
                  </span>
                  <span className="vault-card__target">
                    {' '}of {formatCurrency(targetRent, 'NGN')}
                  </span>
                </div>
                <span className="vault-card__pct">{vaultPct}%</span>
              </div>
              <div className="vault-card__track">
                <div className="vault-card__fill" style={{ width: `${vaultPct}%` }} />
              </div>
              <div className="vault-card__meta">
                <span className="vault-card__yield">{accruedYieldFormatted}</span>
                <span>{daysLeftFormatted}</span>
              </div>
            </button>

            {/* My Home row */}
            <button
              type="button"
              className="housing-link"
              onClick={() => router.push('/dashboard/my-home')}
            >
              <span className="housing-link__ico">
                <Home size={16} strokeWidth={2} />
              </span>
              <span className="housing-link__body">
                <h3 className="housing-link__title">My Home</h3>
                <p className="housing-link__desc">
                  Complaints, visitors, bills and documents
                </p>
              </span>
              <span className="housing-link__chev">›</span>
            </button>

            {/* Additional links when in Full mode */}
            {housingMode === 'full' && (
              <>
                <button
                  type="button"
                  className="housing-link"
                  onClick={() => router.push('/dashboard/lifestyle')}
                >
                  <span className="housing-link__ico">
                    <Home size={16} strokeWidth={2} />
                  </span>
                  <span className="housing-link__body">
                    <h3 className="housing-link__title">Prepare towards owning a home</h3>
                    <p className="housing-link__desc">Education, events and a cooperative path</p>
                  </span>
                  <span className="housing-link__chev">›</span>
                </button>

                <button
                  type="button"
                  className="housing-link"
                  onClick={() => router.push('/dashboard/lifestyle')}
                >
                  <span className="housing-link__ico">
                    <Home size={16} strokeWidth={2} />
                  </span>
                  <span className="housing-link__body">
                    <h3 className="housing-link__title">Save towards or buy furniture</h3>
                    <p className="housing-link__desc">Furnish your apartment from the marketplace</p>
                  </span>
                  <span className="housing-link__chev">›</span>
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* 3. Also on Upward Section (Directly below housing accordion) */}
      {housingMode !== 'full' && (
        <section className="more-areas" aria-label="Other goals">
          <div className="more-areas__head">
            <span className="more-areas__label">Also on Upward</span>
            <div className="more-areas__links">
              <button
                type="button"
                className="more-areas__link-btn"
                onClick={() => router.push('/dashboard/goals')}
              >
                See all
              </button>
              <button
                type="button"
                className="more-areas__link-btn"
                onClick={() => router.push('/dashboard/goals?new=true')}
              >
                + New goal
              </button>
            </div>
          </div>

          {displayGoals.length > 0 ? (
            displayGoals.map((item) => (
              <button
                key={item.id}
                type="button"
                className="goal-card"
                onClick={() => router.push('/dashboard/goals')}
              >
                <div className="goal-card__body">
                  <h3 className="goal-card__title">{item.title}</h3>
                  <p className="goal-card__desc">{item.subtitle}</p>
                </div>
                {renderGoalRing(item.pct, 40)}
              </button>
            ))
          ) : (
            <button
              type="button"
              className="goal-card"
              onClick={() => router.push('/dashboard/goals?new=true')}
            >
              <div className="goal-card__body">
                <h3 className="goal-card__title">Explore other goals</h3>
                <p className="goal-card__desc">Set targets for wellness, career, or smart living</p>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--clay, #c2501f)', paddingRight: '8px' }}>
                + Add goal
              </span>
            </button>
          )}
        </section>
      )}
    </div>
  )
}
