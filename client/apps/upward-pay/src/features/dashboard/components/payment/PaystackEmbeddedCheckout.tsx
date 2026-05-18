'use client'

import React, { useEffect, useState, useRef } from 'react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { api } from '@/lib/api'
import DedicatedAccountCheckout from './DedicatedAccountCheckout'
import { useToast } from '@/components/common/Toast'

interface PaystackEmbeddedProps {
  email: string
  amount: number
  currency?: string
  reference?: string
  companyName: string
  paymentType?: string
  propertyAddress?: string
  subaccount?: string
  onSuccess: (reference: string) => void
  onClose: () => void
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
  lineItems?: Array<{ name: string; amount: number }>
  gatewayFee?: number
  paymentRequestUuid?: string
}

export default function PaystackEmbeddedCheckout({
  email,
  amount,
  currency = 'NGN',
  companyName,
  paymentType,
  propertyAddress,
  onSuccess,
  onClose,
  metadata = {},
  lineItems = [],
  gatewayFee = 0,
  paymentRequestUuid,
}: PaystackEmbeddedProps) {
  const toast = useToast()
  const [config, setConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const description =
          lineItems.length > 0
            ? `Breakdown: ${lineItems.map((item) => `${item.name} (N${item.amount.toLocaleString()})`).join(', ')}`
            : `${paymentType || 'Rent payment'} for ${propertyAddress || companyName}`

        const res = await api.initializePayment({
          amount,
          paymentRequestUuid,
          metadata: {
            ...metadata,
            description,
            lineItems,
            paymentType,
            propertyAddress,
          }
        })

        if (res && res.type === 'DVA') {
          setConfig({
            type: 'DVA',
            dva: res.dva,
            reference: res.reference,
            amount: res.amount
          })
        } else {
          throw new Error('Direct bank transfer is required for this property, but the payment account could not be resolved. Please contact support.')
        }
      } catch (err: any) {
        console.error('Failed to initialize payment:', err)
        const errorMsg = err.message || 'Failed to connect to payment gateway'
        setError(errorMsg)
        toast.error(errorMsg, 'Payment Initialization Failed')
      }
    }
    init()
  }, [])

  if (config?.type === 'DVA') {
    return (
      <DedicatedAccountCheckout
        accountNumber={config.dva.accountNumber}
        accountName={config.dva.accountName}
        bankName={config.dva.bankName}
        amount={config.amount}
        reference={config.reference}
        companyName={companyName}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    )
  }

  return (
    <div
      className="dashboard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: 20,
      }}
    >
      <div className="pay-page__splash">
        <div className="pay-page__logo-pulse">
          <UpwardLogo size={28} color="#fff" />
        </div>
        <p className="pay-page__splash-text" style={{ maxWidth: '480px', lineHeight: '1.6' }}>
          {error || 'Securely establishing connection to Payment Gateway...'}
        </p>
      </div>
      {!error ? (
        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Please do not close this window.
        </p>
      ) : (
        <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
          <button 
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
              background: 'transparent',
              color: 'var(--text-color, #fff)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            Go Back
          </button>
          {error.includes('phone number') && (
            <button 
              onClick={() => window.location.href = '/dashboard?tab=profile'} 
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--clay, #dc2626)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              Go to Profile
            </button>
          )}
        </div>
      )}
    </div>
  )
}
