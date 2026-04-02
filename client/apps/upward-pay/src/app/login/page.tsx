'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginForm from '@/features/auth/component/LoginForm'
import { useAuth } from '@/features/auth/AuthContext'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push(redirect)
    }
  }, [isLoggedIn, loading, router, redirect])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <div className="w-12 h-12 bg-white/20 round-full animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <header className="auth-page__header"></header>
      <LoginForm />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse">
              <div className="w-12 h-12 bg-white/20 round-full animate-pulse" />
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
