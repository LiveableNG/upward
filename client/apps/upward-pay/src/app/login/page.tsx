'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

/**
 * /login redirects to /signup which houses both the login and signup
 * staged flows behind the welcome carousel screen.
 * Deep-linking to /login?mode=login will pre-open the login flow.
 */
function LoginRedirectContent() {
  const router = useRouter()
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const searchParams = new URLSearchParams(window.location.search)
    const redirect = searchParams.get('redirect')
    if (isLoggedIn) {
      router.replace(redirect || '/dashboard')
    } else {
      const target = redirect
        ? `/signup?mode=login&redirect=${encodeURIComponent(redirect)}`
        : '/signup?mode=login'
      router.replace(target)
    }
  }, [isLoggedIn, loading, router])

  // Safety escape hatch if auth loading hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        const redirect = searchParams.get('redirect')
        const target = redirect
          ? `/signup?mode=login&redirect=${encodeURIComponent(redirect)}`
          : '/signup?mode=login'
        window.location.href = target
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  return <FallbackSuspense message="Redirecting..." />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading…" />}>
      <LoginRedirectContent />
    </Suspense>
  )
}
