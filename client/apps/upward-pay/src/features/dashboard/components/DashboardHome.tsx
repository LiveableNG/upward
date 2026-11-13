'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  ChevronRight,
  PiggyBank,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useHasMyHome, useMyHomeProperties, useAllPendingBills } from '@/features/my-home/hooks/useMyHome'
import { formatDate } from '@/lib/utils'
import { type CompletedPayment, type PendingPayment } from '../types'
import { type UserProfile } from '@/features/auth/types'
import { ActionCarousel } from './ActionCarousel'
import { isProfileSetupComplete, hasRentalInfo, hasContactDetails } from '../utils/profileCompletion'
import { GoalsDashboardOverview } from './GoalsDashboardOverview'
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

  const showActivityCenter =
    activeOrders.length > 0 ||
    Boolean(unpaidOrder) ||
    pendingPayments.length > 0 ||
    gtBills.length > 0 ||
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
            showKYC={false}
            rentReminders={propertyReminders}
            isIdentityVerified={!verificationOn || isIdentityVerified}
            skin="proto"
            showBenefitsUpsell={false}
            activeOrders={activeOrders}
            unpaidOrder={unpaidOrder}
          />
        </div>
      )}

      {/* Goals Platform Central Experience */}
      <GoalsDashboardOverview firstName={user.firstName || 'User'} />

      {/* ── Supporting Financial Infrastructure ── */}
      <section className="dash-home__finance-support">
        <div className="dash-home__finance-support-header">
          <div>
            <h3 className="dash-home__finance-support-title">Supporting Financial Tools</h3>
            <p className="dash-home__finance-support-desc">
              Dedicated tools and verified credibility designed to support your lifestyle and housing ambitions.
            </p>
          </div>
          <button
            type="button"
            className="dash-home__finance-support-see-all"
            onClick={() => router.push('/dashboard/finance')}
          >
            <span>Open Finance</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="dash-home__finance-cards">
          <div
            className="dash-home__finance-item"
            onClick={() => router.push('/dashboard/savings')}
          >
            <div className="dash-home__finance-item-icon">
              <PiggyBank size={18} color="var(--clay)" />
            </div>
            <div className="dash-home__finance-item-content">
              <h4 className="dash-home__finance-item-title">Rent Vault Reserve</h4>
              <p className="dash-home__finance-item-desc">
                Automate monthly savings and earn compounding daily returns toward your rent.
              </p>
            </div>
            <ChevronRight size={16} className="dash-home__finance-item-arrow" />
          </div>

          <div
            className="dash-home__finance-item"
            onClick={() => router.push('/dashboard/score-breakdown')}
          >
            <div className="dash-home__finance-item-icon">
              <TrendingUp size={18} color="var(--clay)" />
            </div>
            <div className="dash-home__finance-item-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h4 className="dash-home__finance-item-title">Upward Score</h4>
                <span className="dash-home__finance-score-badge">
                  {credScore} / {maxScore}
                </span>
              </div>
              <p className="dash-home__finance-item-desc">
                Verified rent and housing credibility score.
              </p>
            </div>
            <ChevronRight size={16} className="dash-home__finance-item-arrow" />
          </div>
        </div>
      </section>
    </div>
  )
}
