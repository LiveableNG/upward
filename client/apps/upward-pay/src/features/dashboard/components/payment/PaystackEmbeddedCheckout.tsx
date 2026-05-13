'use client'

import React, { useEffect, useState, useRef } from 'react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { api } from '@/lib/api'

const usePaystackPayment = typeof window !== 'undefined'
  ? require('react-paystack').usePaystackPayment
  : null

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

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''

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
  const [config, setConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const triggered = useRef(false)

  useEffect(() => {
    async function init() {
      try {
        const description =
          lineItems.length > 0
            ? `Breakdown: ${lineItems.map((item) => `${item.name} (N${item.amount.toLocaleString()})`).join(', ')}`
            : `${paymentType || 'Rent payment'} for ${propertyAddress || companyName}`

        const res = await api.initializePayment({
          amount: amount + (gatewayFee || 0),
          paymentRequestUuid,
          metadata: {
            ...metadata,
            description,
            lineItems,
            paymentType,
            propertyAddress,
          }
        })

        if (res.data) {
          setConfig({
            reference: res.data.reference,
            access_code: res.data.access_code,
            email: email,
            amount: Math.round((amount + (gatewayFee || 0)) * 100),
            publicKey: PAYSTACK_PUBLIC_KEY,
            currency: currency || 'NGN',
            metadata: {
              custom_fields: [
                { display_name: 'Company', variable_name: 'company', value: companyName },
                { display_name: 'Description', variable_name: 'description', value: description }
              ],
              ...metadata
            }
          })
        }
      } catch (err: any) {
        console.error('Failed to initialize payment:', err)
        setError(err.message || 'Failed to connect to payment gateway')
        setTimeout(onClose, 3000)
      }
    }
    init()
  }, [])

  const initializePayment = usePaystackPayment && config
    ? usePaystackPayment(config)
    : null

  useEffect(() => {
    if (initializePayment && config && !triggered.current) {
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
  }, [initializePayment, config])

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
          {error || 'Securely establishing connection to Payment Gateway...'}
        </p>
      </div>
      {!error && (
        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Please do not close this window.
        </p>
      )}
    </div>
  )
}
