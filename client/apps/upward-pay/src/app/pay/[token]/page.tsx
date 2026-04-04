'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import FallbackSuspense from '@/components/FallbackSuspense'
import { Check, Star, Crown, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'

type GuestStep = 'loading' | 'checkout' | 'processing' | 'success' | 'onboarding'

export default function GuestPayPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [step, setStep] = useState<GuestStep>('loading')
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [requestData, setRequestData] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    loadRequestData()
  }, [token])

  async function loadRequestData() {
    try {
      // Mock API call to get guest payment info from token
      // In real life, maps to GET /api/v1/payments/request/:token
      const data = await api.getPaymentRequest(token).catch(() => ({
        companyName: 'Livable Properties',
        companyAddress: '12-14 Kingsway Road, Ikoyi, Lagos',
        totalAmount: 450000,
        tenantFirstName: 'Guest',
        tenantLastName: 'User',
        tenantEmail: 'guest@example.com',
        invoiceNumber: 'INV-REQ-921',
      }))
      setRequestData(data)
      setStep('checkout')
    } catch (e) {
      console.error(e)
    }
  }

  const handleSuccess = (_ref: string) => {
    setStep('processing')
    setTimeout(() => setStep('success'), 1500)
  }

  if (step === 'loading') {
    return <FallbackSuspense message="Retrieving secure payment details..." />
  }

  if (step === 'checkout' && requestData) {
    return (
      <div style={{ background: 'var(--surface)', minHeight: '100vh', padding: 20 }}>
        {/* Minimal UI Wrapper around Paystack specifically for guests */}
        <div
          style={{
            maxWidth: 480,
            margin: '40px auto 20px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Rent Payment</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Paying {requestData.companyName}
            </p>
          </div>
          <div
            style={{
              padding: '24px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border-solid)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 4,
              }}
            >
              Amount Due
            </span>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>
              {formatCurrency(requestData.totalAmount)}
            </div>
          </div>

          <div style={{ height: 400, position: 'relative' }}>
            <PaystackEmbeddedCheckout
              email={requestData.tenantEmail || 'guest@example.com'}
              amount={requestData.totalAmount}
              companyName={requestData.companyName}
              reference={`GST-${new Date().getTime()}`}
              onSuccess={handleSuccess}
              onClose={() => {
                /* Guest can't navigate back, do nothing or show warning */
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg)',
          textAlign: 'center',
          gap: 20,
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '3px solid var(--border-solid)',
            borderTopColor: 'var(--clay)',
            animation: 'spin 1s linear infinite',
            boxShadow: '0 0 30px var(--clay-glow)',
          }}
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Processing payment safely
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Secured by Upward</div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg)',
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <style>{`@keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }`}</style>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--success) 0%, #16a34a 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
            marginBottom: 24,
            animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          <Check size={32} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          Payment Successful!
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 40,
            maxWidth: 300,
          }}
        >
          Your payment of <strong>{formatCurrency(requestData.totalAmount)}</strong> has been
          processed for <strong>{requestData.companyName}</strong>.
        </p>

        <button
          onClick={() => setStep('onboarding')}
          className="btn btn--primary"
          style={{ padding: '0 32px' }}
        >
          Continue <ArrowRight size={18} style={{ marginLeft: 8 }} />
        </button>
      </div>
    )
  }

  if (step === 'onboarding') {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          background: 'var(--bg)',
          minHeight: '100vh',
          padding: '60px 24px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '8px 16px',
            background: 'var(--clay-faint)',
            borderRadius: 100,
            color: 'var(--clay)',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 24,
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Crown size={18} /> Welcome to Upward
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 12,
            lineHeight: 1.15,
          }}
        >
          Claim your payment history
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            marginBottom: 32,
            lineHeight: 1.5,
          }}
        >
          You're already halfway there! We securely recorded your payment today. Complete your setup
          now to unlock benefits verified tenants enjoy.
        </p>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-solid)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Star size={18} color="var(--clay)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Why complete your profile?</span>
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: 13,
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} color="var(--success)" /> Build your Rent Credibility Score
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} color="var(--success)" /> Get verified rent receipts anytime
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} color="var(--success)" /> Access Rent Savings tools
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Email Address
          </label>
          <input
            type="text"
            value={requestData.tenantEmail}
            readOnly
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--border-solid)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 15,
              color: 'var(--text-muted)',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Full Name
          </label>
          <input
            type="text"
            value={`${requestData.tenantFirstName} ${requestData.tenantLastName}`}
            readOnly
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--border-solid)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 15,
              color: 'var(--text-muted)',
            }}
          />
        </div>

        <button
          onClick={() => router.push('/signup?claim=true')}
          className="btn btn--primary btn--full"
          style={{ marginBottom: 12 }}
        >
          Complete Setup Securely
        </button>
        <button
          onClick={() => router.push('/dashboard/receipts')}
          className="btn btn--secondary btn--full"
        >
          Download receipt & leave
        </button>
      </div>
    )
  }

  return null
}
