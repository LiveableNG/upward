'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAllPendingBills } from '@/features/my-home/hooks/useMyHome'
import { type CompletedPayment, type PendingPayment } from '../types'
import { type UserProfile } from '@/features/auth/types'
import { HousingFirstHome } from './HousingFirstHome'
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

  return (
    <HousingFirstHome
      user={user}
      credScore={credScore}
      maxScore={maxScore}
      rank={rank}
      band={band}
      isScorable={isScorable}
      pendingPaymentsCount={pendingPayments.length}
      pendingPayments={pendingPayments}
      completedPayments={completedPayments}
      gtBillsCount={gtBills.length}
      gtBills={gtBills}
      activeOrders={activeOrders}
      unpaidOrder={unpaidOrder}
      anyOverdue={anyOverdue}
      benefitsActive={benefitsActive}
      benefitsEndsAt={benefitsEndsAt}
      onOpenGoals={(cat) => router.push(cat ? `/dashboard/goals?cat=${cat}` : '/dashboard/goals')}
    />
  )
}
