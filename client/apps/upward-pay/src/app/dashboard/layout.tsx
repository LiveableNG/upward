'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

import dynamic from 'next/dynamic'
import { BottomNav } from '@/features/dashboard/components/BottomNav'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { hasRentalInfo, isProfileSetupComplete } from '@/features/dashboard/utils/profileCompletion'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { useRentalExperiment } from '@/features/dashboard/setup/hooks/useRentalExperiment'
import { sessionTracker } from '@/lib/sessionTracker'

const AnnouncementManager = dynamic(() => import('@/features/dashboard/components/AnnouncementManager').then(mod => mod.AnnouncementManager), { ssr: false })
const RentReminderManager = dynamic(() => import('@/features/dashboard/components/RentReminderManager').then(mod => mod.RentReminderManager), { ssr: false })
const ProfileSetupBlocker = dynamic(() => import('@/features/dashboard/components/ProfileSetupBlocker').then(mod => mod.ProfileSetupBlocker), { ssr: false })
const TermsAcceptanceModal = dynamic(() => import('@/features/auth/components/TermsAcceptanceModal').then(mod => mod.TermsAcceptanceModal), { ssr: false })
import { PageTransition } from '@/components/common/PageTransition'
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton'
import { api } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, loading, user, isPinLocked } = useAuth()
  const { data: scoreProfile } = useScoreProfile()
  const [blockerDismissed, setBlockerDismissed] = useState(false)
  const dashboardEnteredTrackedRef = useRef(false)

  const { variant, isRequired, isLoading: isExperimentLoading } = useRentalExperiment()
  const hasRental = hasRentalInfo(user)

  // Stale local storage skip state must NOT override the required variant
  const isSkippedInStorage =
    typeof window !== 'undefined' && user?.uuid
      ? localStorage.getItem(`upward_profile_setup_skipped_${user.uuid}`) === 'true'
      : false

  const isDismissed = isRequired ? false : (blockerDismissed || isSkippedInStorage)

  const handleSkipBlocker = () => {
    if (typeof window !== 'undefined' && user?.uuid) {
      localStorage.setItem(`upward_profile_setup_skipped_${user.uuid}`, 'true')
    }
    setBlockerDismissed(true)
  }

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

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !isLoggedIn && !isPinLocked) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login'
      router.replace(redirectUrl)
    }
  }, [loading, isLoggedIn, isPinLocked, router, pathname])

  if (!loading && !isLoggedIn && !isPinLocked) {
    return <FallbackSuspense message="Redirecting to login..." />
  }

  const isDashboardHome = pathname === '/dashboard'
  const isHomeRequestRoute = pathname?.startsWith('/dashboard/exclusive-homes/request')
  const showTermsGate = user && !user.termsAcceptedAt

  // Routes exempt from the required rental gate to allow completing setup, account management, and legal acceptance
  const isSetupRoute = pathname?.startsWith('/dashboard/setup')
  const isProfileRoute = pathname?.startsWith('/dashboard/me')
  const isNotifRoute = pathname?.startsWith('/dashboard/notifications')
  const isKycRoute = pathname?.startsWith('/dashboard/verify-identity') || pathname?.startsWith('/dashboard/kyc')
  const isExemptRoute = isSetupRoute || isProfileRoute || isNotifRoute || isKycRoute
  const showProfileBlocker =
    !showTermsGate &&
    user &&
    !isExperimentLoading &&
    (isRequired
      ? !hasRental && !isExemptRoute
      : isDashboardHome && !isProfileSetupComplete(user) && !isDismissed)

  useEffect(() => {
    if (!loading && isLoggedIn && user && !showProfileBlocker && !showTermsGate) {
      if (!dashboardEnteredTrackedRef.current) {
        dashboardEnteredTrackedRef.current = true
        sessionTracker.trackEvent('DASHBOARD_ENTERED', {
          variant,
          isRequired,
          hasRentalDetails: hasRental,
          route: pathname,
        })
      }
    }
  }, [loading, isLoggedIn, user, showProfileBlocker, showTermsGate, variant, isRequired, hasRental, pathname])
  const hideBottomNav =
    !!showProfileBlocker ||
    !!pathname?.startsWith('/dashboard/setup') ||
    !!isHomeRequestRoute ||
    !!pathname?.startsWith('/dashboard/savings/deposit') ||
    !!pathname?.startsWith('/dashboard/notifications') ||
    !!pathname?.startsWith('/dashboard/kyc') ||
    !!pathname?.startsWith('/dashboard/my-home/complaints') ||
    !!pathname?.startsWith('/dashboard/my-home/visitors')

  return (
    <div className={`dashboard-layout${showProfileBlocker || showTermsGate ? ' dashboard-layout--blocker' : ''}`}>
      {showTermsGate && (
        <TermsAcceptanceModal onAccepted={() => window.location.reload()} />
      )}
      {showProfileBlocker && user && (
        <ProfileSetupBlocker
          user={user}
          score={scoreProfile?.data?.score}
          maxScore={scoreProfile?.data?.maxScore}
          profileCompletion={scoreProfile?.data?.profile?.profileCompletion}
          onSkip={handleSkipBlocker}
        />
      )}
      {/* Desktop Global Header */}
      {!showProfileBlocker && (
        <div className="desktop-only">
          <DashboardHeader />
        </div>
      )}

      <AnnouncementManager />
      <RentReminderManager />
      <main className="dashboard-layout__content">
        <Suspense fallback={<DashboardSkeleton />}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  )
}

