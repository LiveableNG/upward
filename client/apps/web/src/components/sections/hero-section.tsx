'use client'
import { useEffect, useRef, useState } from 'react'
import { showToast } from '@upward/client-core'
import { PressLogos } from './press-logos'

export function HeroSection({
  onOpenSignup,
  variant = 'A',
}: {
  onOpenSignup: (email?: string, step?: number) => void
  variant?: 'A' | 'B'
}) {
  const LAUNCH_DATE = '2026-04-16T00:00:00'
  const [email, setEmail] = useState('')
  const launchRef = useRef<number>(new Date(LAUNCH_DATE).getTime())
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', true)
      return
    }

    // Background submit
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})

    onOpenSignup(email, 2)
  }

  useEffect(() => {
    const tick = () => {
      const diff = launchRef.current - Date.now()
      if (diff <= 0) return
      setTime({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')

  const content = {
    A: {
      titleLine1: 'Paid millions in rent?',
      titleLine2: 'What do you have to show for it?',
      sub: 'Upward records every payment, builds your housing reputation, unlocks benefits and opens the door to home ownership.',
    },
    B: {
      titleLine1: "Don't Just Pay Rent.",
      titleLine2: 'Build With It.',
      sub: 'Turn every rent payment into proof of financial responsibility—unlock rewards, credit opportunities, and pathways to owning your home.',
    },
  }[variant]

  return (
    <section style={{ position: 'relative', zIndex: 1 }}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '120px 40px 40px',
          width: '100%',
        }}
        className="hero-container"
      >
        <div
          style={{
            animation: 'fadeUp 0.6s ease both',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            color: 'var(--accent)',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '24px',
              height: '1px',
              background: 'var(--accent)',
            }}
            className="mobile-hide"
          />
          Rent Passport Program — Now Open
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: '32px',
            maxWidth: '850px',
            animation: 'fadeUp 0.7s 0.1s ease both',
          }}
        >
          <span
            style={{
              display: 'block',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {content.titleLine1}
          </span>
          <span style={{ display: 'block' }}>{content.titleLine2}</span>
        </h1>

        <div
          style={{
            animation: 'fadeUp 0.7s 0.2s ease both',
            marginBottom: '40px',
          }}
        >
          <p
            style={{
              fontSize: '20px',
              color: 'var(--muted)',
              maxWidth: '650px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
            className="hero-p"
          >
            {content.sub}
          </p>

          <div
            style={{
              marginTop: '32px',
              width: '100%',
              maxWidth: '520px',
              animation: 'fadeUp 0.7s 0.25s ease both',
            }}
          >
            {/* Desktop: Inline Form */}
            <form
              onSubmit={handleJoin}
              style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
              }}
              className="desktop-only"
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    fontSize: '15px',
                    padding: '18px 24px',
                    borderRadius: '100px',
                    outline: 'none',
                    transition: 'all 0.3s',
                    width: '100%',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(217, 119, 87, 0.15)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '14px',
                  letterSpacing: '0.05em',
                  padding: '18px 32px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 10px 25px rgba(217, 119, 87, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.background = '#bf5f43'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.background = 'var(--accent)'
                }}
              >
                Join Now
              </button>
            </form>

            {/* Mobile: Simple Button */}
            <button
              onClick={() => onOpenSignup()}
              className="mobile-only"
              style={{
                background: 'var(--accent)',
                color: 'white',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '15px',
                letterSpacing: '0.05em',
                padding: '20px 48px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                boxShadow: '0 10px 30px rgba(217, 119, 87, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              Join Now
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '40px',
            }}
            className="audience-tags"
          >
            {['Salary earners', 'Freelancers', 'Creatives', 'Business Owners'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  background: 'var(--accent-faint)',
                  border: '1px solid var(--accent-muted)',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  letterSpacing: '0.02em',
                }}
                className="audience-tag"
              >
                For {tag}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
            animation: 'fadeUp 0.7s 0.3s ease both',
          }}
          className="countdown-container"
        >
          {[
            ['Days', pad(time.d)],
            ['Hours', pad(time.h)],
            ['Mins', pad(time.m)],
            ['Secs', pad(time.s)],
          ].map(([label, val], i, arr) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                paddingRight: i < arr.length - 1 ? '36px' : 0,
                marginRight: i < arr.length - 1 ? '36px' : 0,
                borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              className="countdown-item"
            >
              <span
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: 'clamp(2rem,5vw,4rem)',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  transition: 'all 0.3s ease',
                }}
              >
                {val}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--accent)',
                  marginTop: '8px',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '0px' }}>
          <PressLogos />
        </div>

        <style>{`
          @keyframes beam {
            0% { left: -150%; }
            30% { left: 150%; }
            100% { left: 150%; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 768px) {
            .desktop-only {
                display: none !important;
            }
            .hero-container {
              padding: 100px 20px 60px !important;
              text-align: center;
              align-items: center;
            }
            .hero-cta-container {
                justify-content: center;
                width: 100%;
            }
            .hero-p {
              margin-left: auto;
              margin-right: auto;
              font-size: 16px !important;
            }
            .audience-tags {
              justify-content: center;
            }
            .countdown-container {
              justify-content: center;
              gap: 0;
              margin-bottom: 40px !important;
            }
            .countdown-item {
              padding-right: 15px !important;
              margin-right: 15px !important;
            }
            .countdown-item span:first-child {
              font-size: 32px !important;
            }
            .countdown-item span:last-child {
              font-size: 8px !important;
            }
          }
          @media (min-width: 769px) {
            .mobile-only {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </section>
  )
}
