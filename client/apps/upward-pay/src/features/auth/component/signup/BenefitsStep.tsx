'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Shield, PiggyBank, Target, Building2, UserPlus, LogIn } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton'

const BENEFITS = [
  {
    icon: Target,
    color: '#C2501F',
    title: 'Achieve Your Living Goals',
    desc: '24/7 power backup, fast Wi-Fi, dream furnishings, or personal milestones. Plan what matters to you and unlock exclusive member deals.',
  },
  {
    icon: PiggyBank,
    color: '#16a34a',
    title: 'Save for Rent Stress-Free',
    desc: 'Never scramble on rent day again. Put money aside bit by bit, watch it grow with daily bonus returns, and earn cash back on your rent.',
  },
  {
    icon: TrendingUp,
    color: '#0ea5e9',
    title: 'Build a Score Landlords Love',
    desc: 'Every on-time payment boosts your Upward Score, unlocking cheaper rent deals, bigger perks, and prime apartments.',
  },
  {
    icon: Building2,
    color: '#6366f1',
    title: 'Find Homes You’ll Love',
    desc: 'Discover vetted, move-in-ready apartments with flexible payment plans designed around how you earn.',
  },
  {
    icon: Shield,
    color: '#d97706',
    title: 'Pay Rent with Zero Stress',
    desc: 'Instant transfers to any Nigerian bank account with official payment receipts sent straight to your landlord.',
  },
]

interface BenefitsStepProps {
  onSignup: () => void
  onLogin: () => void
}

export function BenefitsStep({ onSignup, onLogin }: BenefitsStepProps) {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % BENEFITS.length)
    }, 3800)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const slide = BENEFITS[active]
  const Icon = slide.icon

  return (
    <div className="auth-shell auth-shell--welcome">
      <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__logo">
        <UpwardLogo size={36} color="var(--clay)" />
      </a>

      <div className="benefit-carousel">
        <div className="benefit-carousel__track" key={active}>
          <div
            className="benefit-carousel__icon-ring"
            style={{ '--accent': slide.color } as React.CSSProperties}
          >
            <Icon size={30} color={slide.color} strokeWidth={2} />
          </div>
          <h2 className="benefit-carousel__title">{slide.title}</h2>
          <p className="benefit-carousel__desc">{slide.desc}</p>
        </div>

        <div className="benefit-carousel__dots">
          {BENEFITS.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`benefit-carousel__dot ${i === active ? 'is-active' : ''}`}
              onClick={() => {
                setActive(i)
                if (timerRef.current) clearInterval(timerRef.current)
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="auth-shell__ctas">
        <AppleSignInButton />
        <GoogleSignInButton />
        <div className="auth-divider auth-divider--compact">
          <span>OR</span>
        </div>
        <button type="button" className="auth-cta auth-cta--primary" onClick={onSignup}>
          <UserPlus size={18} />
          Create Account
        </button>
        <button type="button" className="auth-cta auth-cta--secondary" onClick={onLogin}>
          <LogIn size={18} />
          Log In
        </button>
      </div>

      <p className="auth-terms">
        By proceeding you agree to our{' '}
        <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/terms`} target="_blank" rel="noopener noreferrer">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/privacy`} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
      </p>
    </div>
  )
}
