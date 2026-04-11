'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import { BenefitsStep } from '@/features/auth/component/signup/BenefitsStep'
import { LoginFormFlow } from '@/features/auth/component/signup/LoginFormFlow'
import { SignupFormFlow } from '@/features/auth/component/signup/SignupFormFlow'
import { CompleteProfileStep } from '@/features/auth/component/signup/CompleteProfileStep'

type Mode = 'welcome' | 'signup' | 'login' | 'complete'

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, loading } = useAuth()

  const initialMode: Mode = (searchParams.get('mode') as Mode) || 'welcome'
  const [mode, setMode] = useState<Mode>(initialMode)

  useEffect(() => {
    // Only redirect if not on completing profile
    if (!loading && isLoggedIn && mode !== 'complete') {
      router.push('/dashboard')
    }
  }, [isLoggedIn, loading, mode, router])

  if (loading) return <FallbackSuspense message="Getting ready…" />

  if (mode === 'welcome') {
    return (
      <BenefitsStep 
        onSignup={() => setMode('signup')} 
        onLogin={() => setMode('login')} 
      />
    )
  }

  if (mode === 'login') {
    return <LoginFormFlow onBackToWelcome={() => setMode('welcome')} />
  }

  if (mode === 'complete') {
    return <CompleteProfileStep />
  }

  return (
    <SignupFormFlow 
      onBackToWelcome={() => setMode('welcome')} 
      onSignupSuccess={() => setMode('complete')}
    />
  )
}

export default function SignupPage() {
  return (
    <div className="auth-layout">
      {/* Desktop Visual Panel - Hidden on Mobile */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            {/* We can use CSS shapes/patterns for this graphic */}
            <div className="auth-layout__circle"></div>
            <div className="auth-layout__card-mock"></div>
          </div>
          <h1>The new standard of renting.</h1>
          <p>
            Build your credit score, earn rewards for on-time payments, and 
            verify your tenancy history effortlessly with Good Tenant.
          </p>
        </div>
      </div>

      {/* Form Panel - Contains the existing auth flows */}
      <div className="auth-layout__form">
        <Suspense fallback={<FallbackSuspense message="Loading…" />}>
          <SignupPageContent />
        </Suspense>
      </div>
    </div>
  )
}
