'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Receipt,
  Smartphone,
  Target,
  X,
} from 'lucide-react'
import { useHasMyHome, useMyHomeProperties, useAllPendingBills } from '@/features/my-home/hooks/useMyHome'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { AppleIcon, PlayStoreIcon } from '@/components/StoreIcons'
import { type CompletedPayment, type PendingPayment } from '../types'
import { type UserProfile } from '@/features/auth/types'
import { ActionCarousel } from './ActionCarousel'
import { UpwardGoalsInteractiveView } from '@/features/goals/components/UpwardGoalsInteractiveView'
import { useUpwardGoalsStore } from '@/features/goals/hooks/useUpwardGoalsStore'
import { UPWARD_GOAL_CATEGORIES, MAX_GOALS_PER_CATEGORY } from '@/features/goals/data/upwardGoalsSpec'
import { useTenantOrders } from '@/features/goals'

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
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
  return address
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
  benefitsActive = false,
  benefitsEndsAt = null,
  isLoading = false,
}: DashboardHomeProps) {
  const router = useRouter()
  const hasMyHome = useHasMyHome()
  const myHomeProperties = useMyHomeProperties()
  const myHomePreview = myHomeProperties[0]?.unitName || myHomeProperties[0]?.label
  const { bills: gtBills } = useAllPendingBills()
  const { store: goalsStore, getCategoryProgress } = useUpwardGoalsStore()

  const housingCat = UPWARD_GOAL_CATEGORIES.find((c) => c.id === 'housing')!
  const selectedHousingIds = goalsStore.selectedByCategory.housing || []
  const housingPct = getCategoryProgress('housing', 0)
  const housingTitles = selectedHousingIds
    .map((id) => housingCat.goals.find((g) => g.id === id)?.title)
    .filter(Boolean)
  const housingSubtitle =
    housingTitles.length > 0
      ? `${housingPct}% progress · ${housingTitles.slice(0, 2).join(', ')}${housingTitles.length > 2 ? ` +${housingTitles.length - 2}` : ''}`
      : `${housingPct}% saved towards your next rent`

  const lowerBand = (band || '').toLowerCase()
  const scoreTone =
    lowerBand.includes('strong') || lowerBand.includes('good') || lowerBand.includes('excellent') || credScore >= 700
      ? 'good'
      : lowerBand.includes('risk') || lowerBand.includes('poor') || (isScorable && credScore < 500)
        ? 'risk'
        : 'building'

  const { data: tenantOrdersData } = useTenantOrders({ take: 10 })
  const { activeOrders, unpaidOrder } = useMemo(() => {
    const orders = tenantOrdersData?.orders || []

    const getStageWeight = (status: string) => {
      switch (status) {
        case 'OUT_FOR_DELIVERY':
        case 'TECHNICIAN_EN_ROUTE':
          return 100
        case 'DISPATCHED':
          return 80
        case 'PROCESSING':
        case 'SERVICE_SCHEDULED':
          return 60
        case 'ORDER_CONFIRMED':
          return 40
        default:
          return 20
      }
    }

    // 1. Paid active in-flight orders only, sorted by stage precedence
    const paid = orders
      .filter((ord) => {
        if (ord.paymentStatus !== 'PAID') return false
        if (['CANCELLED', 'REFUNDED'].includes(ord.status)) return false
        return [
          'ORDER_CONFIRMED',
          'PROCESSING',
          'DISPATCHED',
          'OUT_FOR_DELIVERY',
          'SERVICE_SCHEDULED',
          'TECHNICIAN_EN_ROUTE',
          'DISPUTED',
        ].includes(ord.primaryStatus)
      })
      .sort((a, b) => getStageWeight(b.primaryStatus) - getStageWeight(a.primaryStatus))

    // 2. Unpaid order awaiting payment
    const unpaid = orders.find((ord) => {
      if (['CANCELLED', 'REFUNDED'].includes(ord.status)) return false
      return ord.paymentStatus !== 'PAID'
    })

    return {
      activeOrders: paid,
      unpaidOrder: unpaid,
    }
  }, [tenantOrdersData])

  if (isLoading) {
    return (
      <div className="dash-home animate-pulse">
        <div className="dash-home__main">
          <div style={{ height: '240px', backgroundColor: 'var(--border)', borderRadius: '16px', marginBottom: '24px' }}></div>
          <div style={{ height: '80px', backgroundColor: 'var(--border)', borderRadius: '16px' }}></div>
        </div>
        <div className="dash-home__aside">
          <div style={{ height: '100px', backgroundColor: 'var(--border)', borderRadius: '16px' }}></div>
        </div>
        <div className="dash-home__wide">
          <div style={{ height: '200px', backgroundColor: 'var(--border)', borderRadius: '16px', marginTop: '24px' }}></div>
        </div>
      </div>
    )
  }

  const recent = completedPayments.slice(0, 3)

  const showActivityCenter =
    activeOrders.length > 0 ||
    Boolean(unpaidOrder) ||
    pendingPayments.length > 0 ||
    gtBills.length > 0 ||
    !benefitsActive ||
    isNewUser ||
    propertyReminders.length > 0 ||
    (verificationOn && !isIdentityVerified)

  const activityCritical =
    anyOverdue || gtBills.some((bill) => bill.proof_status?.toLowerCase() === 'rejected')

  return (
    <div className="dash-home">
      {hasMyHome && (
        <button
          type="button"
          className="dash-home__benefits-card dash-home__benefits-card--tenancy"
          onClick={() => router.push('/dashboard/my-home')}
        >
          <span className="dash-home__benefits-card-icon">
            <Building2 size={18} />
          </span>
          <span className="dash-home__benefits-card-body">
            <span className="dash-home__benefits-card-title">My Home</span>
            <span className="dash-home__benefits-card-desc">
              {myHomePreview
                ? `${myHomePreview} · Complaints, visitors, bills & documents`
                : 'Complaints, visitors, bills, and documents for your tenancy'}
            </span>
          </span>
          <ChevronRight size={18} className="dash-home__benefits-card-chevron" />
        </button>
      )}
      {showActivityCenter && (
        <div className={`dash-home__activity-center activity-center ${activityCritical ? 'activity-center--critical' : ''}`}>
          <div className="activity-center__header">
            <h3 className="activity-center__title">
              {activityCritical ? 'CRITICAL ACTIONS' : 'Activity Center'}
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
            gtBills={gtBills}
            showKYC={isNewUser}
            rentReminders={propertyReminders}
            isIdentityVerified={!verificationOn || isIdentityVerified}
            skin="proto"
            showBenefitsUpsell={!benefitsActive}
            activeOrders={activeOrders}
            unpaidOrder={unpaidOrder}
          />
        </div>
      )}

      <div className="dash-home__main">
        <div
          className="dash-home__housing-hero"
          role="button"
          tabIndex={0}
          onClick={() => router.push('/dashboard/goals?category=housing')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              router.push('/dashboard/goals?category=housing')
            }
          }}
        >
          <div className="dash-home__housing-hero-body">
            <div className="dash-home__housing-hero-copy">
              <div className="dash-home__housing-hero-top">
                <button
                  type="button"
                  className={`dash-home__housing-score-badge dash-home__housing-score-badge--${scoreTone}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/dashboard/score-breakdown')
                  }}
                >
                  <span className="dash-home__housing-score-dot" />
                  <span>Score {credScore}/{maxScore}</span>
                  <ChevronRight size={12} />
                </button>
              </div>
              <h2 className="dash-home__housing-hero-title">{housingCat.title}</h2>
              <p className="dash-home__housing-hero-sub">{housingSubtitle}</p>
            </div>

            <div className="dash-home__housing-hero-ring">
              <svg viewBox="0 0 60 60" style={{ width: 60, height: 60, transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255, 255, 255, 0.24)" strokeWidth="5" />
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 25 * (Math.min(100, Math.max(0, housingPct)) / 100)} ${2 * Math.PI * 25}`}
                />
              </svg>
              <span className="dash-home__housing-hero-ring-val">{Math.round(housingPct)}%</span>
            </div>
          </div>

          <div
            className="dash-home__housing-hero-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dash-home__housing-action-btn"
              onClick={() => router.push('/dashboard/pay-rent')}
            >
              <CreditCard size={16} strokeWidth={2.2} />
              <span>Pay Rent</span>
            </button>
            <button
              type="button"
              className="dash-home__housing-action-btn"
              onClick={() => router.push('/dashboard/savings')}
            >
              <PiggyBank size={16} strokeWidth={2.2} />
              <span>Save Rent</span>
            </button>
          </div>
        </div>
      </div>

      {showAppBanner && (
        <div className="dash-home__aside">
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
              <a
                href="https://apps.apple.com/us/app/upwardpay/id6807898152"
                target="_blank"
                rel="noopener noreferrer"
                className="dash-home__app-store-btn"
              >
                <AppleIcon size={16} />
                <span>App Store</span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.goodtenants.upward"
                target="_blank"
                rel="noopener noreferrer"
                className="dash-home__app-store-btn"
              >
                <PlayStoreIcon size={16} colored />
                <span>Play Store</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="dash-home__wide">
        <UpwardGoalsInteractiveView mode="dashboard" />

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
