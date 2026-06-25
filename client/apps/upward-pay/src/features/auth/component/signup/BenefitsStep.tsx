'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Gift, Shield, CheckCircle2, UserPlus, LogIn } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'

const BENEFITS = [
  {
    icon: Gift,
    color: '#C2501F',
    title: 'Earn Rewards',
    desc: 'Every on-time payment earns Upward points redeemable for rent discounts and exclusive perks.',
  },
  {
    icon: TrendingUp,
    color: '#22c55e',
    title: 'Build Your Credit',
    desc: 'Monthly rent payments are reported to credit bureaus — boosting your financial score effortlessly.',
  },
  {
    icon: Shield,
    color: '#6366f1',
    title: 'Verified Tenancy',
    desc: 'Get a tamper-proof digital record of your tenancy history — trusted by future landlords instantly.',
  },
  {
    icon: CheckCircle2,
    color: '#0ea5e9',
    title: 'Secure Payments',
    desc: 'Bank-grade encryption on every transaction. Your money and data stay protected, always.',
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
