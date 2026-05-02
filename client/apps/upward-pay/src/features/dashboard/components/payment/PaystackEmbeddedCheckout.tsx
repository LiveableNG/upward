'use client'

import React, { useEffect, useState, useRef } from 'react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { generateId } from '@/lib/utils'
const usePaystackPayment = typeof window !== 'undefined'
  ? require('react-paystack').usePaystackPayment
  : null

interface PaystackEmbeddedProps {
  email: string
  amount: number // in NGN mostly, check how we format
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
}

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''

export default function PaystackEmbeddedCheckout({
  email,
  amount,
  currency = 'NGN',
  reference,
  companyName,
  paymentType,
  propertyAddress,
  onSuccess,
  onClose,
  subaccount,
  metadata = {},
  lineItems = [],
}: PaystackEmbeddedProps) {
  const [init, setInit] = useState(false)
  const triggered = useRef(false)

  const config = React.useMemo(() => {
    const description =
      lineItems.length > 0
        ? `Breakdown: ${lineItems.map((item) => `${item.name} (N${item.amount.toLocaleString()})`).join(', ')}`
        : `${paymentType || 'Rent payment'} for ${propertyAddress || companyName}`

    const upwardFee = lineItems.find(i => (i as any).name === 'Upward Processing Fee' || (i as any).label === 'Upward Processing Fee');
    const totalAmountKobo = Math.round((amount || 0) * 100);
    const transactionCharge = upwardFee ? Math.min(2000 * 100, totalAmountKobo) : undefined;

    return {
      reference: reference || generateId(),
      email: email,
      amount: Math.round((amount || 0) * 100), // Paystack expects Kobo as integer
      publicKey: PAYSTACK_PUBLIC_KEY,
      currency: currency || 'NGN',
      channels: ['bank_transfer'],
      subaccount: subaccount,
      transaction_charge: transactionCharge,
      metadata: {
        custom_fields: [
          {
            display_name: null,
            variable_name: null,
            value: companyName ||null,
          },
          {
            display_name: null,
            variable_name: null,
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

  const initializePayment = usePaystackPayment
    ? usePaystackPayment(config)
    : null

  useEffect(() => {
    if (!initializePayment) return

    if (!init && PAYSTACK_PUBLIC_KEY) {
      setInit(true)
      initializePayment({
        onSuccess: (res: any) => {
          if (triggered.current) return
          triggered.current = true
          onSuccess(res.reference)
        },
        onClose: () => {
          if (triggered.current) return
          triggered.current = true
          onClose()
        },
      })
    }
  }, [init, initializePayment])

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
