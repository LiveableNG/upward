'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { useHasMyHome, useMyHomeProperties, useAllPendingBills } from '@/features/my-home/hooks/useMyHome'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { AppleIcon, PlayStoreIcon } from '@/components/StoreIcons'
import { type CompletedPayment, type PendingPayment } from '../types'
import { type UserProfile } from '@/features/auth/types'
import { ActionCarousel } from './ActionCarousel'
import { ShareCredibility } from './ShareCredibility'
import { UpcomingFeaturesWidget } from './UpcomingFeaturesWidget'
import { ExclusiveHomesBrowseLink } from './exclusive-homes/ExclusiveHomesPromo'
import { isSavingsWalletEnabled } from '../utils/savingsWallet'
import { isProfileSetupComplete, hasRentalInfo, hasContactDetails } from '../utils/profileCompletion'
import { RentDepositCard } from './RentDepositCard'
import {
  LifestyleGoalsWidget,
  useTenantOrders,
  type TenantOrderSummaryDto,
} from '@/features/goals'

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
  const savingsEnabled = isSavingsWalletEnabled(user)
  const hasMyHome = useHasMyHome()
  const myHomeProperties = useMyHomeProperties()
  const myHomePreview = myHomeProperties[0]?.unitName || myHomeProperties[0]?.label
  const { bills: gtBills } = useAllPendingBills()
  const [isNavigatingToBreakdown, setIsNavigatingToBreakdown] = useState(false)

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

  const handleScoreClick = () => {
    setIsNavigatingToBreakdown(true)
    setTimeout(() => {
      router.push('/dashboard/score-breakdown')
    }, 140)
  }

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

  const ringPct = Math.min(100, Math.max((credScore / maxScore) * 100, 4))
  const recent = completedPayments.slice(0, 3)

  const showActivityCenter =
    activeOrders.length > 0 ||
    Boolean(unpaidOrder) ||
    pendingPayments.length > 0 ||
    gtBills.length > 0 ||
    isNewUser ||
    propertyReminders.length > 0 ||
    (verificationOn && !isIdentityVerified)

  const activityCritical =
    anyOverdue || gtBills.some((bill) => bill.proof_status?.toLowerCase() === 'rejected')

  const nudgeTitle =
    streak >= 3
      ? `${streak}-payment streak — keep it going`
      : onTimePct >= 90
        ? 'Strong on-time record'
        : '3 more on-time payments'
  const nudgeDesc =
    streak >= 3
      ? 'Share your credibility with landlords.'
      : '= a stronger profile for landlords.'

  return (
    <div className="dash-home">
      {!isProfileSetupComplete(user) && (
        <button
          type="button"
          className="dash-home__benefits-card"
          style={{ background: 'var(--shell-tint)', borderColor: 'var(--border)' }}
          onClick={() => {
            if (typeof window !== 'undefined' && user?.uuid) {
              sessionStorage.removeItem(`upward_profile_setup_skipped_${user.uuid}`)
              localStorage.removeItem(`upward_profile_setup_skipped_${user.uuid}`)
              window.location.reload()
            }
          }}
        >
          <span className="dash-home__benefits-card-icon" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}>
            <Target size={18} />
          </span>
          <span className="dash-home__benefits-card-body">
            <span className="dash-home__benefits-card-title">Complete your profile setup</span>
            <span className="dash-home__benefits-card-desc">
              {!hasRentalInfo(user)
                ? 'Add rental details to activate your rent payment passport'
                : !hasContactDetails(user)
                  ? 'Add phone and date of birth to complete verification'
                  : 'Set your lifestyle goals to personalize your rewards'}
              {' · Resume setup'}
            </span>
          </span>
          <ChevronRight size={18} className="dash-home__benefits-card-chevron" />
        </button>
      )}
      {/* <RentDepositCard /> */}
      <button
        type="button"
        className={`dash-home__benefits-card ${benefitsActive ? 'is-active' : ''}`}
        onClick={() => router.push('/dashboard/benefits')}
      >
        <span className="dash-home__benefits-card-icon">
          <ShieldCheck size={18} />
        </span>
        <span className="dash-home__benefits-card-body">
          <span className="dash-home__benefits-card-title">
            {benefitsActive ? "You're covered" : 'Add account protection'}
          </span>
          <span className="dash-home__benefits-card-desc">
            {benefitsActive
              ? benefitsEndsAt
                ? `Renews ${formatDate(benefitsEndsAt)} · View benefits`
                : 'Upward Benefits is active · View benefits'
              : 'Annual cover for your Upward account · Activate'}
          </span>
        </span>
        <ChevronRight size={18} className="dash-home__benefits-card-chevron" />
      </button>
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
        <button
          type="button"
          className={`dash-home__score ${isNavigatingToBreakdown ? 'dash-home__score--clicked' : ''}`}
          onClick={handleScoreClick}
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
              <span className="dash-home__score-pill">
                <span>View breakdown</span>
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
                <span className="dash-home__score-band">{(band || '—').toUpperCase()}</span>
                {rank && rank !== 'N/A' && <span className="dash-home__score-rank">{rank}</span>}
              </div>
            </div>
          </div>
        </button>

        <div className="dash-home__actions">
          <button
            type="button"
            className="dash-home__action"
            onClick={() => router.push('/dashboard/pay-rent')}
          >
            <span className="dash-home__action-icon">
              <CreditCard size={18} strokeWidth={2.2} />
            </span>
            <span className="dash-home__action-lbl">Pay Rent</span>
          </button>
          <button
            type="button"
            className="dash-home__action"
            onClick={() => router.push('/dashboard/savings')}
          >
            <span className="dash-home__action-icon">
              <PiggyBank size={18} strokeWidth={2.2} />
            </span>
            <span className="dash-home__action-lbl">Save Rent</span>
          </button>
          <button
            type="button"
            className="dash-home__action"
            onClick={() => router.push('/dashboard/lifestyle')}
          >
            <span className="dash-home__action-icon">
              <Target size={18} strokeWidth={2.2} />
            </span>
            <span className="dash-home__action-lbl">Living Goals</span>
          </button>
        </div>
      </div>

      <div className="dash-home__aside">
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
        )}
      </div>

      <div className="dash-home__wide">
        <LifestyleGoalsWidget />

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
