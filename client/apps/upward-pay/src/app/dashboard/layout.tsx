'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

import { BottomNav } from '@/features/dashboard/components/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push(`/login?redirect=${pathname}`)
    }
  }, [loading, isLoggedIn, router, pathname])

  if (loading) {
    return <FallbackSuspense message="Authenticating..." />
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="dashboard-layout">
      <main className="dashboard-layout__content">
        <Suspense fallback={<FallbackSuspense message="Loading..." />}>{children}</Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
