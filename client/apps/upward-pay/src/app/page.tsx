'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'
import { Check, Clipboard, ShieldCheck, Key, CreditCard, Download, ChevronDown, ChevronUp, Beaker, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { api } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()
  const loggedIn = isLoggedIn()
  const [toast, setToast] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [isSarahPaid, setIsSarahPaid] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setToast(`${label} copied!`)
      setTimeout(() => setToast(''), 2000)
    })
  }

  function copyLink(path: string, label: string) {
    const fullUrl = `${window.location.origin}${path}`
    copyToClipboard(fullUrl, label)
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
            <button className="btn btn--primary btn--full" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          ) : (
            <button className="btn btn--primary btn--full" onClick={() => router.push('/login')}>
              Sign In to Get Started
            </button>
          )}
        </div>

        <div className="home-page__test-links">
          <div className="home-page__team-note">
            <span className="home-page__team-note-tag">Internal Test Only</span>
            <p>Team, use the links below to simulate the end-to-end payment and onboarding flows.</p>
          </div>

          <div className="home-page__sim-control">
            <div className="home-page__sim-header">
              <span className="home-page__sim-icon"><Beaker size={18} /></span>
              <span className="home-page__sim-label">Simulation Control</span>
            </div>
            <div className="home-page__sim-item">
              <div className="home-page__sim-info">
                <span className="home-page__sim-item-title">Sarah&apos;s Payment Status</span>
                <span className={`home-page__sim-status ${isSarahPaid ? 'home-page__sim-status--paid' : ''}`}>
                  {isSarahPaid ? '● Paid' : '○ Pending'}
                </span>
              </div>
              <button 
                className={`home-page__sim-toggle ${isSarahPaid ? 'home-page__sim-toggle--active' : ''}`}
                onClick={async () => {
                  if (isToggling) return
                  setIsToggling(true)
                  try {
                    const nextStatus = isSarahPaid ? 'pending' : 'paid'
                    await api.togglePaymentStatus('pay-token-001', nextStatus)
                    setIsSarahPaid(!isSarahPaid)
                    setToast(`Sarah's status: ${nextStatus.toUpperCase()}`)
                    setTimeout(() => setToast(''), 2000)
                  } catch (err) {
                    setToast('Failed to toggle status')
                    setTimeout(() => setToast(''), 2000)
                  } finally {
                    setIsToggling(false)
                  }
                }}
                disabled={isToggling}
              >
                {isToggling ? <Loader2 className="animate-spin" size={20} /> : (isSarahPaid ? <ToggleRight size={32} /> : <ToggleLeft size={32} />)}
              </button>
            </div>
          </div>

          <p className="home-page__test-title">Quick Simulation Links</p>
          
          <button
            className="home-page__test-link"
            onClick={() => copyLink('/pay?token=pay-token-001', 'Payment link (Sarah)')}
          >
            <span className="home-page__test-link-icon"><CreditCard size={18} /></span>
            <div>
              <span className="home-page__test-link-label">Payment — Sarah (registered)</span>
              <span className="home-page__test-link-desc">Pre-filled tenant · requires sign-in</span>
            </div>
            <span className="home-page__test-link-copy"><Clipboard size={14} /></span>
          </button>

          <div className="home-page__mock-disclosure">
            <button 
              className="home-page__mock-disclosure-trigger"
              onClick={() => setShowCredentials(!showCredentials)}
            >
              <span className="home-page__test-link-icon"><Key size={18} /></span>
              <span className="home-page__test-link-label">Mock Account Credentials</span>
              <span className="home-page__disclosure-arrow">
                {showCredentials ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            {showCredentials && (
              <div className="home-page__mock-disclosure-content">
                <div className="home-page__credential-item" onClick={() => copyToClipboard('sarah.johnson@email.com', 'Email')}>
                  <span>Email:</span> <strong>sarah.johnson@email.com</strong> <Clipboard size={12} />
                </div>
                <div className="home-page__credential-item" onClick={() => copyToClipboard('password123', 'Password')}>
                  <span>Pass:</span> <strong>password123</strong> <Clipboard size={12} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="home-page__download-promo">
          <p>Want to enjoy all benefits on the go?</p>
          <button 
            className="btn btn--secondary btn--sm"
            onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
          >
            <Download size={14} style={{ marginRight: '6px' }} /> Download the Upward App
          </button>
        </div>
      </div>

      <PoweredByUpward className="pay-page__footer-badge" />

      {/* Toast */}
      {toast && (
        <div className="home-toast">
          <span><Check size={16} /></span> {toast}
        </div>
      )}
    </div>
  )
}
