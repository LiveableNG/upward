'use client'

import React, { useState, useEffect } from 'react'
import { Check, TrendingUp, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'

export function GlobalPaymentSuccessModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [eventData, setEventData] = useState<any>(null)
  const { success } = useToast()

  useEffect(() => {
    const handlePaymentSucceeded = (event: any) => {
      const detail = event.detail
      console.log('[GlobalPaymentSuccessModal] Received payment.succeeded event:', detail)

      // Suppress global modal if tenant is actively on the checkout page/flow
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname
        if (pathname.includes('/pay/') || pathname.includes('/pay-rent')) {
          console.log('[GlobalPaymentSuccessModal] Suppressing modal: user is on checkout page', pathname)
          return
        }
      }

      setEventData(detail)
      setIsOpen(true)

      const amountPaid = detail?.data?.amountPaid || detail?.amount || detail?.data?.amount || 0
      const formattedAmount = amountPaid > 0 ? formatCurrency(amountPaid) : 'Payment'
      success(`${formattedAmount} received and confirmed`, 'Payment Successful')
    }

    window.addEventListener('upward:payment.succeeded', handlePaymentSucceeded)

    return () => {
      window.removeEventListener('upward:payment.succeeded', handlePaymentSucceeded)
    }
  }, [success])

  if (!isOpen || !eventData) return null

  const rawAmount = eventData?.data?.amountPaid || eventData?.amount || eventData?.data?.amount || 0
  const narration = eventData?.data?.narration || eventData?.narration || 'Bank Transfer'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: 'var(--surface, #ffffff)',
          borderRadius: 24,
          padding: '24px 20px 20px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          position: 'relative',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--surface2, #f3f4f6)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary, #6b7280)',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
            margin: '0 auto 16px',
          }}
        >
          <Check size={32} strokeWidth={2.5} />
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text, #111827)',
            marginBottom: 6,
            letterSpacing: '-0.02em',
          }}
        >
          Payment Confirmed
        </h2>

        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary, #4b5563)',
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          <strong style={{ color: 'var(--text, #111827)', fontWeight: 700 }}>
            {formatCurrency(rawAmount)}
          </strong>{' '}
          ({narration}) has been credited to your account.
        </p>

        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--surface2, #f9fafb)',
            borderRadius: 16,
            border: '1px solid var(--border, #e5e7eb)',
            textAlign: 'left',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--clay-faint, #ffedd5)',
              color: 'var(--clay, #c2410c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #111827)' }}>
              Score Updated
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginTop: 2 }}>
              Your payment has been recorded to strengthen your on-time score.
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          style={{
            width: '100%',
            height: 48,
            backgroundColor: 'var(--clay, #c2410c)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
