'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { StatStrip } from '@/features/dashboard/components/StatStrip'
import { AppInstallBanner } from '@/features/dashboard/components/AppInstallBanner'
import { AnnouncementBanner } from '@/features/dashboard/components/AnnouncementBanner'
import { UpcomingFeaturesWidget } from '@/features/dashboard/components/UpcomingFeaturesWidget'
import { RentCredibilityScore } from '@/features/dashboard/components/RentCredibilityScore'
import { ShareCredibility } from '@/features/dashboard/components/ShareCredibility'
import { ActionCarousel } from '@/features/dashboard/components/ActionCarousel'
import { RecentActivityWidget } from '@/features/dashboard/components/RecentActivityWidget'
import { CompleteProfilePopup } from '@/features/dashboard/components/CompleteProfilePopup'
import FallbackSuspense from '@/components/FallbackSuspense'

export default function DashboardPage() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })

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
    if (
      error &&
      (error.toLowerCase().includes('expired') || error.toLowerCase().includes('auth'))
    ) {
      router.push('/')
    }
  }, [error, router])

  if (loading) {
    return <FallbackSuspense message="Loading dashboard…" />
  }

  if (error || !data) {
    if (error?.toLowerCase().includes('expired') || error?.toLowerCase().includes('auth')) {
      return <FallbackSuspense message="Session expired. Redirecting..." />
    }

    return (
      <div className="dashboard dashboard--error">
        <div className="pay-page__error">
          <div className="pay-page__error-icon">
            <AlertTriangle size={32} />
          </div>
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { user, pendingPayments, completedPayments } = data
  const firstName = user.firstName || 'User'
  
  // A profile is complete if they have at least one property with address, state, country and rentEndDate
  const hasProperties = user.properties && user.properties.length > 0
  const firstProp = hasProperties ? user?.properties[0] : null
  const isProfileComplete = hasProperties && 
                           firstProp?.location?.area && 
                           firstProp?.location?.state && 
                           firstProp?.location?.country && 
                           firstProp?.rentEndDate;

  const isNewUser = !isProfileComplete

  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  const currency = completedPayments[0]?.currency || 'NGN'

  // App Install Banner visibility logic
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNative
  const shouldShowAppBanner = !isCapacitor && !localDismissedBanner

  const backendNotifCount = notifData?.unreadCount || 0
  const pendingCount = pendingPayments.length || 0
  const notifCount = backendNotifCount + pendingCount

  return (
    <div className="dashboard dashboard--nav-offset">
      <DashboardHeader
        firstName={firstName}
        notifCount={notifCount}
        profilePic={user.profilePic}
      />

      <StatStrip
        completedPaymentsCount={completedPayments.length}
        totalPaid={totalPaid}
        currency={currency}
        pendingCount={pendingPayments.length}
      />

      <div className="dashboard__main-grid">
        {/* Left Column - Main Focus (Score & Activity) */}
        <div className="dashboard__col dashboard__col--left">
          {(pendingPayments.length > 0 || isNewUser) && (
            <div className="activity-center" style={{ marginBottom: '24px' }}>
              <div className="activity-center__header">
                <h3 className="activity-center__title">Activity Center</h3>
                <button
                  className="activity-center__see-all"
                  onClick={() => router.push('/dashboard/notifications')}
                >
                  See all{' '}
                  {notifCount > 0 && <span className="activity-center__badge">{notifCount}</span>}
                </button>
              </div>
              <ActionCarousel
                pendingPayments={pendingPayments}
                showKYC={isNewUser}
                rentReminders={[]}
              />
            </div>
          )}

          <RentCredibilityScore
            user={user}
            onShowPayRent={() => router.push('/dashboard/pay-rent')}
          />
        </div>

        {/* Right Column - Secondary Actions & Insights */}
        <div className="dashboard__col dashboard__col--right">
          <div className="right-stack">
            <AnnouncementBanner />

            <RecentActivityWidget payments={completedPayments} />

            {shouldShowAppBanner && (
              <AppInstallBanner onDismiss={handleDismissBanner} />
            )}

            {!isNewUser && <ShareCredibility profileSlug={user.profileSlug} />}

            <div className="desktop-only">
              <UpcomingFeaturesWidget />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
