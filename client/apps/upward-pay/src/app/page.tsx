'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'
import { UpwardLogo } from '@/components/payment/PoweredByUpward'

export default function HomePage() {
  const router = useRouter()
  const loggedIn = isLoggedIn()
  const [toast, setToast] = useState('')

  function copyLink(path: string, label: string) {
    const fullUrl = `${window.location.origin}${path}`
    navigator.clipboard.writeText(fullUrl).then(() => {
      setToast(`${label} copied!`)
      setTimeout(() => setToast(''), 2000)
    })
  }

  return (
    <div className="home-page">
      <div className="home-page__content">
        <div className="pay-page__logo-pulse home-page__logo">
          <UpwardLogo size={28} color="#fff" />
        </div>
        <h1 className="home-page__title">Upward Pay</h1>
        <p className="home-page__subtitle">
          Secure rent payments, verified receipts, and payment history that builds your credibility.
        </p>

        <div className="home-page__actions">
          {loggedIn ? (
            <button className="btn btn--primary" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          ) : (
            <>
              <button className="btn btn--primary" onClick={() => router.push('/login')}>
                Sign In
              </button>
              <button className="btn btn--secondary" onClick={() => router.push('/signup')}>
                Create Account
              </button>
            </>
          )}
        </div>

        <div className="home-page__test-links">
          <p className="home-page__test-title">Deep Link Simulator</p>
          <button
            className="home-page__test-link"
            onClick={() => copyLink('/pay?token=pay-token-001', 'Payment link (Sarah)')}
          >
            <span className="home-page__test-link-icon">💳</span>
            <div>
              <span className="home-page__test-link-label">Payment — Sarah (registered)</span>
              <span className="home-page__test-link-desc">Known tenant · will suggest login</span>
            </div>
            <span className="home-page__test-link-copy">📋</span>
          </button>
          <button
            className="home-page__test-link"
            onClick={() => copyLink('/pay?token=pay-token-002', 'Payment link (David)')}
          >
            <span className="home-page__test-link-icon">💳</span>
            <div>
              <span className="home-page__test-link-label">Payment — David (guest)</span>
              <span className="home-page__test-link-desc">Not registered · guest checkout</span>
            </div>
            <span className="home-page__test-link-copy">📋</span>
          </button>
          <button
            className="home-page__test-link"
            onClick={() => copyLink('/join?token=inv-token-001', 'Invite link (David)')}
          >
            <span className="home-page__test-link-icon">✉️</span>
            <div>
              <span className="home-page__test-link-label">Invite — David (new user)</span>
              <span className="home-page__test-link-desc">Not registered · shows signup page</span>
            </div>
            <span className="home-page__test-link-copy">📋</span>
          </button>
          <button
            className="home-page__test-link"
            onClick={() => copyLink('/join?token=inv-token-sarah', 'Invite link (Sarah)')}
          >
            <span className="home-page__test-link-icon">✉️</span>
            <div>
              <span className="home-page__test-link-label">Invite — Sarah (registered)</span>
              <span className="home-page__test-link-desc">Has account · redirects to login</span>
            </div>
            <span className="home-page__test-link-copy">📋</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="home-toast">
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  )
}
