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
      <div className="onboarding onboarding--loading">
        <div className="onboarding__splash">
          <UpwardLogo size={48} className="onboarding__pulse-logo" />
          <p className="onboarding__splash-text">
            Opening Upward App...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding animate-fade-up">
      <div className="onboarding__content">
        <div className="onboarding__header">
          <UpwardLogo size={32} />
        </div>

        {initialInvitation ? (
          <CompanyHeader
            name={initialInvitation.companyName}
            logo={initialInvitation.companyLogo}
          />
        ) : email ? (
          <div className="onboarding__welcome">
            <div className="onboarding__welcome-icon">
              <Zap size={32} />
            </div>
            <h2 className="onboarding__title">We've Launched!</h2>
            <p className="onboarding__subtitle">
              Welcome back, your waitlist entry is ready.
            </p>
          </div>
        ) : (
          <div className="onboarding__welcome">
            <h2 className="onboarding__title">Welcome to Upward</h2>
            <p className="onboarding__subtitle">
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
              <span>
                {initialInvitation || email ? 'Get Started' : 'Join Now'}
              </span>
              <ArrowRight size={20} />
            </button>
            {(token || email) && (
              <p className="onboarding__secured-note">
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
