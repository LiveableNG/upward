'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export function Header({ onOpenSignup }: { onOpenSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        background: scrolled ? 'rgba(20, 20, 19, 0.95)' : 'rgba(20, 20, 19, 0.8)',
        borderBottom: scrolled ? '1px solid rgba(217, 119, 87, 0.15)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
      className="header-padding"
    >
      <Link
        href="/"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(217, 119, 87, 0.08)',
            borderRadius: '10px',
            border: '1px solid rgba(217, 119, 87, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 10px rgba(217, 119, 87, 0.1)',
          }}
        >
          <img
            src="/favicon.svg"
            alt="Upward Logo"
            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            fontSize: '15px',
            background: 'var(--heading-mix)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.05em',
          }}
        >
          UPWARD
        </span>
      </Link>

      {/* Desktop Nav */}
      <ul style={{ display: 'flex', gap: '32px', listStyle: 'none' }} className="mobile-hide">
        {(
          [
            ['#why', 'Why Upward'],
            ['#how', 'How it Works'],
            ['#ambassador', 'Ambassador'],
          ] as [string, string][]
        ).map(([href, label]) => (
          <li key={href}>
            <Link
              href={href}
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <button
          onClick={onOpenSignup}
          style={{
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#000',
            background: 'var(--accent)',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '100px',
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          Get Started
        </button>

        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleMenu}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: '5px',
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
            top: '70px',
            left: 0,
            width: '100%',
            height: 'calc(100vh - 70px)',
            background: 'var(--bg)',
            zIndex: 999,
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {(
            [
              ['#why', 'Why Upward'],
              ['#how', 'How it Works'],
              ['#ambassador', 'Ambassador'],
            ] as [string, string][]
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '24px',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                color: 'var(--text)',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenSignup()
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: '16px',
              }}
            >
              Join the Waitlist
            </button>
          </div>
        </div>
      )}

      <style>{`
                @media (max-width: 768px) {
                    .header-padding {
                        padding: 12px 20px !important;
                    }
                    .mobile-toggle {
                        display: block !important;
                    }
                }
            `}</style>
    </nav>
  )
}
