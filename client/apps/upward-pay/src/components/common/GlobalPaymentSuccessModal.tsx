'use client'

import React, { useState, useEffect } from 'react'
import { Check, Star, X } from 'lucide-react'
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

      setEventData(detail)
      setIsOpen(true)

      const amountPaid = detail?.data?.amountPaid || detail?.amount || detail?.data?.amount || 0
      const formattedAmount = amountPaid > 0 ? formatCurrency(amountPaid) : 'Payment'
      success(`🎉 ${formattedAmount} received and confirmed!`, 'Payment Successful')
    }

    window.addEventListener('upward:payment.succeeded', handlePaymentSucceeded)

    return () => {
      window.removeEventListener('upward:payment.succeeded', handlePaymentSucceeded)
    }
  }, [success])

  if (!isOpen || !eventData) return null

  const rawAmount = eventData?.data?.amountPaid || eventData?.amount || eventData?.data?.amount || 0
  const narration = eventData?.data?.narration || eventData?.narration || 'DVA Bank Transfer'
  const isFullySettled = eventData?.data?.isFullySettled || false

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
          maxWidth: 420,
          backgroundColor: 'var(--surface, #ffffff)',
          borderRadius: 28,
          padding: '28px 24px 24px',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          position: 'relative',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 36,
            height: 36,
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
          <X size={20} />
        </button>

        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(34,197,94,0.35)',
            margin: '0 auto 20px',
          }}
        >
          <Check size={40} strokeWidth={3} />
        </div>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--text, #111827)',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          Payment Received!
        </h2>

        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary, #4b5563)',
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          Your transfer of{' '}
          <strong style={{ color: 'var(--text, #111827)', fontWeight: 700 }}>
            {formatCurrency(rawAmount)}
          </strong>{' '}
          ({narration}) has been confirmed and credited to your account.
        </p>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface2, #f9fafb)',
            borderRadius: 20,
            border: '1px solid var(--border, #e5e7eb)',
            textAlign: 'left',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: 'var(--clay, #c2410c)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Star size={14} fill="currentColor" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #111827)' }}>
              Upward Score Impact
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginTop: 2 }}>
              {isFullySettled
                ? 'Full rent settled! Your on-time payment record strengthens your credibility score.'
                : 'Payment recorded! Complete any remaining balance on time to maximize your score boost.'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          style={{
            width: '100%',
            height: 52,
            backgroundColor: 'var(--clay, #c2410c)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
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
