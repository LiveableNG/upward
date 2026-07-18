'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, TrendingUp, Shield, BarChart3, UserPlus, LogIn } from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useRouter } from 'next/navigation'

const BENEFITS = [
  {
    icon: BarChart3,
    color: '#b49a69', // using --clay color from Upward PM
    title: 'Streamline Operations',
    desc: 'Manage your entire portfolio easily from a single, intuitive dashboard tailored for modern property managers.',
  },
  {
    icon: CheckCircle2,
    color: '#166534', // using --forest color
    title: 'Automated Tracking',
    desc: 'No more manual reconciliation. Automatically track rent payments, late fees, and expenses in real-time.',
  },
  {
    icon: Shield,
    color: '#0ea5e9',
    title: 'Tenant Screening',
    desc: 'Onboard and verify tenants effortlessly with our built-in comprehensive screening and identity checks.',
  },
  {
    icon: TrendingUp,
    color: '#6366f1',
    title: 'Data-Driven Insights',
    desc: 'Get real-time financial reporting and actionable insights to maximize the profitability of your properties.',
  },
]

export function BenefitsWelcome() {
  const router = useRouter()
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
      <div className="auth-shell__logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <UpwardLogo size={36} color="var(--forest)" />
      </div>

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

      <div className="auth-shell__ctas" style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          type="button" 
          className="auth-btn auth-btn--primary" 
          onClick={() => router.push('/signup')}
        >
          <UserPlus size={18} />
          Create Account
        </button>
        <button 
          type="button" 
          className="auth-btn auth-btn--secondary" 
          onClick={() => router.push('/login')}
        >
          <LogIn size={18} />
          Log In
        </button>
      </div>

      <p className="auth-terms" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px' }}>
        By proceeding you agree to our{' '}
        <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/terms`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)' }}>
          Terms of Service
        </a>{' '}
        and{' '}
        <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/privacy`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)' }}>
          Privacy Policy
        </a>
      </p>
    </div>
  )
}
