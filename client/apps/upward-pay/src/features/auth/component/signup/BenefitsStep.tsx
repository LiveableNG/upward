'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Shield, PiggyBank, Target, Building2, UserPlus, LogIn } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton'

const BENEFITS = [
  {
    icon: PiggyBank,
    color: '#C2501F',
    title: 'Save for Rent Stress-Free',
    desc: 'Never scramble on rent day again. Put money aside bit by bit, watch it grow with daily bonus returns, and earn cash back on your rent.',
  },
  {
    icon: Target,
    color: '#16a34a',
    title: 'Achieve Your Living Goals',
    desc: '24/7 power backup, fast Wi-Fi, dream furnishings, or personal milestones. Plan what matters to you and unlock exclusive member deals.',
  },
  {
    icon: Shield,
    color: '#d97706',
    title: 'Pay Rent with Zero Stress',
    desc: 'Instant transfers to any Nigerian bank account with official payment receipts sent straight to your landlord.',
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
]

interface BenefitsStepProps {
  onSignup: () => void
  onLogin: () => void
}

export function BenefitsStep({ onSignup, onLogin }: BenefitsStepProps) {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % BENEFITS.length)
    }, 3800)
  }

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const goToSlide = (index: number) => {
    setActive(index)
    startTimer()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    touchEndXRef.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diff = touchStartXRef.current - touchEndXRef.current
      const threshold = 40
      if (diff > threshold) {
        goToSlide((active + 1) % BENEFITS.length)
      } else if (diff < -threshold) {
        goToSlide((active - 1 + BENEFITS.length) % BENEFITS.length)
      }
    }
    touchStartXRef.current = null
    touchEndXRef.current = null
  }

  return (
    <div className="auth-shell auth-shell--welcome">
      <a href={process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'} className="auth-shell__logo">
        <UpwardLogo size={36} color="var(--clay)" />
      </a>

      <div
        className="benefit-carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="benefit-carousel__slider">
          <div
            className="benefit-carousel__track"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {BENEFITS.map((item, idx) => {
              const ItemIcon = item.icon
              return (
                <div key={item.title} className="benefit-carousel__slide" aria-hidden={idx !== active}>
                  <div
                    className="benefit-carousel__icon-ring"
                    style={{ '--accent': item.color } as React.CSSProperties}
                  >
                    <ItemIcon size={30} color={item.color} strokeWidth={2} />
                  </div>
                  <h2 className="benefit-carousel__title">{item.title}</h2>
                  <p className="benefit-carousel__desc">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="benefit-carousel__dots" role="tablist" aria-label="Feature slides">
          {BENEFITS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`benefit-carousel__dot ${i === active ? 'is-active' : ''}`}
              onClick={() => goToSlide(i)}
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
