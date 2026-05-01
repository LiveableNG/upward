'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export function LegalHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackInteraction = async (type: string, target: string, metadata?: any) => {
    try {
      const vid = localStorage.getItem('upward_visitor_id')
      const variant = localStorage.getItem('upward_ab_hero') || 'A'
      if (!vid) return

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: vid,
          type,
          target,
          abVariant: variant,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        }),
      })
    } catch (err) {
      console.error('Failed to track interaction', err)
    }
  }

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      trackInteraction('VIEW', 'MOBILE_MENU_LEGAL')
    } else {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(24px)',
        background: '#faf9f5ee', // Anthropic ivory-light with slight alpha
        borderBottom: '1px solid rgba(20, 20, 19, 0.05)', // Subtle slate-dark border
      }}
      className="header-padding"
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          opacity: mobileMenuOpen ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        onClick={() => {
          trackInteraction('CLICK', 'LEGAL_HEADER_LOGO')
          setMobileMenuOpen(false)
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(217, 119, 87, 0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(217, 119, 87, 0.15)',
          }}
        >
          <img
            src="/favicon.svg"
            alt="Upward Logo"
            style={{ width: '65%', height: '65%', objectFit: 'contain' }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            lineHeight: '1',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '14px',
              background: 'linear-gradient(135deg, #141413 0%, #d97757 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
            }}
          >
            UPWARD
          </div>
          <span
            style={{
              fontSize: '8px',
              fontWeight: 600,
              color: '#87867f',
              letterSpacing: '0.05em',
              marginTop: '2px',
            }}
          >
            BY GOODTENANTS
          </span>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link
          href="/?signup=true"
          onClick={() => {
            trackInteraction('CLICK', 'LEGAL_HEADER_SIGNUP')
            setMobileMenuOpen(false)
          }}
          className="mobile-hide"
          style={{
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            background: 'rgba(217, 119, 87, 0.05)',
            border: '1px solid rgba(217, 119, 87, 0.2)',
            padding: '10px 22px',
            borderRadius: '100px',
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.background = 'rgba(217, 119, 87, 0.1)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(217, 119, 87, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.background = 'rgba(217, 119, 87, 0.05)'
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'inline-block',
              animation: 'pulse 2s infinite',
            }}
          />
          Get Started
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-150%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(217, 119, 87, 0.1), rgba(255, 255, 255, 0.2), rgba(217, 119, 87, 0.1), transparent)',
              transform: 'skewX(-25deg)',
              animation: 'beam 4s infinite ease-in-out',
            }}
          />
        </Link>

        <Link
          href="/"
          className="mobile-hide"
          style={{
            fontSize: '9px',
            color: 'var(--text)',
            textDecoration: 'none',
            padding: '10px 22px',
            borderRadius: '100px',
            border: '1px solid var(--border)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontFamily: 'var(--font-head)',
            transition: 'all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
            e.currentTarget.style.borderColor = 'var(--accent-muted)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text)'
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Home
        </Link>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#141413',
            cursor: 'pointer',
            padding: '8px',
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
            strokeWidth="2.5"
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
            inset: 0,
            background: '#faf9f5', // Anthropic ivory
            zIndex: 1050,
            padding: '80px 24px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            animation: 'fadeIn 0.3s ease',
            height: '100vh',
            overflowY: 'auto',
          }}
        >
          {/* Logo in open menu */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(217, 119, 87, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(217, 119, 87, 0.15)',
              }}
            >
              <img
                src="/favicon.svg"
                alt="Upward Logo"
                style={{ width: '65%', height: '65%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1' }}>
              <div
                style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 800,
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #141413 0%, #d97757 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.05em',
                }}
              >
                UPWARD
              </div>
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 600,
                  color: '#87867f',
                  letterSpacing: '0.05em',
                  marginTop: '2px',
                }}
              >
                BY GOODTENANTS
              </span>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '14px',
                color: 'var(--text)',
                textDecoration: 'none',
                padding: '16px 24px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg)',
                width: 'fit-content',
                fontFamily: 'var(--font-head)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Home
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Privacy Policy', href: '/legal/privacy' },
                { label: 'Terms of Use', href: '/legal/terms' },
                { label: 'Cookie Policy', href: '/legal/cookies' },
                { label: 'Legal Notice', href: '/legal/notice' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: '24px',
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    color: '#141413',
                    textDecoration: 'none',
                    padding: '8px 0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
            <Link
              href="/?signup=true"
              onClick={() => {
                trackInteraction('CLICK', 'MOBILE_LEGAL_HEADER_SIGNUP')
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
                boxShadow: '0 10px 25px rgba(217, 119, 87, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textDecoration: 'none',
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
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes beam {
          0% { left: -150%; }
          30% { left: 150%; }
          100% { left: 150%; }
        }
        @media (max-width: 768px) {
          .header-padding {
            padding: 12px 20px !important;
          }
          .mobile-hide { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
