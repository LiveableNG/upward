'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type InvitationData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { AlertTriangle, BarChart3, Zap, Receipt } from 'lucide-react'
import CompanyHeader from '@/components/payment/CompanyHeader'
import BenefitChips from '@/components/payment/BenefitChips'
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
          <h1 className="join-page__title">Welcome to Upward</h1>
          <p className="join-page__subtitle">
            <strong>{data.company.name}</strong> has invited you to manage your rent payments
            through Upward — a simpler, smarter way to pay.
          </p>

          {data.invitation.tenantName && (
            <div className="join-page__tenant-name">
              Hi {data.invitation.tenantName.split(' ')[0]},
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="join-page__benefits">
        <h3 className="join-page__benefits-title">Why tenants love Upward</h3>

        <div className="join-page__benefit-list">
          <div className="join-page__benefit-item">
            <div className="join-page__benefit-icon"><BarChart3 size={20} /></div>
            <div>
              <strong>Payment History</strong>
              <p>Every payment recorded. Build your rent credibility for future apartments.</p>
            </div>
          </div>
          <div className="join-page__benefit-item">
            <div className="join-page__benefit-icon"><Zap size={20} /></div>
            <div>
              <strong>Hassle-Free Payments</strong>
              <p>Pay rent in one tap. No bank queues, no stress, no missed deadlines.</p>
            </div>
          </div>
          <div className="join-page__benefit-item">
            <div className="join-page__benefit-icon"><Receipt size={20} /></div>
            <div>
              <strong>Digital Receipts</strong>
              <p>Verified proof of every payment — receipts in your property manager&apos;s name.</p>
            </div>
          </div>
        </div>
      </div>

      <BenefitChips variant="scroll" />

      {/* CTA */}
      <div className="join-page__cta">
        <button
          className="btn btn--primary btn--full"
          onClick={() =>
            router.push(
              `/signup?email=${encodeURIComponent(data.invitation.tenantEmail)}&name=${encodeURIComponent(data.invitation.tenantName || '')}&from=invite`,
            )
          }
        >
          Create Your Account
        </button>
        <p className="join-page__cta-note">Free. Takes 30 seconds.</p>
        
        <div className="join-page__login-link">
          Already have an account?{' '}
          <button
            onClick={() =>
              router.push(
                `/login?redirect=/dashboard&email=${encodeURIComponent(data.invitation.tenantEmail)}`,
              )
            }
          >
            Log in
          </button>
        </div>
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
