'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'
import { Check, Clipboard, Key, CreditCard, Download, ChevronDown, ChevronUp, Beaker, ToggleLeft, ToggleRight, Loader2, UserX, Sparkles } from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { api } from '@/lib/api'
import { Capacitor } from '@capacitor/core'

export default function HomePage() {
  const router = useRouter()
  const loggedIn = isLoggedIn()
  const [toast, setToast] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [showGuestCredentials, setShowGuestCredentials] = useState(false)
  const [isSarahPaid, setIsSarahPaid] = useState(false)
  const [isJamesPaid, setIsJamesPaid] = useState(false)
  const [isTogglingS, setIsTogglingS] = useState(false)
  const [isTogglingJ, setIsTogglingJ] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (isLoggedIn()) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  if (Capacitor.isNativePlatform()) {
    return (
      <div className="home-page">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
          <p className="pay-page__splash-text">Upward Pay</p>
        </div>
      </div>
    )
  }

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

          {/* ── Simulation Controls ── */}
          <div className="home-page__sim-control">
            <div className="home-page__sim-header">
              <span className="home-page__sim-icon"><Beaker size={18} /></span>
              <span className="home-page__sim-label">Simulation Control</span>
            </div>

            {/* Sarah's toggle */}
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
                  if (isTogglingS) return
                  setIsTogglingS(true)
                  try {
                    const nextStatus = isSarahPaid ? 'pending' : 'paid'
                    await api.togglePaymentStatus('pay-token-001', nextStatus)
                    setIsSarahPaid(!isSarahPaid)
                    setToast(`Sarah's status: ${nextStatus.toUpperCase()}`)
                    setTimeout(() => setToast(''), 2000)
                  } catch {
                    setToast('Failed to toggle status')
                    setTimeout(() => setToast(''), 2000)
                  } finally {
                    setIsTogglingS(false)
                  }
                }}
                disabled={isTogglingS}
              >
                {isTogglingS ? <Loader2 className="animate-spin" size={20} /> : (isSarahPaid ? <ToggleRight size={32} /> : <ToggleLeft size={32} />)}
              </button>
            </div>

            {/* James's toggle */}
            <div className="home-page__sim-item">
              <div className="home-page__sim-info">
                <span className="home-page__sim-item-title">James&apos; Payment Status</span>
                <span className={`home-page__sim-status ${isJamesPaid ? 'home-page__sim-status--paid' : ''}`}>
                  {isJamesPaid ? '● Paid' : '○ Pending'}
                </span>
              </div>
              <button
                className={`home-page__sim-toggle ${isJamesPaid ? 'home-page__sim-toggle--active' : ''}`}
                onClick={async () => {
                  if (isTogglingJ) return
                  setIsTogglingJ(true)
                  try {
                    const nextStatus = isJamesPaid ? 'pending' : 'paid'
                    await api.togglePaymentStatus('pay-token-guest-001', nextStatus)
                    setIsJamesPaid(!isJamesPaid)
                    setToast(`James' status: ${nextStatus.toUpperCase()}`)
                    setTimeout(() => setToast(''), 2000)
                  } catch {
                    setToast('Failed to toggle status')
                    setTimeout(() => setToast(''), 2000)
                  } finally {
                    setIsTogglingJ(false)
                  }
                }}
                disabled={isTogglingJ}
              >
                {isTogglingJ ? <Loader2 className="animate-spin" size={20} /> : (isJamesPaid ? <ToggleRight size={32} /> : <ToggleLeft size={32} />)}
              </button>
            </div>
          </div>

          <p className="home-page__test-title">Invite Link Scenarios</p>
          
          <div className="home-page__flow-block">
            <div className="home-page__flow-label">
              <span className="home-page__flow-badge" style={{ backgroundColor: 'var(--success-faint)', color: 'var(--success)' }}>Scenario 1: Signed Up</span>
            </div>
            <button
              className="home-page__test-link"
              onClick={() => copyLink('/join?token=inv-token-sarah', 'Invite link (Sarah)')}
            >
              <span className="home-page__test-link-icon"><Check size={18} /></span>
              <div>
                <span className="home-page__test-link-label">Already Signed Up (Goes to Login)</span>
                <span className="home-page__test-link-desc">For users who already have an account. Automatically redirects to login.</span>
              </div>
              <span className="home-page__test-link-copy"><Clipboard size={14} /></span>
            </button>
          </div>

          <div className="home-page__flow-block">
            <div className="home-page__flow-label">
              <span className="home-page__flow-badge" style={{ backgroundColor: 'var(--clay-faint)', color: 'var(--clay)' }}>Scenario 2: Invited (Not Signed Up)</span>
            </div>
            <button
              className="home-page__test-link"
              onClick={() => copyLink('/join?token=inv-token-001', 'Invite link (David)')}
            >
              <span className="home-page__test-link-icon"><Sparkles size={18} /></span>
              <div>
                <span className="home-page__test-link-label">Invited But Not Signed Up (Goes to Completion)</span>
                <span className="home-page__test-link-desc">For users we have info on. Leads to the invitation/completion page.</span>
              </div>
              <span className="home-page__test-link-copy"><Clipboard size={14} /></span>
            </button>
          </div>

          <div className="home-page__flow-block">
            <div className="home-page__flow-label">
              <span className="home-page__flow-badge" style={{ backgroundColor: 'var(--text-muted-faint)', color: 'var(--text-muted)' }}>Scenario 3: Organic Discovery</span>
            </div>
            <button
              className="home-page__test-link"
              onClick={() => copyLink('/signup', 'Signup link')}
            >
              <span className="home-page__test-link-icon"><UserX size={18} /></span>
              <div>
                <span className="home-page__test-link-label">New User (Goes to Signup)</span>
                <span className="home-page__test-link-desc">For users who came via advert or chance. Leads to full signup.</span>
              </div>
              <span className="home-page__test-link-copy"><Clipboard size={14} /></span>
            </button>
          </div>

          <p className="home-page__test-title">Quick Simulation Links</p>

          {/* ── Flow 1: Sarah (Registered) ── */}
          <div className="home-page__flow-block">
            <div className="home-page__flow-label">
              <span className="home-page__flow-badge home-page__flow-badge--registered">Registered User</span>
            </div>
            <button
              className="home-page__test-link"
              onClick={() => copyLink('/pay?token=pay-token-001', 'Payment link (Sarah)')}
            >
              <span className="home-page__test-link-icon"><CreditCard size={18} /></span>
              <div>
                <span className="home-page__test-link-label">Payment — Sarah Johnson</span>
                <span className="home-page__test-link-desc">Pre-filled tenant · requires sign-in to pay</span>
              </div>
              <span className="home-page__test-link-copy"><Clipboard size={14} /></span>
            </button>

            <div className="home-page__mock-disclosure">
              <button
                className="home-page__mock-disclosure-trigger"
                onClick={() => setShowCredentials(!showCredentials)}
              >
                <span className="home-page__test-link-icon"><Key size={18} /></span>
                <span className="home-page__test-link-label">Sarah&apos;s Login Credentials</span>
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

          {/* ── Flow 2: James (Guest — Not Signed Up) ── */}
          <div className="home-page__flow-block">
            <div className="home-page__flow-label">
              <span className="home-page__flow-badge home-page__flow-badge--guest">Guest (Not Signed Up)</span>
            </div>
            <button
              className="home-page__test-link home-page__test-link--guest"
              onClick={() => copyLink('/pay?token=pay-token-guest-001', 'Payment link (James)')}
            >
              <span className="home-page__test-link-icon"><UserX size={18} /></span>
              <div>
                <span className="home-page__test-link-label">Payment — James Okafor</span>
                <span className="home-page__test-link-desc">PM-sourced tenant · no login required · guest pay flow</span>
              </div>
              <span className="home-page__test-link-copy"><Clipboard size={14} /></span>
            </button>

            <div className="home-page__mock-disclosure">
              <button
                className="home-page__mock-disclosure-trigger"
                onClick={() => setShowGuestCredentials(!showGuestCredentials)}
              >
                <span className="home-page__test-link-icon"><Key size={18} /></span>
                <span className="home-page__test-link-label">James&apos; Details (PM Data)</span>
                <span className="home-page__disclosure-arrow">
                  {showGuestCredentials ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {showGuestCredentials && (
                <div className="home-page__mock-disclosure-content">
                  <div className="home-page__credential-item" style={{ cursor: 'default' }}>
                    <span>Name:</span> <strong>James Okafor</strong>
                  </div>
                  <div className="home-page__credential-item" onClick={() => copyToClipboard('james.okafor@email.com', 'Email')}>
                    <span>Email:</span> <strong>james.okafor@email.com</strong> <Clipboard size={12} />
                  </div>
                  <div className="home-page__credential-note">
                    ⚠️ James has no password yet. He pays as a guest,<br/>
                    then sets a password via &quot;Complete Profile&quot;.
                  </div>
                </div>
              )}
            </div>

            {/* Guest flow walkthrough */}
            <div className="home-page__flow-steps">
              <div className="home-page__flow-step">
                <div className="home-page__flow-step-num">1</div>
                <span>Open the link → James sees invoice (no login prompt)</span>
              </div>
              <div className="home-page__flow-step">
                <div className="home-page__flow-step-num">2</div>
                <span>Clicks &quot;Pay&quot; → enters Paystack checkout</span>
              </div>
              <div className="home-page__flow-step">
                <div className="home-page__flow-step-num">3</div>
                <span>Sees success page with Upward benefits + &quot;Complete Profile&quot; CTA</span>
              </div>
              <div className="home-page__flow-step">
                <div className="home-page__flow-step-num">4</div>
                <span>Sets password → account created → goes to dashboard</span>
              </div>
            </div>
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
