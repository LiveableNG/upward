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
    if (isLoggedIn) {
      router.replace('/dashboard')
    } else {
      router.replace('/signup?mode=login')
    }
  }, [isLoggedIn, loading, router])

  return <FallbackSuspense message="Loading…" />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading…" />}>
      <LoginRedirectContent />
    </Suspense>
  )
}
