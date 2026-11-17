'use client'

import React, { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  CreditCard,
  KeyRound,
  Sofa,
} from 'lucide-react'
import { type UserProfile } from '@/features/auth/types'
import { type PendingPayment, type CompletedPayment } from '../types'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useUserGoals } from '@/features/goals/hooks/useGoals'
import { ActionCarousel } from './ActionCarousel'
import { hasRentalInfo } from '../utils/profileCompletion'
import { useHasMyHome, type GtActivityBill } from '@/features/my-home/hooks/useMyHome'
import type { TenantOrderSummaryDto, UserGoal } from '@/features/goals'
import { AppleIcon, PlayStoreIcon } from '@/components/StoreIcons'

interface HousingFirstHomeProps {
  user: UserProfile
  credScore: number
  maxScore: number
  rank?: string
  band?: string
  isScorable?: boolean
  pendingPaymentsCount: number
  pendingPayments?: PendingPayment[]
  completedPayments?: CompletedPayment[]
  gtBillsCount?: number
  gtBills?: GtActivityBill[]
  activeOrders?: TenantOrderSummaryDto[]
  unpaidOrder?: TenantOrderSummaryDto | null
  anyOverdue: boolean
  benefitsActive: boolean
  benefitsEndsAt?: string | null
  onOpenGoals?: (initialCategory?: string) => void
}

interface HousingRow {
  key: string
  icon: React.ReactNode
  title: string
  desc: string
  href: string
  badge?: string
  pinned: boolean
}

const HOUSING_EXPANDED_KEY = 'upward:housing-card-expanded'
const HOUSING_EXPANDED_EVENT = 'upward:housing-card-expanded-change'

function subscribeHousingExpanded(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(HOUSING_EXPANDED_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(HOUSING_EXPANDED_EVENT, callback)
  }
}

function getHousingExpandedSnapshot() {
  try {
    return window.localStorage.getItem(HOUSING_EXPANDED_KEY) === '1'
  } catch {
    return false
  }
}

