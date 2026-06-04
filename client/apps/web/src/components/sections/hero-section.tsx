'use client'
import { PressLogos } from './press-logos'
import { useState, useRef, useEffect } from 'react'

export function HeroSection({
  onOpenSignup: _onOpenSignup,
  variant = 'A',
}: {
  onOpenSignup: (email?: string) => void
  variant?: 'A' | 'B'
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          Rent Passport Program — Now Live
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

          <div className="hero-cta-container">
            <button
              onClick={() => (window.location.href = '/login')}
              style={{
                background: 'var(--bg)',
                color: 'var(--accent)',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.1em',
                padding: '17px 34px',
                borderRadius: '100px',
                border: '1.5px solid var(--accent)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 40px rgba(217, 119, 87, 0.05)',
              }}
              className="desktop-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 15px 45px rgba(217, 119, 87, 0.15)'
                e.currentTarget.style.background = 'var(--accent-faint)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(217, 119, 87, 0.05)'
                e.currentTarget.style.background = 'var(--bg)'
              }}
            >
              Access Renter Portal
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button
              onClick={() => (window.location.href = '/portal/login')}
              style={{
                background: '#166534',
                color: '#ffffff',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.1em',
                padding: '18px 36px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 40px rgba(22, 101, 52, 0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
              className="desktop-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 15px 45px rgba(22, 101, 52, 0.4)'
                e.currentTarget.style.background = '#14532d'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(22, 101, 52, 0.25)'
                e.currentTarget.style.background = '#166534'
              }}
            >
              Access Landlord Portal
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-150%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent)',
                  transform: 'skewX(-25deg)',
                  animation: 'beam 4s infinite ease-in-out',
                }}
              />
            </button>

            <div ref={menuRef} style={{ position: 'relative' }} className="mobile-get-started">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  background: '#3a3a3a',
                  color: '#f0f0f0',
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '14px',
                  letterSpacing: '0.1em',
                  padding: '18px 32px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              >
                Get Started
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: 'transform 0.3s ease',
                    transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 16px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '260px',
                  height: '100px',
                  pointerEvents: menuOpen ? 'auto' : 'none',
                }}
              >
                <div
                  onClick={() => { window.location.href = '/login'; setMenuOpen(false) }}
                  style={{
                    position: 'absolute',
                    bottom: menuOpen ? '0px' : '-20px',
                    left: menuOpen ? '0px' : '80px',
                    opacity: menuOpen ? 1 : 0,
                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transitionDelay: menuOpen ? '0.05s' : '0s',
                    background: 'var(--accent)',
                    color: 'var(--btn-text)',
                    borderRadius: '100px',
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 6px 20px rgba(217, 119, 87, 0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  Renter Portal
                </div>

                <div
                  onClick={() => { window.location.href = '/portal/login'; setMenuOpen(false) }}
                  style={{
                    position: 'absolute',
                    bottom: menuOpen ? '0px' : '-20px',
                    right: menuOpen ? '0px' : '80px',
                    opacity: menuOpen ? 1 : 0,
                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transitionDelay: menuOpen ? '0.12s' : '0s',
                    background: '#166534',
                    color: '#fff',
                    borderRadius: '100px',
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 6px 20px rgba(22, 101, 52, 0.3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  Landlord Suite
                </div>
              </div>
            </div>
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
          .hero-cta-container {
            display: none;
          }
          .mobile-get-started {
            display: none;
          }
          @media (max-width: 768px) {
            .hero-container {
              padding: 100px 20px 60px !important;
              text-align: center;
              align-items: center;
            }
            .hero-cta-container {
              display: flex;
              justify-content: center;
              width: 100%;
              margin-top: 32px;
            }
            .desktop-btn {
              display: none !important;
            }
            .mobile-get-started {
              display: block;
            }
            .hero-p {
              margin-left: auto;
              margin-right: auto;
              font-size: 16px !important;
            }
            .audience-tags {
              justify-content: center;
            }
          }
          @media (min-width: 769px) {
            .mobile-hide {
              display: initial;
            }
          }
        `}</style>
      </div>
    </section>
  )
}