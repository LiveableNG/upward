'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, CheckCircle, ArrowRight, Zap } from 'lucide-react'
import CompanyHeader from '@/components/CompanyHeader'
import PoweredByUpward, { UpwardLogo } from '@/components/PoweredByUpward'
import { type InvitationData } from '@/lib/invitation-service'

interface JoinContentProps {
  initialInvitation: InvitationData | null
  token?: string
  email?: string
}

export default function JoinContent({ initialInvitation, token, email }: JoinContentProps) {
  const router = useRouter()
  const [isDeepLinkTimedOut, setIsDeepLinkTimedOut] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--onboarding-pulse', '1')

    if (token) {
      const appUrl = `upwardpay://join?token=${token}`
      const timeout = setTimeout(() => setIsDeepLinkTimedOut(true), 3000)
      window.location.href = appUrl
      return () => clearTimeout(timeout)
    } else {
      setIsDeepLinkTimedOut(true)
    }
  }, [token])

  const handleJoin = () => {
    let url = '/complete-profile'
    const params = new URLSearchParams()
    if (token) params.set('token', token)
    if (email) params.set('email', email)
    if (initialInvitation?.email) params.set('email', initialInvitation.email)

    const queryString = params.toString()
    if (queryString) url += `?${queryString}`

    router.push(url)
  }

  if (!isDeepLinkTimedOut && token) {
    return (
      <div className="onboarding h-screen items-center justify-center bg-[var(--bg)]">
        <div className="text-center space-y-6 animate-pulse">
          <UpwardLogo size={48} />
          <p className="text-[var(--text-muted)] font-medium tracking-wide">
            Opening Upward App...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding animate-fade-up">
      <div className="onboarding__content">
        <div className="pt-8 mb-4">
          <UpwardLogo size={32} className="mx-auto" />
        </div>

        {initialInvitation ? (
          <CompanyHeader
            name={initialInvitation.companyName}
            logo={initialInvitation.companyLogo}
          />
        ) : email ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 bg-[var(--success-bg)] text-[var(--success)] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Zap size={32} />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">We've Launched!</h2>
            <p className="text-[var(--text-muted)] font-medium">
              Welcome back, your waitlist entry is ready.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Welcome to Upward</h2>
            <p className="text-[var(--text-muted)] font-medium">
              Secure your spot and build your rent credit.
            </p>
          </div>
        )}

        <div className="onboarding__card">
          <div className="onboarding__features">
            <div className="onboarding__feature-item">
              <div className="onboarding__feature-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="onboarding__feature-text">
                <div className="onboarding__feature-title">Verified Profile</div>
                <div className="onboarding__feature-description">
                  Your payment history is secured and ready for build-out.
                </div>
              </div>
            </div>
            <div className="onboarding__feature-item">
              <div className="onboarding__feature-icon">
                <CheckCircle size={20} />
              </div>
              <div className="onboarding__feature-text">
                <div className="onboarding__feature-title">Rent Credit Reporting</div>
                <div className="onboarding__feature-description">
                  Automatically build credit as you pay your monthly rent.
                </div>
              </div>
            </div>
            <div className="onboarding__feature-item">
              <div className="onboarding__feature-icon">
                <Zap size={20} />
              </div>
              <div className="onboarding__feature-text">
                <div className="onboarding__feature-title">Instant Receipts</div>
                <div className="onboarding__feature-description">
                  Get digital, verifiable rent receipts for every payment.
                </div>
              </div>
            </div>
          </div>

          <div className="onboarding__actions">
            <button onClick={handleJoin} className="onboarding__button">
              <span className="tracking-wide">
                {initialInvitation || email ? 'Get Started' : 'Join Now'}
              </span>
              <ArrowRight size={20} />
            </button>
            {(token || email) && (
              <p className="text-[var(--text-muted)] text-[10px] text-center mt-2 uppercase tracking-widest font-bold opacity-50">
                Secured by Upward Protocol — Token Active
              </p>
            )}
          </div>
        </div>

        <PoweredByUpward />
      </div>
    </div>
  )
}
