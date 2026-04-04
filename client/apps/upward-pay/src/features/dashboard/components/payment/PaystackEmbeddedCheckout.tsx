'use client'

import React, { useEffect, useState } from 'react'
import { usePaystackPayment } from 'react-paystack'
import { UpwardLogo } from '../../../../components/PoweredByUpward'

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
}

// Ensure the user replaces this with process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
// Fallback for tests if needed, but error out in production if missing.
const publicKey = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxx'

export default function PaystackEmbeddedCheckout({
  email,
  amount,
  currency = 'NGN',
  reference,
  companyName,
  onSuccess,
  onClose,
  metadata = {},
}: PaystackEmbeddedProps) {
  const [init, setInit] = useState(false)

  const config = {
    reference: reference || `UPW-${new Date().getTime().toString()}`,
    email,
    amount: amount * 100, // Paystack expects Kobo
    publicKey,
    currency,
    metadata: {
      custom_fields: [
        {
          display_name: 'Recipient Company',
          variable_name: 'recipient_company',
          value: companyName,
        },
      ],
      ...metadata,
    },
  }

  const initializePayment = usePaystackPayment(config)

  useEffect(() => {
    if (!init) {
      setInit(true)
      // Open paystack widget by default when mounted
      initializePayment({
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (res: any) => onSuccess(res.reference),
        onClose: () => onClose(),
      })
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
