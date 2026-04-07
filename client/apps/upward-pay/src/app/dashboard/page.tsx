/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'

import { StatStrip } from '@/features/dashboard/components/StatStrip'
import { AppInstallBanner } from '@/features/dashboard/components/AppInstallBanner'
import { AnnouncementBanner } from '@/features/dashboard/components/AnnouncementBanner'
import { RentCredibilityScore } from '@/features/dashboard/components/RentCredibilityScore'
import { ShareCredibility } from '@/features/dashboard/components/ShareCredibility'
import { SavingsGoalModal } from '@/features/dashboard/components/SavingsGoalModal'
import { RentSavingsCard } from '@/features/dashboard/components/RentSavingsCard'
import { ActionCarousel } from '@/features/dashboard/components/ActionCarousel'
import FallbackSuspense from '@/components/FallbackSuspense'

export default function DashboardPage() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })

  const [_showPayRent, setShowPayRent] = useState(false)
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false)
  const [showKYCAlert, _setShowKYCAlert] = useState(true)
  const [localDismissedBanner, setLocalDismissedBanner] = useState(false)

  const dismissAppBannerMutation = useMutation({
    mutationFn: () => api.updateProfile({ hasDismissedAppBanner: true }),
    onSuccess: () => {
      setLocalDismissedBanner(true)
    },
  })

  // Handle auth errors (expired token, etc.) by redirecting to landing
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
    // If it's an auth error, hide UI and show loader while redirecting
    if (error.toLowerCase().includes('expired') || error.toLowerCase().includes('auth')) {
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

  const { tenant, pendingPayments, completedPayments } = data
  const firstName = tenant.fullName?.split(' ')[0] || 'Tenant'
  const isNewUser = !tenant.hasCompletedOnboarding
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  const currency = completedPayments[0]?.currency || 'NGN'

  // App Install Banner visibility logic
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNative
  const shouldShowAppBanner = !isCapacitor && !tenant.hasDismissedAppBanner && !localDismissedBanner

  // Real notif count logic - combining backend notifications + pending payments
  const backendNotifCount = notifData?.notifications?.filter((n: any) => !n.read).length || 0

  const notifCount = backendNotifCount + (pendingPayments.length || 0)

  return (
    <div className="dashboard dashboard--nav-offset">
      {showSavingsGoalModal && (
        <SavingsGoalModal
          existingGoal={tenant.savingsGoals?.[0]}
          onDone={() => setShowSavingsGoalModal(false)}
          onSkip={() => setShowSavingsGoalModal(false)}
        />
      )}

      <DashboardHeader
        firstName={firstName}
        notifCount={notifCount}
        profilePic={tenant.profilePic}
      />

      <StatStrip
        completedPaymentsCount={completedPayments.length}
        totalPaid={totalPaid}
        currency={currency}
        pendingCount={pendingPayments.length}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col dashboard__col--left" />

        <div className="dashboard__col dashboard__col--right">
          {shouldShowAppBanner && (
            <AppInstallBanner onDismiss={() => dismissAppBannerMutation.mutate()} />
          )}

          <AnnouncementBanner />

          {!isNewUser && pendingPayments.length > 0 && (
            <div className="activity-center">
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
                showKYC={showKYCAlert}
                rentReminders={[]}
              />
            </div>
          )}

          {tenant.showSavings !== false && (
            <RentSavingsCard
              isNewUser={isNewUser}
              savingsBalance={tenant.savingsBalance}
              savingsGoal={tenant.savingsGoals?.[0]?.targetAmount || tenant.savingsGoal}
              autoSave={tenant.savingsGoals?.[0]?.autoSaveEnabled ?? !isNewUser}
              onConfigureGoal={() => setShowSavingsGoalModal(true)}
            />
          )}

          <RentCredibilityScore
            tenant={tenant}
            onShowPayRent={() => router.push('/dashboard/pay-rent')}
          />

          {!isNewUser && <ShareCredibility profileSlug={tenant.profileSlug} />}
        </div>
      </div>
    </div>
  )
}
