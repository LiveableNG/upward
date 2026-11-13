'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Compass, PiggyBank, Target, UserPlus, LogIn } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton'

const BENEFITS = [
  {
    icon: Target,
    color: '#C2501F',
    title: 'Set Goals That Matter',
    desc: 'Plan across housing, income, career, and family — or create custom goals around your priorities.',
  },
  {
    icon: CheckCircle2,
    color: '#16a34a',
    title: 'Turn Ambitions into Steps',
    desc: 'Break every goal into clear milestones, target dates, and budgets you can track in one place.',
  },
  {
    icon: PiggyBank,
    color: '#0ea5e9',
    title: 'Smarter Rent & Financial Tools',
    desc: 'Save towards rent, manage payments seamlessly, and build verified credibility along the way.',
  },
  {
    icon: Compass,
    color: '#d97706',
    title: 'Curated Support for Your Goals',
    desc: 'Explore vetted home upgrades, services, and resources connected to what you are working toward.',
  },
]

interface BenefitsStepProps {
  onSignup: () => void
  onLogin: () => void
}

export function BenefitsStep({ onSignup, onLogin }: BenefitsStepProps) {
  const [active, setActive] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const currentDragRef = useRef(0)

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % BENEFITS.length)
    }, 4000)
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
    currentDragRef.current = 0
    setIsDragging(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartXRef.current
    currentDragRef.current = diff
    setDragOffset(diff)
  }

  const handleTouchEnd = () => {
    const diff = currentDragRef.current
    const threshold = 40
    setIsDragging(false)
    setDragOffset(0)
    touchStartXRef.current = null

    if (diff > threshold) {
      goToSlide((active - 1 + BENEFITS.length) % BENEFITS.length)
    } else if (diff < -threshold) {
      goToSlide((active + 1) % BENEFITS.length)
    } else {
      startTimer()
    }
  }

  const trackTransform = isDragging
    ? `translateX(calc(-${active * 100}% + ${dragOffset}px))`
    : `translateX(-${active * 100}%)`

  const trackTransition = isDragging
    ? 'none'
    : 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)'

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
            style={{
              transform: trackTransform,
              transition: trackTransition,
            }}
          >
            {BENEFITS.map((item, idx) => {
              const ItemIcon = item.icon
              const isActive = idx === active
              return (
                <div
                  key={item.title}
                  className={`benefit-carousel__slide ${isActive ? 'is-active' : ''}`}
                  aria-hidden={!isActive}
                >
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
