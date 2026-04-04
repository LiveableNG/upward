'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
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
  const { data, loading, error, reload, notifications, setNotifications } = useDashboard()

  const [_showPayRent, setShowPayRent] = useState(false)
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false)
  const [dismissedAppBanner, setDismissedAppBanner] = useState(false)
  const [showKYCAlert, _setShowKYCAlert] = useState(true)

  if (loading) {
    return <FallbackSuspense message="Loading dashboard…" />
  }

  if (error || !data) {
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

  // Real notif count logic
  const notifCount = isNewUser
    ? notifications.length + pendingPayments.length
    : (pendingPayments.length || 0) + (showKYCAlert ? 1 : 0)

  return (
    <div className="dashboard dashboard--nav-offset">
      {showSavingsGoalModal && (
        <SavingsGoalModal
          onDone={() => setShowSavingsGoalModal(false)}
          onSkip={() => setShowSavingsGoalModal(false)}
        />
      )}

      <DashboardHeader firstName={firstName} notifCount={notifCount} />

      <StatStrip
        completedPaymentsCount={completedPayments.length}
        totalPaid={totalPaid}
        currency={currency}
        pendingCount={pendingPayments.length}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col dashboard__col--left" />

        <div className="dashboard__col dashboard__col--right">
          {isNewUser && !dismissedAppBanner && (
            <AppInstallBanner onDismiss={() => setDismissedAppBanner(true)} />
          )}

          {isNewUser && notifications.length > 0 && (
            <AnnouncementBanner
              notifications={notifications}
              onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
            />
          )}

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

          <RentSavingsCard
            isNewUser={isNewUser}
            savingsBalance={tenant.savingsBalance}
            savingsGoal={tenant.savingsGoal}
            autoSave={!isNewUser}
            onConfigureGoal={() => setShowSavingsGoalModal(true)}
          />

          <RentCredibilityScore
            isNewUser={isNewUser}
            credScore={isNewUser ? 0 : 882}
            credPercentage={isNewUser ? 0 : 88.2}
            onShowPayRent={() => setShowPayRent(true)}
            onShowSavingsGoal={() => setShowSavingsGoalModal(true)}
          />

          {!isNewUser && <ShareCredibility />}
        </div>
      </div>
    </div>
  )
}
