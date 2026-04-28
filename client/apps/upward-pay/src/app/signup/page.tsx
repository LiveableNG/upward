'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import { BiometricEnrollmentStep } from '@/features/auth/component/signup/BiometricEnrollmentStep'
import { Capacitor } from '@capacitor/core'
import { BenefitsStep } from '@/features/auth/component/signup/BenefitsStep'
import { LoginFormFlow } from '@/features/auth/component/signup/LoginFormFlow'
import { SignupFormFlow } from '@/features/auth/component/signup/SignupFormFlow'

type Mode = 'welcome' | 'signup' | 'login' | 'biometrics'

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, loading } = useAuth()

  const initialMode: Mode = (searchParams.get('mode') as Mode) || 'welcome'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    if (!loading && isLoggedIn && mode !== 'biometrics' && mode !== 'welcome') {
      const redirect = searchParams.get('redirect') || '/dashboard'
      router.replace(redirect)
    }
  }, [isLoggedIn, loading, router, mode, searchParams])

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

  if (mode === 'biometrics' && credentials) {
    return (
      <BiometricEnrollmentStep 
        email={credentials.email}
        password={credentials.password}
        onComplete={() => router.push('/dashboard')}
      />
    )
  }

  return (
    <SignupFormFlow 
      onBackToWelcome={() => setMode('welcome')} 
      onSignupSuccess={(email, password) => {
        setCredentials({ email, password })
        if (Capacitor.isNativePlatform()) {
          setMode('biometrics')
        } else {
          window.location.href = '/dashboard'
        }
      }}
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
