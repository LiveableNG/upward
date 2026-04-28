'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

import { BottomNav } from '@/features/dashboard/components/BottomNav'
import { AnnouncementManager } from '@/features/dashboard/components/AnnouncementManager'
import { RentReminderManager } from '@/features/dashboard/components/RentReminderManager'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { api } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, loading } = useAuth()

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

  return (
    <div className="dashboard-layout">
      {/* Desktop Global Header */}
      <div className="desktop-only">
        <DashboardHeader />
      </div>

      <AnnouncementManager />
      <RentReminderManager />
      <main className="dashboard-layout__content">
        <Suspense fallback={<FallbackSuspense message="Loading..." />}>{children}</Suspense>
      </main>
      {!pathname?.startsWith('/dashboard/notifications') && !pathname?.startsWith('/dashboard/kyc') && <BottomNav />}
    </div>
  )
}

