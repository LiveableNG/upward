'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export function Header({
  onSetView,
  currentView,
  onOpenSignup,
  trackInteraction,
}: {
  onSetView: (view: 'home' | 'why' | 'fairness') => void
  currentView: 'home' | 'why' | 'fairness'
  onOpenSignup: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackInteraction?: (type: string, target: string, metadata?: any) => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 1000,
        padding: scrolled ? '12px 40px' : '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(24px)',
        background: scrolled ? 'var(--nav-scrolled)' : 'var(--nav-bg)',
        borderBottom: scrolled ? '1px solid var(--accent-muted)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
      className="header-padding"
    >
      <div
        onClick={() => {
          if (trackInteraction) trackInteraction('CLICK', 'BRAND_LOGO')
          onSetView('home')
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          cursor: 'pointer',
          opacity: mobileMenuOpen ? 0 : 1,
          pointerEvents: mobileMenuOpen ? 'none' : 'auto',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-faint)',
            borderRadius: '10px',
            border: '1px solid var(--accent-muted)',
            boxShadow: '0 4px 20px var(--hover-shadow), 0 0 10px var(--accent-faint)',
          }}
        >
          <img
            src="/favicon.svg"
            alt="Upward Logo"
            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            lineHeight: '1.2',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '15px',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
            }}
          >
            <span>UPWARD</span>
            <span
              className="mobile-hide"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              By GoodTenants
            </span>
          </div>
          <span
            className="mobile-only-text"
            style={{
              display: 'none',
              fontFamily: 'var(--font-head)',
              fontSize: '7px',
              fontWeight: 600,
              color: 'var(--muted)',
              letterSpacing: '0.1em',
            }}
          >
            By GoodTenants
          </span>
        </div>
      </div>

      <ul style={{ display: 'flex', gap: '32px', listStyle: 'none' }} className="mobile-hide">
        {(
          [
            ['#why', 'Why Upward?'],
            ['#faq', 'FAQ'],
            ['#fairness', 'End Housing Bias'],
          ] as [string, string][]
        ).map(([href, label]) => {
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={(e) => {
                  if (trackInteraction)
                    trackInteraction(
                      'CLICK',
                      `NAV_LINK_${label.toUpperCase().replace(/\s+/g, '_')}`,
                    )
                  if (label === 'Why Upward?' || label === 'FAQ') {
                    e.preventDefault()
                    onSetView('why')
                    if (label === 'FAQ') {
                      setTimeout(() => {
                        const el = document.getElementById('faq')
                        if (el) {
                          const navHeight = 80
                          const top =
                            el.getBoundingClientRect().top + window.pageYOffset - navHeight
                          window.scrollTo({ top, behavior: 'smooth' })
                        }
                      }, 150)
                    }
                  } else if (label === 'End Housing Bias') {
                    e.preventDefault()
                    onSetView('fairness')
                  } else {
                    onSetView('home')
                  }
                }}
                style={{
                  fontSize: '12px',
                  color:
                    (label === 'Why Upward?' || label === 'FAQ') && currentView === 'why'
                      ? 'var(--accent)'
                      : label === 'End Housing Bias' && currentView === 'fairness'
                        ? 'var(--accent)'
                        : 'var(--muted)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  fontWeight:
                    ((label === 'Why Upward?' || label === 'FAQ') && currentView === 'why') ||
                    (label === 'End Housing Bias' && currentView === 'fairness')
                      ? 700
                      : 400,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color =
                    (label === 'Why Upward?' || label === 'FAQ') && currentView === 'why'
                      ? 'var(--accent)'
                      : 'var(--muted)')
                }
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link
          href="/login"
          className="mobile-hide"
          style={{
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            textDecoration: 'none',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
        >
          Login
        </Link>
        <button
          className="mobile-hide"
          onClick={() => {
            if (trackInteraction) trackInteraction('CLICK', 'HEADER_GET_STARTED')
            window.location.href = '/signup'
          }}
          style={{
            fontSize: '9px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--btn-text)',
            background: 'var(--accent)',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '100px',
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 8px 25px rgba(217, 119, 87, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(217, 119, 87, 0.4)'
            e.currentTarget.style.background = '#bf5f43'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(217, 119, 87, 0.25)'
            e.currentTarget.style.background = 'var(--accent)'
          }}
        >
          Get Started
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-150%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
              transform: 'skewX(-25deg)',
              animation: 'beam 4s infinite ease-in-out',
            }}
          />
        </button>

        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleMenu}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: '5px',
            display: 'none',
            position: 'relative',
            zIndex: 1100,
          }}
          className="mobile-toggle"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            background: 'var(--bg)',
            zIndex: 999,
            padding: '80px 20px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            animation: 'fadeIn 0.3s ease',
            overflowY: 'auto',
          }}
        >
          {/* Mobile Menu Header Logo */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
            onClick={() => {
              onSetView('home')
              setMobileMenuOpen(false)
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--accent-faint)',
                borderRadius: '10px',
                border: '1px solid var(--accent-muted)',
                boxShadow: '0 4px 20px var(--hover-shadow), 0 0 10px var(--accent-faint)',
              }}
            >
              <img
                src="/favicon.svg"
                alt="Upward Logo"
                style={{ width: '70%', height: '70%', objectFit: 'contain' }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                lineHeight: '1.2',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '15px',
                  background: 'var(--heading-mix)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                }}
              >
                <span>UPWARD</span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: '7px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  letterSpacing: '0.1em',
                }}
              >
                By GoodTenants
              </span>
            </div>
          </div>
          {(
            [
              ['#why', 'Why Upward?'],
              ['#faq', 'FAQ'],
              ['#fairness', 'End Housing Bias'],
            ] as [string, string][]
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={(e) => {
                if (trackInteraction)
                  trackInteraction(
                    'CLICK',
                    `MOBILE_NAV_LINK_${label.toUpperCase().replace(/\s+/g, '_')}`,
                  )
                if (label === 'Why Upward?' || label === 'FAQ') {
                  e.preventDefault()
                  onSetView('why')
                  if (label === 'FAQ') {
                    setTimeout(() => {
                      const el = document.getElementById('faq')
                      if (el) {
                        const navHeight = 70
                        const top = el.getBoundingClientRect().top + window.pageYOffset - navHeight
                        window.scrollTo({ top, behavior: 'smooth' })
                      }
                    }, 150)
                  }
                } else if (label === 'End Housing Bias') {
                  e.preventDefault()
                  onSetView('fairness')
                } else if (label === 'Join Live') {
                  e.preventDefault()
                  onOpenSignup()
                } else {
                  onSetView('home')
                }
                setMobileMenuOpen(false)
              }}
              style={{
                fontSize: '24px',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                color:
                  ((label === 'Why Upward?' || label === 'FAQ') && currentView === 'why') ||
                  (label === 'End Housing Bias' && currentView === 'fairness')
                    ? 'var(--accent)'
                    : 'var(--text)',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
            <button
              onClick={() => {
                if (trackInteraction) trackInteraction('CLICK', 'MOBILE_OPEN_APP')
                window.location.href = '/signup'
                setMobileMenuOpen(false)
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--accent)',
                border: 'none',
                color: 'var(--btn-text)',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '15px',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(217, 119, 87, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              Get Started
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-150%',
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                  transform: 'skewX(-25deg)',
                  animation: 'beam 4s infinite ease-in-out',
                }}
              />
            </button>
          </div>
        </div>
      )}

      <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                @keyframes beam {
                  0% { left: -150%; }
                  30% { left: 150%; }
                  100% { left: 150%; }
                }
                @keyframes pulse {
                  0% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.4); opacity: 0.6; }
                  100% { transform: scale(1); opacity: 1; }
                }
                @media (max-width: 768px) {
                    .header-padding {
                        padding: 12px 20px !important;
                    }
                    .mobile-toggle {
                        display: block !important;
                    }
                    .mobile-only-text {
                        display: block !important;
                    }
                }
            `}</style>
    </nav>
  )
}
