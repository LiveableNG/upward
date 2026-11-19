'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Ticket, Sparkles, CheckCircle2, ShoppingBag, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import { SignupFormFlow } from '@/features/auth/component/signup/SignupFormFlow'
import { GoogleAuthProvider } from '@/features/auth/components/GoogleAuthProvider'
import { setStoredSignupCampaignTag } from '@/features/auth/services/authService'
import { useToast } from '@/components/common/Toast'

function VoucherSignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { isLoggedIn, loading } = useAuth()
  const [authInitialized, setAuthInitialized] = useState(false)
  const [isReturningUser, setIsReturningUser] = useState(false)

  const initialEmail = searchParams.get('email') || ''
  const campaignTag =
    searchParams.get('campaign')?.trim() ||
    searchParams.get('tag')?.trim() ||
    searchParams.get('utm_campaign')?.trim() ||
    'voucher-signup'

  useEffect(() => {
    setStoredSignupCampaignTag(campaignTag)
  }, [campaignTag])

  useEffect(() => {
    if (!loading && !authInitialized) {
      if (isLoggedIn) {
        setIsReturningUser(true)
      }
      setAuthInitialized(true)
    }
  }, [loading, isLoggedIn, authInitialized])

  useEffect(() => {
    if (!loading && isLoggedIn && authInitialized && isReturningUser) {
      router.replace('/dashboard/lifestyle')
    }
  }, [isLoggedIn, loading, authInitialized, isReturningUser, router])

  if (loading) return <FallbackSuspense message="Preparing your promotional voucher…" />

  return (
    <div className="promo-voucher-signup">
      {/* Promotional Voucher Campaign Header Banner */}
      <div
        className="promo-voucher-signup__banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(217, 119, 87, 0.14) 0%, rgba(217, 119, 87, 0.05) 100%)',
          border: '1px solid rgba(217, 119, 87, 0.35)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--clay)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Ticket size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--clay)',
            }}
          >
            <Sparkles size={12} />
            <span>Special Promotional Campaign ({campaignTag})</span>
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text)',
              marginTop: 2,
            }}
          >
            Complete registration to unlock your ₦1,000 Marketplace Voucher
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            Automatically credited to your account upon sign-up and redeemable on any Upward Marketplace purchase.
          </div>
        </div>
      </div>

      <SignupFormFlow
        initialEmail={initialEmail}
        campaignTag={campaignTag}
        onBackToWelcome={() => router.push('/signup')}
        onSignupSuccess={() => {
          toast.success(
            'Your ₦1,000 Promotional Voucher has been credited to your account!',
            'Voucher Unlocked',
          )
          router.replace('/dashboard/lifestyle')
        }}
      />
    </div>
  )
}

export default function PromotionalVoucherSignupPage() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(217, 119, 87, 0.18)',
              border: '1px solid rgba(217, 119, 87, 0.4)',
              color: 'var(--clay)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            <Ticket size={15} />
            <span>Upward Promotional Reward</span>
          </div>

          <h1>Claim Your ₦1,000 Marketplace Voucher.</h1>
          <p>
            Join Upward through this promotional link and receive an instant ₦1,000
            discount voucher towards products, home essentials, and services on the
            Upward Marketplace.
          </p>

          <div
            style={{
              marginTop: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              textAlign: 'left',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <CheckCircle2 size={18} color="var(--clay)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                  Instant ₦1,000 Sign-Up Voucher
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}>
                  Credited automatically to your voucher balance as soon as your registration completes.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <ShoppingBag size={18} color="var(--clay)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                  Stackable with In-App Vouchers
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}>
                  Earn additional ₦1,000 vouchers by completing your income, career, and home insurance goals.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <ShieldCheck size={18} color="var(--clay)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                  Redeem on the Upward Marketplace
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}>
                  Your accumulated voucher balance is automatically applied at checkout when shopping on Upward.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-layout__form">
        <GoogleAuthProvider>
          <Suspense fallback={<FallbackSuspense message="Loading promotional sign-up…" />}>
            <VoucherSignupPageContent />
          </Suspense>
        </GoogleAuthProvider>
      </div>
    </div>
  )
}
