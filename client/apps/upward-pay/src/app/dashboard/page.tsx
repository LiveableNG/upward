'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { StatStrip } from '@/features/dashboard/components/StatStrip'
import { DashboardHome } from '@/features/dashboard/components/DashboardHome'
import FallbackSuspense from '@/components/FallbackSuspense'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { formatDate } from '@/lib/utils'
import { Capacitor } from '@capacitor/core'
import { hasRentalInfo } from '@/features/dashboard/utils/profileCompletion'

export default function DashboardPage() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
  const { data: scoreProfile } = useScoreProfile()

  const [localDismissedBanner, setLocalDismissedBanner] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('app_banner_dismissed') === 'true'
      setLocalDismissedBanner(dismissed)
    }
  }, [])

  const handleDismissBanner = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_banner_dismissed', 'true')
      setLocalDismissedBanner(true)
    }
  }

  useEffect(() => {
    if (error && (error.toLowerCase().includes('expired') || error.toLowerCase().includes('auth'))) {
      router.push('/login')
    }
  }, [error, router])

  if (loading && !data) return <FallbackSuspense message="Loading dashboard…" />

  if (error || !data) {
    if (error?.toLowerCase().includes('expired') || error?.toLowerCase().includes('auth')) {
      return <FallbackSuspense message="Session expired. Redirecting..." />
    }
    return (
      <div className="dashboard dashboard--error">
        <div className="pay-page__error">
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={reload}>Retry</button>
        </div>
      </div>
    )
  }

  const { user, pendingPayments: rawPending, completedPayments } = data

  const pendingPayments = [...(rawPending || [])].filter((p: any) => {
    if (!p.userPropertyUuid) return true
    const prop = user.properties?.find((prop: any) => prop.uuid === p.userPropertyUuid)
    return !prop?.isPastTenancy
  }).sort((a, b) => {
    const now = new Date()
    const aDate = a.due_date || a.dueDate
    const bDate = b.due_date || b.dueDate
    const aOverdue = aDate && new Date(aDate) < now ? 1 : 0
    const bOverdue = bDate && new Date(bDate) < now ? 1 : 0
    if (aOverdue !== bOverdue) return bOverdue - aOverdue
    return new Date(aDate || 0).getTime() - new Date(bDate || 0).getTime()
  })

  const firstName = user.firstName || 'User'
  const isNewUser = !hasRentalInfo(user)
  const isIdentityVerified = user.isIdentityVerified || false
  const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const currency = completedPayments[0]?.currency || 'NGN'

  const isCapacitor =
    Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' &&
      (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'))

  const shouldShowAppBanner = !isCapacitor && !localDismissedBanner

  const backendNotifCount = notifData?.unreadCount || 0
  const pendingCount = pendingPayments.length || 0
  const notifCount = backendNotifCount + pendingCount

  const scoreData = scoreProfile?.data
  const credScore = scoreData?.score || 0
  const rank = scoreData?.rank || 'N/A'
  const band = scoreData?.band || 'unranked'
  const isScorable = scoreData?.isScorable || false
  const onTime = Math.round(scoreData?.metrics?.ptPercentage || 0)
  const streak = scoreData?.metrics?.longestStreak || 0
  const profileCompletion = scoreData?.profile?.profileCompletion || 0
  const maxScore = scoreData?.maxScore || 0

  const propertyReminders = (user.properties || [])
    .filter((prop) => !!prop.rentEndDate)
    .filter((prop) => {
      const hasPending = pendingPayments.some((p: any) => p.userPropertyUuid === prop.uuid)
      return !hasPending
    })
    .map((prop) => {
      const d = new Date(prop.rentEndDate!)
      const now = new Date()
      const isOverdue = d <= now
      if (!isOverdue) return null

      return {
        type: 'rent_reminder',
        id: prop.uuid,
        title: 'Rent Overdue',
        property_address: prop.location
          ? [prop.location.address, prop.location.area, prop.location.state, prop.location.country].filter(Boolean).join(', ')
          : prop.address || 'Property',
        rentEndDate: prop.rentEndDate,
        desc: `Rent for ${prop.location?.address || prop.location?.area || 'your property'} was due on ${formatDate(prop.rentEndDate!)}.`,
        actionLabel: 'Pay Overdue Rent',
        action: () => router.push(`/dashboard/pay-rent?propertyUuid=${prop.uuid}`),
        isCritical: isOverdue,
        bg: 'var(--error)',
      }
    })
    .filter(Boolean)

  const anyOverdue =
    pendingPayments.some((p) => {
      const dateStr = p.due_date || p.dueDate
      return dateStr && new Date(dateStr) < new Date()
    }) || propertyReminders.some((r: any) => r?.isCritical)

  return (
    <div className="dashboard dashboard--nav-offset dashboard--proto-home">
      <div className="mobile-only mobile-header-sticky">
        <DashboardHeader
          firstName={firstName}
          notifCount={notifCount}
          profilePic={user.profilePic}
        />
      </div>

      <StatStrip
        completedPaymentsCount={completedPayments.length}
        totalPaid={totalPaid}
        currency={currency}
        pendingCount={pendingPayments.length}
      />

      <DashboardHome
        user={user}
        pendingPayments={pendingPayments}
        completedPayments={completedPayments}
        credScore={credScore}
        maxScore={maxScore}
        band={band}
        rank={rank}
        isScorable={isScorable}
        streak={streak}
        onTimePct={onTime}
        profileCompletion={profileCompletion}
        propertyReminders={propertyReminders}
        isIdentityVerified={isIdentityVerified}
        verificationOn={user?.verificationOn ?? true}
        isNewUser={isNewUser}
        notifCount={notifCount}
        anyOverdue={anyOverdue}
        showAppBanner={shouldShowAppBanner}
        onDismissAppBanner={handleDismissBanner}
      />
    </div>
  )
}
