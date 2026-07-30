'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const showBlog= 'true'
  // const showBlog = process.env.NEXT_PUBLIC_ENABLE_BLOG_LINK === 'true'

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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
              <Link href="/for-landlord">Landlords</Link>
              <Link href="/for-pm">Property Managers</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/request-a-home">Request a Home</Link>
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
          <Link href="/for-landlord" onClick={() => setMobileMenuOpen(false)}>
            Landlords
          </Link>
          {showBlog && (
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)}>
              Blog
            </Link>
          )}
          <Link href="/for-pm" onClick={() => setMobileMenuOpen(false)}>
            Property Managers
          </Link>
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
    </>
  )
}

