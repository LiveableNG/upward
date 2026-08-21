'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [uniDropdownOpen, setUniDropdownOpen] = useState(false)
  const [uniModalOpen, setUniModalOpen] = useState(false)
  const showBlog = 'true'

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || uniModalOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen, uniModalOpen])

  return (
    <>
      <header className="marketing-header">
        <div className="marketing-header__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
            <Link href="/" className="marketing-header__brand">
              <div className="marketing-header__logo">
                <img src="/favicon.svg" alt="Upward" />
              </div>
              <span className="marketing-header__name">UPWARD</span>
            </Link>

            <nav className="marketing-header__nav" aria-label="Primary">
              <Link href="/request-a-home">Request a Home</Link>
              
              <div
                className="marketing-header__dropdown-container"
                style={{ position: 'relative' }}
                onMouseEnter={() => setUniDropdownOpen(true)}
                onMouseLeave={() => setUniDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setUniDropdownOpen(!uniDropdownOpen)}
                  style={{
                    background: 'rgba(217, 119, 87, 0.1)',
                    color: '#d97757',
                    border: '1px solid rgba(217, 119, 87, 0.25)',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Upward University{' '}
                  <span
                    style={{
                      background: '#d97757',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '99px',
                      textTransform: 'uppercase',
                    }}
                  >
                    NEW
                  </span>
                  <span style={{ fontSize: '9px' }}>▼</span>
                </button>
                {uniDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '8px',
                      width: '280px',
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '10px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                      border: '1px solid #e2e8f0',
                      zIndex: 100,
                    }}
                  >
                    <Link
                      href="/university"
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: '#1e293b',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a', marginBottom: '2px' }}>
                        Real Estate Executive Business Course
                      </strong>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, lineHeight: 1.35, display: 'block' }}>
                        Learn Property Management + Brokerage, get Upward Certified, and build a business or career.
                      </span>
                    </Link>
                    <Link
                      href="/university/landlord"
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: '#1e293b',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a', marginBottom: '2px' }}>
                        Free Landlord Programme
                      </strong>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, lineHeight: 1.35, display: 'block' }}>
                        Protect your income and property with free, practical training for landlords.
                      </span>
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/for-landlord">Landlord</Link>
              <Link href="/for-pm">Property Managers</Link>
              <Link href="/blog">Blog</Link>
            </nav>
          </div>

          <div className="marketing-header__actions">
            <Link href="/login" className="marketing-header__sign-in">
              Sign In
            </Link>
            <Link href="/signup" className="marketing-header__cta">
              GET STARTED
            </Link>
            <button
              type="button"
              className="marketing-header__menu-btn"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="marketing-mobile-menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        id="marketing-mobile-menu"
        className="marketing-mobile-menu"
        hidden={!mobileMenuOpen}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="marketing-mobile-menu__top">
          <Link href="/" className="marketing-header__brand" onClick={() => setMobileMenuOpen(false)}>
            <div className="marketing-header__logo">
              <img src="/favicon.svg" alt="Upward" />
            </div>
            <span className="marketing-header__name">UPWARD</span>
          </Link>
          <button
            type="button"
            className="marketing-mobile-menu__close"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="marketing-mobile-menu__links" aria-label="Mobile">
          <Link href="/request-a-home" onClick={() => setMobileMenuOpen(false)}>
            Request a Home
          </Link>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              setUniModalOpen(true)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              fontWeight: 600,
              fontSize: '1.125rem',
              textAlign: 'left',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>
              Upward University{' '}
              <span
                style={{
                  background: '#d97757',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '99px',
                  textTransform: 'uppercase',
                }}
              >
                NEW
              </span>
            </span>
          </button>
          <Link href="/for-landlord" onClick={() => setMobileMenuOpen(false)}>
            Landlord
          </Link>
          <Link href="/for-pm" onClick={() => setMobileMenuOpen(false)}>
            Property Managers
          </Link>
          {showBlog && (
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)}>
              Blog
            </Link>
          )}
          <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
            Sign In
          </Link>
        </nav>

        <div className="marketing-mobile-menu__cta-wrap">
          <Link href="/signup" className="marketing-mobile-menu__cta" onClick={() => setMobileMenuOpen(false)}>
            GET STARTED
          </Link>
        </div>
      </div>

      {/* Upward University Mobile Modal */}
      {uniModalOpen && (
        <>
          <div
            onClick={() => setUniModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#ffffff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px 20px 32px',
              zIndex: 9999,
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
              maxWidth: '500px',
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h3 style={{ fontFamily: 'sans-serif', fontWeight: 700, fontSize: '18px', color: '#0f172a', margin: 0 }}>
                Upward University
              </h3>
              <button
                type="button"
                onClick={() => setUniModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Select a programme to explore:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Link
                href="/university"
                onClick={() => setUniModalOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 0',
                  borderTop: 'none',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                    Real Estate Executive Business Course
                  </span>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>→</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.45, margin: 0, fontWeight: 400 }}>
                  Learn Property Management + Brokerage, get Upward Certified, and build a business or career.
                </p>
              </Link>
              <Link
                href="/university/landlord"
                onClick={() => setUniModalOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 0',
                  borderTop: '1px solid #f1f5f9',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                    Free Landlord Programme
                  </span>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>→</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.45, margin: 0, fontWeight: 400 }}>
                  Protect your income and property with free, practical training for landlords.
                </p>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}

