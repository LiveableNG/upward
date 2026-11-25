'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import { Capacitor } from '@capacitor/core'
import { BenefitsStep } from '@/features/auth/component/signup/BenefitsStep'
import { LoginFormFlow } from '@/features/auth/component/signup/LoginFormFlow'
import { SignupFormFlow } from '@/features/auth/component/signup/SignupFormFlow'
import WaitlistClient from '@/app/waitlist/[uuid]/WaitlistClient'
import InviteClient from '@/app/invite/[uuid]/InviteClient'
import WelcomeClient from '@/app/welcome/[uuid]/WelcomeClient'
import { GoogleAuthProvider } from '@/features/auth/components/GoogleAuthProvider'
import { persistSignupVoucherCode, getSignupVoucherCode } from '@/lib/voucher-code'
import { Gift } from 'lucide-react'

type Mode = 'welcome' | 'signup' | 'login' | 'waitlist' | 'invite' | 'priority'

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
  const [activeVoucherCode, setActiveVoucherCode] = useState<string | null>(null)

  useEffect(() => {
    const paramCode = searchParams.get('voucher') || searchParams.get('v')
    if (paramCode) {
      const saved = persistSignupVoucherCode(paramCode)
      if (saved) setActiveVoucherCode(saved)
    } else {
      const existing = getSignupVoucherCode()
      if (existing) setActiveVoucherCode(existing)
    }
  }, [searchParams])

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

  const voucherBanner = activeVoucherCode ? (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 10px',
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        background: 'rgba(253, 246, 242, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(194, 80, 31, 0.18)',
        color: 'var(--clay, #C2501F)',
        fontSize: 'clamp(10.5px, 2.9vw, 12.5px)',
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        pointerEvents: 'none',
      }}
    >
      <Gift size={14} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        ₦1,000 Home Refresh voucher unlocked • Sign up to claim
      </span>
    </div>
  ) : null

  if (mode === 'welcome') {
    return (
      <>
        {voucherBanner}
        <BenefitsStep 
          onSignup={() => setMode('signup')} 
          onLogin={() => setMode('login')} 
        />
      </>
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
    <>
      {voucherBanner}
      <SignupFormFlow 
        initialEmail={initialEmail}
        onBackToWelcome={() => setMode('welcome')} 
        onSignupSuccess={() => {
          router.replace('/dashboard')
        }}
      />
    </>
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
