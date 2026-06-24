'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

import { BottomNav } from '@/features/dashboard/components/BottomNav'
import { AnnouncementManager } from '@/features/dashboard/components/AnnouncementManager'
import { RentReminderManager } from '@/features/dashboard/components/RentReminderManager'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { ProfileSetupBlocker } from '@/features/dashboard/components/ProfileSetupBlocker'
import { isProfileSetupComplete } from '@/features/dashboard/utils/profileCompletion'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { api } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, loading, user } = useAuth()
  const { data: scoreProfile } = useScoreProfile()
  const [blockerDismissed, setBlockerDismissed] = useState(false)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace(`/login?redirect=${pathname}`)
    }
  }, [loading, isLoggedIn, router, pathname])

  // Global Deep Link Handler: Mark as read if notif_id is present
  useEffect(() => {
    const notifId = searchParams?.get('notif_id')
    if (notifId && isLoggedIn) {
      api.markNotificationRead(notifId).then(() => {
        // Optionally refresh counts
      }).catch(err => console.error('Failed to auto-mark read', err))
    }
  }, [searchParams, isLoggedIn])

  if (loading) {
    return <FallbackSuspense message="Authenticating..." />
  }

  if (!isLoggedIn) {
    return <FallbackSuspense message="Redirecting to login..." />
  }

  const isDashboardHome = pathname === '/dashboard'
  const isSetupRoute = pathname?.startsWith('/dashboard/setup')
  const showProfileBlocker =
    isDashboardHome &&
    user &&
    !isProfileSetupComplete(user) &&
    !blockerDismissed

  return (
    <div className={`dashboard-layout${showProfileBlocker ? ' dashboard-layout--blocker' : ''}`}>
      {showProfileBlocker && user && (
        <ProfileSetupBlocker
          user={user}
          score={scoreProfile?.data?.score}
          profileCompletion={scoreProfile?.data?.profile?.profileCompletion}
          onSkip={() => setBlockerDismissed(true)}
        />
      )}
      {/* Desktop Global Header */}
      {!showProfileBlocker && !isSetupRoute && (
        <div className="desktop-only">
          <DashboardHeader />
        </div>
      )}

      <AnnouncementManager />
      <RentReminderManager />
      <main className="dashboard-layout__content">
        <Suspense fallback={<FallbackSuspense message="Loading..." />}>{children}</Suspense>
      </main>
      {!showProfileBlocker &&
        !isSetupRoute &&
        !pathname?.startsWith('/dashboard/notifications') &&
        !pathname?.startsWith('/dashboard/kyc') && <BottomNav />}
    </div>
  )
}

