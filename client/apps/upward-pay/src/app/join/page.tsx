'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type InvitationData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { AlertTriangle, BarChart3, Zap, Receipt, TrendingUp, ShieldCheck, Star, ArrowRight } from 'lucide-react'
import CompanyHeader from '@/components/payment/CompanyHeader'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

function JoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [data, setData] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('Missing invitation token')
        setLoading(false)
        return
      }
      try {
        const result = await api.fetchInvitation(token)
        setData(result)

        // If already logged in → go to dashboard
        if (isLoggedIn()) {
          router.push('/dashboard')
          return
        }

        // If tenant already has an account (signed up) → redirect to login
        const status = result.tenantSignupStatus
        if (status === 'app_installed' || status === 'web_only') {
          router.push(
            `/login?redirect=/dashboard&email=${encodeURIComponent(result.invitation.tenantEmail)}`,
          )
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, router])

  if (loading) {
    return (
      <div className="join-page">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
          <p className="pay-page__splash-text">Loading invitation…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="join-page">
        <div className="pay-page__error">
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
          <h2>Invalid Invitation</h2>
          <p>{error || 'This invitation link is no longer valid.'}</p>
        </div>
        <PoweredByUpward className="pay-page__footer-badge" />
      </div>
    )
  }

  return (
    <div className="join-page">
      <header className="join-page__header">
        <PoweredByUpward />
      </header>

      <div className="join-page__hero">
        <CompanyHeader name={data.company.name} logoUrl={data.company.logoUrl} />

        <div className="join-page__welcome-card">
          <div className="join-page__badge">
             <Star size={12} fill="var(--clay)" color="var(--clay)" />
             Exclusive Invitation
          </div>
          <h1 className="join-page__title">Your New Rent Experience Starts Here</h1>
          <p className="join-page__subtitle">
            <strong>{data.company.name}</strong> has chosen Upward to manage your property. 
            Join thousands of tenants building their financial future with every rent payment.
          </p>

          <div className="join-page__identity-preview">
             <div className="join-page__id-avatar">{data.invitation.tenantName?.charAt(0) || 'T'}</div>
             <div className="join-page__id-info">
                <span className="join-page__id-name">{data.invitation.tenantName}</span>
                <span className="join-page__id-email">{data.invitation.tenantEmail}</span>
             </div>
             <div className="join-page__id-status">
                <ShieldCheck size={12} />
                Verified PM Data
             </div>
          </div>
        </div>
      </div>

      {/* Benefits unified card */}
      <div className="join-page__content-card">
        <h3 className="join-page__section-title">What happens next?</h3>
        
        <div className="join-page__feature-list">
          <div className="join-page__feature-item">
            <div className="join-page__feature-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><TrendingUp size={18} /></div>
            <div className="join-page__feature-text">
               <strong>Build Rent Credibility</strong>
               <p>Your on-time payments are recorded and used to build a verified tenant legacy.</p>
            </div>
          </div>
          <div className="join-page__feature-item">
            <div className="join-page__feature-icon" style={{ background: 'rgba(217, 119, 87, 0.1)', color: 'var(--clay)' }}><Receipt size={18} /></div>
            <div className="join-page__feature-text">
               <strong>Instant Digital Proof</strong>
               <p>Get professional receipts instantly for every payment, signed by your property manager.</p>
            </div>
          </div>
          <div className="join-page__feature-item">
            <div className="join-page__feature-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Zap size={18} /></div>
            <div className="join-page__feature-text">
               <strong>Seamless Payments</strong>
               <p>Eliminate bank stress. Pay your property manager in 30 seconds from your phone.</p>
            </div>
          </div>
        </div>

        <div className="join-page__cta-box">
          <button
            className="btn btn--primary btn--full btn--pay"
            onClick={() =>
              router.push(
                `/complete-profile?email=${encodeURIComponent(data.invitation.tenantEmail)}&name=${encodeURIComponent(data.invitation.tenantName || '')}`,
              )
            }
          >
            Complete My Profile <ArrowRight size={18} />
          </button>
          <p className="join-page__cta-note">Takes less than 30 seconds to set your password.</p>
        </div>
      </div>

      <div className="join-page__login-row">
        Already have an account?{' '}
        <button
          onClick={() =>
            router.push(
              `/login?redirect=/dashboard&email=${encodeURIComponent(data.invitation.tenantEmail)}`,
            )
          }
        >
          Sign in here
        </button>
      </div>

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="join-page">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse">
              <UpwardLogo size={28} color="#fff" />
            </div>
          </div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  )
}
