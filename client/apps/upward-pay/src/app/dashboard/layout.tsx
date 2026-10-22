'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

import dynamic from 'next/dynamic'
import { BottomNav } from '@/features/dashboard/components/BottomNav'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { getStandaloneRentalPath, hasRentalInfo, isProfileSetupComplete } from '@/features/dashboard/utils/profileCompletion'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { useRentalExperiment } from '@/features/dashboard/setup/hooks/useRentalExperiment'
import { useRentalGate } from '@/features/dashboard/setup/hooks/useRentalGate'
import { sessionTracker } from '@/lib/sessionTracker'

const FRESH_SIGNUP_WINDOW_MS = 30 * 60 * 1000

function readStorageFlag(storage: 'local' | 'session', key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage
    return store.getItem(key) === 'true'
  } catch {
    return false
  }
}

function writeStorageFlag(storage: 'local' | 'session', key: string): void {
  if (typeof window === 'undefined') return
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage
    store.setItem(key, 'true')
  } catch {
  }
}

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
  const { isGated: isRentalGated, notifyGated } = useRentalGate()
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

  const isDashboardHome = pathname === '/dashboard'
  const isHomeRequestRoute = pathname?.startsWith('/dashboard/exclusive-homes/request')
  const showTermsGate = !!(user && !user.termsAcceptedAt)

  // Gated users may only reach rental/personal setup and the profile screen (personal details + sign out)
  const isSetupRoute = !!pathname?.startsWith('/dashboard/setup')
  const isProfileRoute = !!pathname?.startsWith('/dashboard/me')
  const isExemptRoute = isSetupRoute || isProfileRoute

  const signupDeviceKey = user?.uuid ? `upward_rental_signup_device_${user.uuid}` : ''
  const autoOpenSessionKey = user?.uuid ? `upward_rental_autoopen_${user.uuid}` : ''
  const createdAtMs = user?.createdAt ? new Date(user.createdAt).getTime() : NaN
  const isFreshSignup = !isNaN(createdAtMs) && Date.now() - createdAtMs < FRESH_SIGNUP_WINDOW_MS
  const isSignupDevice = !!signupDeviceKey && (isFreshSignup || readStorageFlag('local', signupDeviceKey))
  const hasAutoOpenedThisSession = !!autoOpenSessionKey && readStorageFlag('session', autoOpenSessionKey)

  // On the signup device, open the rental form directly once per session instead of showing the blocker
  const shouldAutoOpenRental =
    isRentalGated && !showTermsGate && !isExemptRoute && isSignupDevice && !hasAutoOpenedThisSession

  useEffect(() => {
    if (loading || !user?.uuid || !isRentalGated || showTermsGate || isExemptRoute) return

    if (shouldAutoOpenRental) {
      writeStorageFlag('local', signupDeviceKey)
      writeStorageFlag('session', autoOpenSessionKey)
      router.replace(getStandaloneRentalPath())
      return
    }

    if (!isDashboardHome) {
      notifyGated()
      router.replace('/dashboard')
    }
  }, [
    loading,
    user?.uuid,
    isRentalGated,
    showTermsGate,
    isExemptRoute,
    shouldAutoOpenRental,
    signupDeviceKey,
    autoOpenSessionKey,
    isDashboardHome,
    notifyGated,
    router,
  ])

  const showProfileBlocker =
    !showTermsGate &&
    !!user &&
    !isExperimentLoading &&
    !shouldAutoOpenRental &&
    (isRequired
      ? isRentalGated && !isExemptRoute
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

  if (!loading && !isLoggedIn && !isPinLocked) {
    return <FallbackSuspense message="Redirecting to login..." />
  }

  if (shouldAutoOpenRental) {
    return <FallbackSuspense message="Setting up your rental details..." />
  }

  const hideBottomNav =
    !!showProfileBlocker ||
    isRentalGated ||
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

