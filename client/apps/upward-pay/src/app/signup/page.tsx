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
import WaitlistClient from '@/app/waitlist/[uuid]/WaitlistClient'
import InviteClient from '@/app/invite/[uuid]/InviteClient'
import WelcomeClient from '@/app/welcome/[uuid]/WelcomeClient'
import { GoogleAuthProvider } from '@/features/auth/components/GoogleAuthProvider'

type Mode = 'welcome' | 'signup' | 'login' | 'biometrics' | 'waitlist' | 'invite' | 'priority'

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, loading } = useAuth()
  const [authInitialized, setAuthInitialized] = useState(false)
  const [isReturningUser, setIsReturningUser] = useState(false)

  const initialEmail = searchParams.get('email') || ''
  const [mode, setMode] = useState<Mode>(
    (searchParams.get('mode') as Mode) || (initialEmail ? 'signup' : 'welcome')
  )
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    if (!loading && !authInitialized) {
      if (isLoggedIn) {
        setIsReturningUser(true)
      }
      setAuthInitialized(true)
    }
  }, [loading, isLoggedIn, authInitialized])

  useEffect(() => {
    const urlMode = searchParams.get('mode') as Mode
    if (urlMode) {
      setMode(urlMode)
    } else {
      const email = searchParams.get('email')
      if (email) {
        setMode('signup')
      } else {
        setMode('welcome')
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!loading && isLoggedIn && authInitialized) {
      if (isReturningUser) {
        const redirect = searchParams.get('redirect') || '/dashboard'
        router.replace(redirect)
        return
      }
    }
  }, [isLoggedIn, loading, authInitialized, isReturningUser, router, searchParams])

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
    return (
      <LoginFormFlow 
        initialEmail={initialEmail}
        onBackToWelcome={() => setMode('welcome')} 
        onRedirectToSignup={(loginEmail) => router.push(`/signup?mode=signup&email=${encodeURIComponent(loginEmail)}`)} 
      />
    )
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

  if (mode === 'waitlist') {
    return <WaitlistClient />
  }

  if (mode === 'invite') {
    return <InviteClient />
  }

  if (mode === 'priority') {
    return <WelcomeClient />
  }

  return (
    <SignupFormFlow 
      initialEmail={initialEmail}
      onBackToWelcome={() => setMode('welcome')} 
      onSignupSuccess={(email, password) => {
        setCredentials({ email, password })
        if (Capacitor.isNativePlatform()) {
          setMode('biometrics')
        } else {
          router.replace('/dashboard')
        }
      }}
    />
  )
}

export default function SignupPage() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div className="auth-layout__graphic">
            <div className="auth-layout__circle"></div>
            <div className="auth-layout__card-mock" style={{ overflow: 'hidden' }}>
              <img 
                src="/attachments/upwardPay-dashboard.png" 
                alt="Upward Pay Dashboard Preview" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 'inherit',
                  opacity: 0.85,
                  transition: 'transform 0.5s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              />
            </div>
          </div>
          <h1>The new standard of renting.</h1>
          <p>
            Build your credit score, earn rewards for on-time payments, and 
            verify your tenancy history effortlessly with Upward.
          </p>
        </div>
      </div>

      <div className="auth-layout__form">
        <GoogleAuthProvider>
          <Suspense fallback={<FallbackSuspense message="Loading…" />}>
            <SignupPageContent />
          </Suspense>
        </GoogleAuthProvider>
      </div>
    </div>
  )
}
