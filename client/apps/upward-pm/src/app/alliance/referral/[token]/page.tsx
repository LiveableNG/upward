'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { request } from '@/lib/api-client'
import { Loader2, ArrowRight, ShieldCheck, Home, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function AllianceReferralLandingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [referralContext, setReferralContext] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    if (!token) return

    let isMounted = true
    async function resolveToken() {
      try {
        setIsLoading(true)
        const res = await request<any>(`/public/alliance/referrals/${token}`, { method: 'GET' })
        if (isMounted) {
          const data = res?.data ?? res
          setReferralContext(data)
          // If listing is found, automatically route or allow direct view
          if (data?.listing?.uuid) {
            router.replace(`/alliance/discover/${data.listing.uuid}?ref=${encodeURIComponent(token)}`)
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setIsError(true)
          setErrorMessage(err.message || 'Unable to resolve referral link.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    resolveToken()
    return () => {
      isMounted = false
    }
  }, [token, router])

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <Loader2
          size={36}
          className="animate-spin"
          style={{ color: 'var(--forest)', marginBottom: '16px' }}
        />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
          Connecting to Property Opportunity...
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Resolving secure Alliance referral attribution.
        </p>
      </div>
    )
  }

  if (isError || !referralContext) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            marginBottom: '16px',
          }}
        >
          <Home size={28} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>
          Referral Link Expired or Not Found
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 0 24px' }}>
          {errorMessage || 'This exclusive co-brokerage referral link is no longer valid or has already expired.'}
        </p>
        <Link
          href="/alliance/referrals"
          className="btn btn--primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Return to Referrals Pipeline</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <CheckCircle2 size={40} style={{ color: 'var(--forest)', marginBottom: '16px' }} />
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        Verified Referral Opportunity
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        {referralContext?.listing?.title || 'Alliance Property Listing'}
      </p>
      {referralContext?.listing?.uuid && (
        <Link
          href={`/alliance/discover/${referralContext.listing.uuid}?ref=${encodeURIComponent(token)}`}
          className="btn btn--primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span>View Property Details</span>
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  )
}