function setHousingExpanded(expanded: boolean) {
  try {
    window.localStorage.setItem(HOUSING_EXPANDED_KEY, expanded ? '1' : '0')
  } catch {
    // Storage unavailable (private mode); preference just won't persist
  }
  window.dispatchEvent(new Event(HOUSING_EXPANDED_EVENT))
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

function renderGoalRing(pct: number, size = 38) {
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
  completedPayments = [],
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
  const hasMyHome = useHasMyHome()
  const { data: vault } = useRentVault()
  const { rates: platformRates } = usePlatformRates()
  const { data: userGoals } = useUserGoals()

  const appGoals = React.useMemo(() => {
    const active = (userGoals || []).filter((ug) => ug.status === 'ACTIVE')

    const matchCategory = (ug: UserGoal, slugs: string[]) => {
      const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
      const gSlug = (ug.goal?.slug || '').toLowerCase()
      return slugs.includes(s) || slugs.includes(gSlug)
    }

    const incomeGoal = active.find((ug) => matchCategory(ug, ['income', 'start-a-business']))
    const careerGoal = active.find((ug) => matchCategory(ug, ['career', 'work-growth', 'learn-a-skill']))
    const childrenGoal = active.find((ug) => matchCategory(ug, ['children', 'other', 'family', 'goals-for-my-children']))
    const payLessGoal = active.find((ug) => matchCategory(ug, ['pay-less', 'expenses', 'laundry', 'grocery']))

    const formatSubtitle = (goal: UserGoal | null | undefined, defaultText: string) => {
      if (!goal) return defaultText
      const title = (goal.icon ? `${goal.icon} ` : '') + (goal.title || goal.goal?.title || defaultText)
      return title
    }

    const coreCategories = [
      {
        id: 'income',
        tag: 'INCOME & FINANCIAL',
        title: 'Income & financial goals',
        desc: formatSubtitle(incomeGoal, 'Earn more & build extra income streams'),
        pct: incomeGoal?.progressPct ?? 0,
        hasGoal: Boolean(incomeGoal),
        href: '/dashboard/goals?category=income',
      },
      {
        id: 'career',
        tag: 'CAREER & PROFESSIONAL',
        title: 'Career & professional development',
        desc: formatSubtitle(careerGoal, 'Advance professionally & acquire qualifications'),
        pct: careerGoal?.progressPct ?? 0,
        hasGoal: Boolean(careerGoal),
        href: '/dashboard/goals?category=career',
      },
      {
        id: 'pay-less',
        tag: 'PAY LESS FOR STUFF',
        title: 'Pay less for stuff',
        desc: formatSubtitle(payLessGoal, 'Spend less and find ways to reduce costs'),
        pct: payLessGoal?.progressPct ?? 0,
        hasGoal: Boolean(payLessGoal),
        href: '/dashboard/goals?category=pay-less',
      },
      {
        id: 'children',
        tag: 'CHILDREN DEVELOPMENT',
        title: 'Children\'s development',
        desc: formatSubtitle(childrenGoal, 'Skills, educational interests & activities'),
        pct: childrenGoal?.progressPct ?? 0,
        hasGoal: Boolean(childrenGoal),
        href: '/dashboard/goals?category=children',
      },
    ]

    // Any other custom goals created by the user (excluding housing and lifestyle)
    const coreIds = new Set([incomeGoal?.id, careerGoal?.id, childrenGoal?.id, payLessGoal?.id].filter(Boolean))
    const extraCustom = active
      .filter((ug) => {
        const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
        if (s === 'housing' || s === 'home-utilities') return false
        return !coreIds.has(ug.id)
      })
      .map((ug) => {
        const title = (ug.icon ? `${ug.icon} ` : '') + (ug.title || ug.goal?.title || 'Custom Goal')
        return {
          id: String(ug.id || ug.uuid),
          tag: (ug.categorySlug || 'PERSONAL').replace(/-/g, ' ').toUpperCase(),
          title,
          desc: ug.notes || 'Personal milestone',
          pct: 0,
          hasGoal: true,
          href: '/dashboard/goals',
        }
      })

    return { coreCategories, extraCustom }
  }, [userGoals])

  // Housing card expanded/collapsed preference (persisted per device, hydration-safe)
  const isHousingExpanded = useSyncExternalStore(
    subscribeHousingExpanded,
    getHousingExpandedSnapshot,
    () => false,
  )

  const targetRent = vault?.target_amount_kobo
    ? vault.target_amount_kobo / 100
    : user.properties?.[0]?.rentAmount
      ? Number(user.properties[0].rentAmount)
      : 0
  const currentSaved = vault?.current_balance_kobo
    ? vault.current_balance_kobo / 100
    : 0

  // State Separation: Pre-Saving (State A) vs Active Saving Traction (State B)
  const hasStartedSaving = Boolean(vault && currentSaved > 0)

  const vaultPct =
    vault?.target_completion_percentage !== undefined && vault?.target_completion_percentage !== null
      ? Math.round(vault.target_completion_percentage)
      : targetRent > 0
        ? Math.min(100, Math.round((currentSaved / targetRent) * 100))
        : 0

  const projectedInterestTotal = vault?.pay_less_projection?.projected_yield_kobo
    ? vault.pay_less_projection.projected_yield_kobo / 100
    : 0

  const accruedYieldFormatted = vault?.accrued_yield_kobo
    ? projectedInterestTotal > 0
      ? `+${formatCurrency(vault.accrued_yield_kobo / 100, 'NGN')} earned · Interest covers ${formatCurrency(projectedInterestTotal, 'NGN')}`
      : `+${formatCurrency(vault.accrued_yield_kobo / 100, 'NGN')} returns accrued`
    : projectedInterestTotal > 0
      ? `Interest covers ${formatCurrency(projectedInterestTotal, 'NGN')} so you pay less`
      : '+₦0 returns accrued'

  const daysLeftFormatted =
    vault?.days_remaining !== undefined && vault?.days_remaining !== null
      ? `${vault.days_remaining} days left`
      : vault?.days_to_unlock !== undefined && vault?.days_to_unlock !== null
        ? `${vault.days_to_unlock} days left`
        : targetRent > 0
          ? 'Rent goal active'
          : 'Set target'

  const toggleHousingExpanded = () => {
    setHousingExpanded(!isHousingExpanded)
  }

  const hasRental = Boolean(user?.properties && user.properties.length > 0) || hasRentalInfo(user)
  const activeProperty = (user?.properties || []).find(
    (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
      !p.isPastTenancy && p.rentAmount,
  )
  const [nowMs] = useState(() => Date.now())

  const propertyWithEndDate =
    (user?.properties || []).find(
      (p: { isPastTenancy?: boolean; rentAmount?: number; rentEndDate?: string }) =>
        !p.isPastTenancy && p.rentEndDate,
    ) || user?.properties?.[0]

  const rentDueDate = propertyWithEndDate?.rentEndDate || vault?.contractual_due_date

  const daysToDueDate =
    vault?.days_remaining !== undefined && vault?.days_remaining !== null
      ? vault.days_remaining
      : vault?.days_to_unlock !== undefined && vault?.days_to_unlock !== null
        ? vault.days_to_unlock
        : rentDueDate
          ? Math.ceil((new Date(rentDueDate).getTime() - nowMs) / (1000 * 60 * 60 * 24))
          : null

  const hasDueDateSet =
    (vault?.days_remaining !== undefined && vault?.days_remaining !== null) ||
    (vault?.days_to_unlock !== undefined && vault?.days_to_unlock !== null) ||
    Boolean(rentDueDate)

  // Show pay rent if:
  // 1. User has NOT set their rental details (due date), OR
  // 2. It is within 90 days to due date (or overdue), OR
  // 3. There is an active pending invoice/payment due
  const shouldShowPayRent =
    !hasDueDateSet ||
    (daysToDueDate !== null && daysToDueDate <= 90) ||
    pendingPaymentsCount > 0

  const nextPendingPayment =
    pendingPayments && pendingPayments.length > 0 ? pendingPayments[0] : null
  const recentPayments = completedPayments.slice(0, 4)
  const pendingGtBillsCount = (gtBillsCount ?? 0) || gtBills.length

  // Secondary housing rows. Rows that need attention are pinned (always visible).
  const housingRows: HousingRow[] = [
    ...(shouldShowPayRent
      ? [
          {
            key: 'pay-rent',
            icon: <CreditCard size={16} strokeWidth={2} />,
            title: 'Pay rent',
            badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} due` : undefined,
            desc: nextPendingPayment
              ? `${formatCurrency(nextPendingPayment.total_amount, 'NGN')} due · Instant receipt`
              : 'Make my rent payment through Upward.',
            href: '/dashboard/pay-rent',
            pinned: pendingPaymentsCount > 0,
          },
        ]
      : []),
    ...(hasMyHome
      ? [
          {
            key: 'my-home',
            icon: <Home size={16} strokeWidth={2} />,
            title: 'My Home',
            badge:
              pendingGtBillsCount > 0
                ? `${pendingGtBillsCount} pending ${pendingGtBillsCount > 1 ? 'bills' : 'bill'}`
                : undefined,
            desc:
              pendingGtBillsCount > 0
                ? `${pendingGtBillsCount} pending bill${pendingGtBillsCount > 1 ? 's' : ''} to pay`
                : 'Service charge, visitors & bills',
            href: '/dashboard/my-home',
            pinned: pendingGtBillsCount > 0,
          },
        ]
      : []),
    {
      key: 'buy-a-house',
      icon: <KeyRound size={16} strokeWidth={2} />,
      title: 'Buy a house',
      desc: 'Start preparing financially to buy a house',
      href: '/dashboard/lifestyle?goal=buy-a-house',
      pinned: false,
    },
    {
      key: 'improve-my-home-feel',
      icon: <Sofa size={16} strokeWidth={2} />,
      title: 'Improve my home feel',
      desc: 'Furniture, decoration and space improvements',
      href: '/dashboard/lifestyle?goal=improve-my-home-feel',
      pinned: false,
    },
  ]
  const pinnedHousingRows = housingRows.filter((row) => row.pinned)
  const extraHousingRows = housingRows.filter((row) => !row.pinned)

  const renderHousingRow = (row: HousingRow) => (
    <button
      key={row.key}
      type="button"
      className="housing-link"
      onClick={() => router.push(row.href)}
    >
      <span className="housing-link__ico">{row.icon}</span>
      <span className="housing-link__body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h3 className="housing-link__title">{row.title}</h3>
          {row.badge && <span className="housing-link__badge-alert">{row.badge}</span>}
        </div>
        <p className="housing-link__desc">{row.desc}</p>
      </span>
      <span className="housing-link__chev">›</span>
    </button>
  )

  return (
    <div className="housing-first-home">
      {/* ── Main Column (Left on Desktop, Natural Flow on Mobile) ── */}
      <div className="housing-first-home__main">
        {/* Main Housing Card: primary goal always visible, secondary rows behind a single toggle */}
        <section
          className={`housing-acc ${isHousingExpanded ? 'housing-acc--expanded' : 'housing-acc--collapsed'}`}
          aria-label="Housing"
        >
          <div className="housing-acc__head">
            <div className="housing-acc__titles">
              <h1 className="housing-acc__title">
                {hasStartedSaving ? 'Making housing easier' : 'Make housing easier'}
              </h1>
            </div>
          </div>

          <div className="housing-acc__body">
            {/* Primary: rent savings traction (State B) or the save-rent goal (State A) */}
            {hasStartedSaving ? (
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
                  <span className="vault-card__yield">
                    {accruedYieldFormatted}
                    {vault?.is_rent_protec ? ' • Protected' : ''}
                  </span>
                  <span>{daysLeftFormatted}</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                className="housing-goal-card"
                onClick={() => router.push('/dashboard/savings')}
              >
                <div className="housing-goal-card__body">
                  <span className="housing-goal-card__tag">
                    {vault?.is_rent_protec ? 'RENT PROTEC • PROTECTED' : 'SAVE RENT'}
                  </span>
                  <h3 className="housing-goal-card__title">Pay less for my next rent</h3>
                  <p className="housing-goal-card__desc">
                    Build up savings towards my upcoming rent.
                  </p>
                </div>
                <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" style={{ flexShrink: 0 }} />
              </button>
            )}

            {/* Pinned rows: anything needing attention stays visible even when collapsed */}
            {pinnedHousingRows.map(renderHousingRow)}

            {/* Secondary rows: animate open/closed */}
            {extraHousingRows.length > 0 && (
              <div
                id="housing-acc-more"
                className="housing-acc__more"
                aria-hidden={!isHousingExpanded}
                inert={!isHousingExpanded}
              >
                <div className="housing-acc__more-inner">
                  {extraHousingRows.map(renderHousingRow)}
                </div>
              </div>
            )}
          </div>

          {extraHousingRows.length > 0 && (
            <button
              type="button"
              className="housing-acc__toggle"
              onClick={toggleHousingExpanded}
              aria-expanded={isHousingExpanded}
              aria-controls="housing-acc-more"
            >
              <span>
                {isHousingExpanded ? 'Show less' : `Show ${extraHousingRows.length} more`}
              </span>
              {isHousingExpanded ? (
                <ChevronUp size={16} strokeWidth={2.2} />
              ) : (
                <ChevronDown size={16} strokeWidth={2.2} />
              )}
            </button>
          )}
        </section>

        {/* Also on Upward Section (Other goals hub) */}
        <section className="more-areas" aria-label="Other goals">
          <div className="more-areas__head">
            <span className="more-areas__label">Also on Upward</span>
            <div className="more-areas__links">
              <button
                type="button"
                className="more-areas__link-btn"
                onClick={() => router.push('/dashboard/goals?new=true')}
              >
                + New goal
              </button>
            </div>
          </div>

          <div className="more-areas__grid">
            {appGoals.coreCategories.map((cat) => (
              <button
                key={cat.tag}
                type="button"
                className="goal-card"
                onClick={() => router.push(cat.href)}
              >
                <div className="goal-card__body">
                  <span className="goal-card__tag">{cat.tag}</span>
                  <h3 className="goal-card__title">{cat.title}</h3>
                  <p className="goal-card__desc">{cat.desc}</p>
                </div>
                <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" style={{ flexShrink: 0 }} />
              </button>
            ))}

            {appGoals.extraCustom.map((item) => (
              <button
                key={item.id}
                type="button"
                className="goal-card"
                onClick={() => router.push(item.href)}
              >
                <div className="goal-card__body">
                  <span className="goal-card__tag">{item.tag}</span>
                  <h3 className="goal-card__title">{item.title}</h3>
                  <p className="goal-card__desc">{item.desc}</p>
                </div>
                <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity (Rendered on desktop or below goals) */}
        {recentPayments.length > 0 && (
          <section className="housing-recent" aria-label="Recent Activity">
            <div className="housing-recent__head">
              <h2 className="housing-recent__title">Recent Activity</h2>
              <button
                type="button"
                className="housing-recent__link"
                onClick={() => router.push('/dashboard/transactions')}
              >
                View all →
              </button>
            </div>
            <div className="housing-recent__list">
              {recentPayments.map((tx) => {
                const isCredit = tx.type === 'credit'
                return (
                  <button
                    key={tx.uuid}
                    type="button"
                    className="housing-recent__item"
                    onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                  >
                    <span
                      className={`housing-recent__icon ${
                        isCredit ? 'housing-recent__icon--credit' : 'housing-recent__icon--debit'
                      }`}
                    >
                      {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </span>
                    <span className="housing-recent__info">
                      <div className="housing-recent__name">{tx.company_name}</div>
                      <div className="housing-recent__meta">
                        {tx.channel || 'Paystack'} · {formatDate(tx.paid_at)} · {formatTime(tx.paid_at)}
                      </div>
                    </span>
                    <span
                      className={`housing-recent__amount ${
                        isCredit ? 'housing-recent__amount--credit' : ''
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── Sidebar Column (Right on Desktop, Top Carousel on Mobile via CSS) ── */}
      <aside className="housing-first-home__sidebar">
        {/* 1. Action Alerts Carousel (Live orders, bills, KYC, bundles) */}
        <div className="dash-home__activity-center housing-activity-center activity-center" style={{ width: '100%' }}>
          <ActionCarousel
            pendingPayments={pendingPayments}
            gtBills={gtBills}
            showKYC={!hasRental}
            rentReminders={[]}
            isIdentityVerified={user?.verificationOn === false || Boolean(user?.isIdentityVerified)}
            skin="proto"
            benefitsEndsAt={benefitsEndsAt}
            activeOrders={activeOrders}
            unpaidOrder={unpaidOrder}
          />
        </div>

        {/* 2. Desktop-Only Extra Sidebar Widgets */}
        <div className="housing-first-home__sidebar-extra">
          {/* Rent Protection Status (Lives inside Rent Protec) */}
          {(vault?.is_rent_protec || benefitsActive) && (
            <div className="sidebar-widget sidebar-widget--benefits">
              <div className="sidebar-widget__head">
                <span className="sidebar-widget__icon">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </span>
                <div>
                  <h4 className="sidebar-widget__title">Rent Protec • Protected</h4>
                  <p className="sidebar-widget__desc">
                    {benefitsEndsAt
                      ? `Active coverage through ${formatDate(benefitsEndsAt)}`
                      : 'AXA rent protection active with your Rent Protec vault'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="sidebar-widget__action-btn"
                onClick={() => router.push('/dashboard/savings')}
              >
                View Rent Protec
              </button>
            </div>
          )}

          {/* Upward Mobile App Download Promo */}
          <div className="sidebar-widget sidebar-widget--app">
            <div className="sidebar-widget__head">
              <span className="sidebar-widget__icon sidebar-widget__icon--app">
                <Smartphone size={18} />
              </span>
              <div>
                <h4 className="sidebar-widget__title">Get the Upward App</h4>
                <p className="sidebar-widget__desc">Manage rent and build credit on the go.</p>
              </div>
            </div>
            <div className="sidebar-widget__store-row">
              <a
                href="https://apps.apple.com/us/app/upwardpay/id6807898152"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-widget__store-btn"
              >
                <AppleIcon size={14} />
                <span>App Store</span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.goodtenants.upward"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-widget__store-btn"
              >
                <PlayStoreIcon size={14} colored />
                <span>Play Store</span>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
