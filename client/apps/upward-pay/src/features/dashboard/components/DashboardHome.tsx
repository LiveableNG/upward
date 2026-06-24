'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Flame,
  History,
  Receipt,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import { normalizeSavingsGoal, setGoalPath } from '@/features/dashboard/utils/savingsGoals'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { AppleIcon, PlayStoreIcon } from '@/components/StoreIcons'
import { type CompletedPayment, type PendingPayment } from '../types'
import { type UserProfile } from '@/features/auth/types'
import { ActionCarousel } from './ActionCarousel'
import { ShareCredibility } from './ShareCredibility'
import { UpcomingFeaturesWidget } from './UpcomingFeaturesWidget'

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
}

function formatPropertyShort(address?: string): string {
  if (!address) return 'Your property'
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
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
    return {
      amount,
      currency: firstPending.currency || 'NGN',
      address: formatPropertyShort(firstPending.property_address),
      days,
      isOverdue,
      label: isOverdue ? 'Overdue' : 'Rent Due',
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
  showAppBanner = false,
  onDismissAppBanner,
}: DashboardHomeProps) {
  const router = useRouter()

  const { data: savingsGoals } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => api.getSavingsGoals(),
    staleTime: 5 * 60 * 1000,
  })

  const ringPct = Math.min(100, Math.max((credScore / maxScore) * 100, 4))
  const rentDue = getRentDue(pendingPayments, user)
  const recent = completedPayments.slice(0, 3)
  const goals = Array.isArray(savingsGoals) ? savingsGoals.map(normalizeSavingsGoal).slice(0, 2) : []

  const showActivityCenter =
    pendingPayments.length > 0 ||
    isNewUser ||
    propertyReminders.length > 0 ||
    (verificationOn && !isIdentityVerified)

  const nudgeTitle =
    streak >= 3
      ? `${streak}-payment streak — keep it going`
      : onTimePct >= 90
        ? 'Strong on-time record'
        : '3 more on-time payments'
  const nudgeDesc =
    streak >= 3
      ? 'Share your credibility with landlords.'
      : '= a stronger profile for lenders.'

  return (
    <div className="dash-home">
      {showActivityCenter && (
        <div className={`dash-home__activity-center activity-center ${anyOverdue ? 'activity-center--critical' : ''}`}>
          <div className="activity-center__header">
            <h3 className="activity-center__title">
              {anyOverdue ? 'CRITICAL ACTIONS' : 'Activity Center'}
            </h3>
            <button
              type="button"
              className="activity-center__see-all"
              onClick={() => router.push('/dashboard/notifications?tab=Activities')}
            >
              See all {notifCount > 0 && <span className="activity-center__badge">{notifCount}</span>}
            </button>
          </div>
          <ActionCarousel
            pendingPayments={pendingPayments}
            showKYC={isNewUser}
            rentReminders={propertyReminders}
            isIdentityVerified={!verificationOn || isIdentityVerified}
            skin="proto"
          />
        </div>
      )}

      <div className="dash-home__main">
        <button
          type="button"
          className="dash-home__score"
          onClick={() => router.push('/dashboard/score-breakdown')}
          aria-label="View score breakdown"
        >
          <div className="dash-home__score-top">
            <div>
              <div className="dash-home__score-eyebrow">Upward Score</div>
              <div className="dash-home__score-value-row">
                <span className="dash-home__score-value">{credScore}</span>
                <span className="dash-home__score-max">/ {maxScore}</span>
              </div>
              <div className="dash-home__score-sub">Rent Payment Score</div>
              <span className="dash-home__score-pill">View breakdown ›</span>
            </div>
            <div
              className="dash-home__score-ring"
              style={{
                background: `conic-gradient(#fff 0% ${ringPct}%, rgba(255,255,255,0.22) ${ringPct}% 100%)`,
              }}
            >
              <div className="dash-home__score-ring-inner">
                <span className="dash-home__score-band">{(band || '—').toUpperCase()}</span>
                {rank && rank !== 'N/A' && <span className="dash-home__score-rank">{rank}</span>}
              </div>
            </div>
          </div>
        </button>

        <div className="dash-home__metrics">
          <div className="dash-home__metric">
            <Flame size={18} className={streak > 0 ? 'dash-home__metric-icon--active' : 'dash-home__metric-icon--muted'} />
            <span className="dash-home__metric-val">{streak}</span>
            <span className="dash-home__metric-lbl">Streak</span>
          </div>
          <div className="dash-home__metric">
            <ShieldCheck size={18} className={onTimePct > 0 ? 'dash-home__metric-icon--active' : 'dash-home__metric-icon--muted'} />
            <span className="dash-home__metric-val">{onTimePct}%</span>
            <span className="dash-home__metric-lbl">On-time</span>
          </div>
          <div className="dash-home__metric">
            <Zap size={18} className={profileCompletion > 0 ? 'dash-home__metric-icon--active' : 'dash-home__metric-icon--muted'} />
            <span className="dash-home__metric-val">{profileCompletion}%</span>
            <span className="dash-home__metric-lbl">Profile</span>
          </div>
        </div>

        {/* <div className="dash-home__insights">
          <div className="dash-home__insight">
            <div className="dash-home__insight-head">
              <span>Reliability rating</span>
              <span>{onTimePct}%</span>
            </div>
            <div className="dash-home__goal-bar">
              <div className="dash-home__goal-fill" style={{ width: `${onTimePct}%` }} />
            </div>
          </div>
          <div className="dash-home__insight">
            <div className="dash-home__insight-head">
              <span>Score band</span>
              <span>{(band || '—').toUpperCase()}</span>
            </div>
            <div className="dash-home__goal-bar">
              <div
                className="dash-home__goal-fill"
                style={{ width: `${Math.min(100, (credScore / maxScore) * 100)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            className="dash-home__records-link"
            onClick={() => router.push('/dashboard/request-records')}
          >
            <History size={16} />
            <span>Request rent records</span>
            <ChevronRight size={16} />
          </button>
        </div> */}

        <div className="dash-home__actions">
          <button type="button" className="dash-home__action dash-home__action--primary" onClick={() => router.push('/dashboard/pay-rent')}>
            Pay Rent
          </button>
          <button type="button" className="dash-home__action dash-home__action--secondary" onClick={() => router.push('/dashboard/savings')}>
            Save Rent
          </button>
          <button type="button" className="dash-home__action dash-home__action--secondary" onClick={() => router.push('/dashboard/savings')}>
            Save Home
          </button>
        </div>

        {rentDue && (rentDue.amount > 0 || rentDue.days >= 0) && (
          <button
            type="button"
            className={`dash-home__rent-due ${rentDue.isOverdue ? 'dash-home__rent-due--overdue' : ''}`}
            onClick={() => router.push(rentDue.href)}
          >
            <div>
              <div className="dash-home__rent-due-label">{rentDue.label}</div>
              <div className="dash-home__rent-due-amount">
                {rentDue.amount > 0 ? formatCurrency(rentDue.amount, rentDue.currency) : '—'}
              </div>
              <div className="dash-home__rent-due-meta">
                {rentDue.isOverdue
                  ? `Overdue · ${rentDue.address}`
                  : `Due in ${rentDue.days} days · ${rentDue.address}`}
              </div>
            </div>
            <div className={`dash-home__rent-due-badge ${rentDue.isOverdue ? 'dash-home__rent-due-badge--overdue' : ''}`}>
              <div className={`dash-home__rent-due-days ${rentDue.isOverdue ? 'dash-home__rent-due-days--overdue' : ''}`}>
                {rentDue.days}
              </div>
              <div className={`dash-home__rent-due-days-label ${rentDue.isOverdue ? 'dash-home__rent-due-days-label--overdue' : ''}`}>
                {rentDue.daysLabel}
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="dash-home__aside">
        <div className="dash-home__section-head">
          <h2 className="dash-home__section-title">Savings Goals</h2>
          <button type="button" className="dash-home__section-link" onClick={() => router.push('/dashboard/savings/deposit')}>
            Add funds →
          </button>
        </div>
        <div className="dash-home__savings-card">
          {goals.length === 0 ? (
            <div className="dash-home__savings-empty">
              <p>Set a savings goal to start building toward rent or a home.</p>
              <button type="button" className="dash-home__savings-empty-btn" onClick={() => router.push(setGoalPath())}>
                Set a goal
              </button>
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="dash-home__goal">
                <div className="dash-home__goal-head">
                  <span className="dash-home__goal-name">{goal.name}</span>
                  <span className="dash-home__goal-amounts">
                    {formatCurrency(goal.current, 'NGN')} / {formatCurrency(goal.target, 'NGN')}
                  </span>
                </div>
                <div className="dash-home__goal-bar">
                  <div
                    className={`dash-home__goal-fill ${goal.isHome ? 'dash-home__goal-fill--teal' : ''}`}
                    style={{ width: `${goal.pct}%` }}
                  />
                </div>
                <div className="dash-home__goal-pct">{goal.pct}% funded</div>
              </div>
            ))
          )}
        </div>

        <button type="button" className="dash-home__nudge" onClick={() => router.push('/dashboard/kyc')}>
          <span className="dash-home__nudge-icon">
            <TrendingUp size={18} />
          </span>
          <span>
            <div className="dash-home__nudge-title">{nudgeTitle}</div>
            <div className="dash-home__nudge-desc">{nudgeDesc}</div>
          </span>
          <ChevronRight size={20} className="dash-home__nudge-chevron" />
        </button>

        {/* <div className="dash-home__legacy-card">
          <ShareCredibility profileSlug={user.profileSlug} />
        </div> */}

        {/* <div className="dash-home__legacy-card dash-home__legacy-card--widget">
          <UpcomingFeaturesWidget />
        </div> */}

        {showAppBanner && (
          <div className="dash-home__app-banner">
            <button type="button" className="dash-home__app-banner-dismiss" onClick={onDismissAppBanner} aria-label="Dismiss">
              <X size={16} />
            </button>
            <div className="dash-home__app-banner-icon">
              <Smartphone size={22} />
            </div>
            <h4 className="dash-home__app-banner-title">Get the Upward App</h4>
            <p className="dash-home__app-banner-desc">Manage your lease and build credit on the go.</p>
            <div className="dash-home__app-banner-btns">
              <button type="button" className="dash-home__app-store-btn">
                <AppleIcon size={16} />
                <span>App Store</span>
              </button>
              <button type="button" className="dash-home__app-store-btn">
                <PlayStoreIcon size={16} colored />
                <span>Play Store</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="dash-home__wide">
        <div className="dash-home__section-head">
          <h2 className="dash-home__section-title">Recent Activity</h2>
          {recent.length > 0 && (
            <button type="button" className="dash-home__section-link" onClick={() => router.push('/dashboard/transactions')}>
              View all →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="dash-home__activity-empty">
            <div className="dash-home__activity-empty-icon">
              <Receipt size={24} />
            </div>
            <div className="dash-home__activity-empty-title">No payments yet</div>
            <div className="dash-home__activity-empty-desc">
              Make your first payment to start building your score.
            </div>
            <button type="button" className="dash-home__activity-empty-btn" onClick={() => router.push('/dashboard/pay-rent')}>
              Pay Rent Now
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
                  <span className={`dash-home__activity-item-icon ${isCredit ? 'dash-home__activity-item-icon--credit' : 'dash-home__activity-item-icon--debit'}`}>
                    {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <span className="dash-home__activity-item-info">
                    <div className="dash-home__activity-item-title">{tx.company_name}</div>
                    <div className="dash-home__activity-item-meta">
                      {tx.channel || 'Paystack'} · {formatDate(tx.paid_at)} · {formatTime(tx.paid_at)}
                    </div>
                  </span>
                  <span className={`dash-home__activity-item-amount ${isCredit ? 'dash-home__activity-item-amount--credit' : ''}`}>
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
