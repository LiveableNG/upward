'use client'
import { useEffect, useRef, useState } from 'react'
import { PressLogos } from './press-logos'

export function HeroSection({
  onOpenSignup: _onOpenSignup,
}: {
  onOpenSignup: (email?: string) => void
}) {
  const launchRef = useRef<number>(
    Date.now() + 29 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 56 * 60 * 1000 + 42 * 1000,
  )
  const [time, setTime] = useState({ d: 29, h: 23, m: 56, s: 42 })

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
            maxWidth: '700px',
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
            Pay. Record. Own.
          </span>
          <span style={{ display: 'block' }}>Your Rent Is Your Credit.</span>
        </h1>

        <div
          style={{
            animation: 'fadeUp 0.7s 0.2s ease both',
            marginBottom: '40px',
          }}
        >
          <p
            style={{
              fontSize: '18px',
              color: 'var(--muted)',
              maxWidth: '560px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
            className="hero-p"
          >
            We&apos;re helping smart, responsible and hardworking renters build credibility that
            unlocks exclusive financial benefits.
          </p>

          <div
            style={{
              maxWidth: '560px',
              borderLeft: '2px solid var(--accent)',
              paddingLeft: '20px',
              marginBottom: '24px',
            }}
            className="hero-p"
          >
            <p
              style={{
                fontSize: '16px',
                color: 'var(--text)',
                lineHeight: 1.55,
                fontWeight: 500,
                marginBottom: '14px',
                letterSpacing: '-0.01em',
              }}
            >
              Build your Rent Passport — unlock exclusive financial benefits built around how you
              actually live and earn.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              {['Salary earners', 'Freelancers', 'Creatives', 'Business owners'].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--accent)',
                    background: 'rgba(217, 119, 87, 0.08)',
                    border: '1px solid rgba(217, 119, 87, 0.18)',
                    borderRadius: '6px',
                    padding: '5px 10px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
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
          @media (max-width: 768px) {
            .hero-container {
              padding: 100px 20px 60px !important;
              text-align: center;
              align-items: center;
            }
            .hero-p {
              margin-left: auto;
              margin-right: auto;
              font-size: 16px !important;
            }
            .hero-subtext-block {
              border-left: none !important;
              border-top: 2px solid var(--accent);
              padding-left: 0 !important;
              padding-top: 16px;
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
        `}</style>
      </div>
    </section>
  )
}
