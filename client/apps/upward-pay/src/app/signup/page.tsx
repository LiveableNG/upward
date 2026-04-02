'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignupForm from '@/features/auth/component/SignupForm'
import { useAuth } from '@/features/auth/AuthContext'

function SignupPageContent() {
  const router = useRouter()
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push('/dashboard')
    }
  }, [isLoggedIn, loading, router])

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
    <div className="auth-page auth-page--multi-step">
      <header className="auth-page__header"></header>
      <SignupForm />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse" />
          </div>
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  )
}
