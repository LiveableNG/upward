'use client'

import React, { useEffect, useState, useRef } from 'react'
import { usePaystackPayment } from 'react-paystack'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { generateId } from '@/lib/utils'

interface PaystackEmbeddedProps {
  email: string
  amount: number // in NGN mostly, check how we format
  currency?: string
  reference?: string
  companyName: string
  onSuccess: (reference: string) => void
  onClose: () => void
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
  lineItems?: Array<{ label: string; amount: number }>
}

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''

export default function PaystackEmbeddedCheckout({
  email,
  amount,
  currency = 'NGN',
  reference,
  companyName,
  onSuccess,
  onClose,
  metadata = {},
  lineItems = [],
}: PaystackEmbeddedProps) {
  const [init, setInit] = useState(false)
  const triggered = useRef(false)

  const config = React.useMemo(() => {
    const description =
      lineItems.length > 0
        ? `Breakdown: ${lineItems.map((item) => `${item.label} (N${item.amount.toLocaleString()})`).join(', ')}`
        : `Rent payment to ${companyName}`

    return {
      reference: reference || generateId('UPW'),
      email: email,
      amount: Math.round((amount || 0) * 100), // Paystack expects Kobo as integer
      publicKey: PAYSTACK_PUBLIC_KEY,
      currency: currency || 'NGN',
      metadata: {
        custom_fields: [
          {
            display_name: 'Recipient Company',
            variable_name: 'recipient_company',
            value: companyName || 'Upward Partner',
          },
          {
            display_name: 'Payment Description',
            variable_name: 'description',
            value: description,
          },
        ],
        line_items: lineItems,
        ...metadata,
      },
    }
  }, [email, amount, reference, companyName, currency, metadata, lineItems])

  // Debug log after memoization to track stability
  useEffect(() => {
    if (config.amount <= 0) {
      console.warn('Paystack Warning: Amount is 0 or negative', config.amount)
    }
    console.log('Paystack Config Stabilized:', {
      amountKobo: config.amount,
      email: config.email,
      publicKey: PAYSTACK_PUBLIC_KEY ? `${PAYSTACK_PUBLIC_KEY.slice(0, 8)}...` : 'MISSING',
    })
  }, [config])

  const initializePayment = usePaystackPayment(config)

  useEffect(() => {
    if (!init && PAYSTACK_PUBLIC_KEY) {
      setInit(true)
      try {
        initializePayment({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSuccess: (res: any) => {
            if (triggered.current) return
            triggered.current = true
            console.log('Payment Successful:', res)
            onSuccess(res.reference)
          },
          onClose: () => {
            if (triggered.current) return
            triggered.current = true
            console.log('Payment Closed')
            onClose()
          },
        })
      } catch (err) {
        console.error('Paystack Initialization Error:', err)
      }
    } else if (!PAYSTACK_PUBLIC_KEY && !init) {
      setInit(true)
      console.error(
        'CRITICAL: Paystack Public Key (NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) is missing from your environment variables.',
      )
    }
  }, [init, initializePayment, onSuccess, onClose])

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
        <p className="pay-page__splash-text">
          Securely establishing connection to Payment Gateway...
        </p>
      </div>
      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
        Please do not close this window.
      </p>
    </div>
  )
}
