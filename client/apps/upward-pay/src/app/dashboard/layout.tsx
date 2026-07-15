'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

import dynamic from 'next/dynamic'
import { BottomNav } from '@/features/dashboard/components/BottomNav'
import { FeaturesMenuProvider } from '@/features/dashboard/components/FeaturesMenuContext'
import { AnnouncementManager } from '@/features/dashboard/components/AnnouncementManager'
import { RentReminderManager } from '@/features/dashboard/components/RentReminderManager'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { isProfileSetupComplete } from '@/features/dashboard/utils/profileCompletion'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'

const AnnouncementManager = dynamic(() => import('@/features/dashboard/components/AnnouncementManager').then(mod => mod.AnnouncementManager), { ssr: false })
const RentReminderManager = dynamic(() => import('@/features/dashboard/components/RentReminderManager').then(mod => mod.RentReminderManager), { ssr: false })
const ProfileSetupBlocker = dynamic(() => import('@/features/dashboard/components/ProfileSetupBlocker').then(mod => mod.ProfileSetupBlocker), { ssr: false })
import { api } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, loading, user } = useAuth()
  const { data: scoreProfile } = useScoreProfile()
  const [blockerDismissed, setBlockerDismissed] = useState(false)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null



  // Global Deep Link Handler: Mark as read if notif_id is present
  useEffect(() => {
    const notifId = searchParams?.get('notif_id')
    if (notifId && isLoggedIn) {
      api.markNotificationRead(notifId).then(() => {
        // Optionally refresh counts
      }).catch(err => console.error('Failed to auto-mark read', err))
    }
  }, [searchParams, isLoggedIn])

  if (!loading && !isLoggedIn) {
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
    <FeaturesMenuProvider>
      <div className={`dashboard-layout${showProfileBlocker ? ' dashboard-layout--blocker' : ''}`}>
      {showProfileBlocker && user && (
        <ProfileSetupBlocker
          user={user}
          score={scoreProfile?.data?.score}
          maxScore={scoreProfile?.data?.maxScore}
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
    </FeaturesMenuProvider>
  )
}

