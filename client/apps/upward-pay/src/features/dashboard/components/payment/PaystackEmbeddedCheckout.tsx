'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { api } from '@/lib/api'
import DedicatedAccountCheckout from './DedicatedAccountCheckout'
import { useToast } from '@/components/common/Toast'
import { sessionTracker } from '@/lib/sessionTracker'

interface LineItem {
  name: string
  amount: number
}

interface PaystackTransaction {
  reference: string
}

interface PaystackPopupInstance {
  resumeTransaction: (
    accessCode: string,
    callbacks: {
      onSuccess: (transaction: PaystackTransaction) => void
      onCancel: () => void
    },
  ) => void
}

type PaystackWindow = Window & {
  PaystackPop?: new () => PaystackPopupInstance
}

type CheckoutConfig =
  | {
      type: 'PAYSTACK'
      accessCode: string
      reference?: string
      amount: number
    }
  | {
      type: 'DVA'
      dva: {
        accountNumber: string
        accountName: string
        bankName: string
        userPropertyId?: number
      }
      reference: string
      amount: number
    }

// Deduplicate React StrictMode double-mounts / rapid double-clicks on payment initialization
const inFlightPaymentInits = new Map<
  string,
  { promise: ReturnType<typeof api.initializePayment>; expiresAt: number }
>()

function deduplicatedInitializePayment(
  payload: Parameters<typeof api.initializePayment>[0],
) {
  const key = JSON.stringify({
    amount: payload.amount,
    paymentRequestUuid: payload.paymentRequestUuid,
    lineItems: payload.metadata?.lineItems,
    excludeBenefits: payload.metadata?.excludeBenefits,
  })
  const now = Date.now()
  const existing = inFlightPaymentInits.get(key)
  if (existing && existing.expiresAt > now) {
    return existing.promise
  }
  const promise = api.initializePayment(payload).catch((err) => {
    inFlightPaymentInits.delete(key)
    throw err
  })
  inFlightPaymentInits.set(key, { promise, expiresAt: now + 3500 })
  return promise
}

interface PaystackEmbeddedProps {
  email: string
  amount: number
  currency?: string
  reference?: string
  accessCode?: string
  companyName: string
  paymentType?: string
  propertyAddress?: string
  subaccount?: string
  onSuccess: (reference: string) => void
  onClose: () => void
  metadata?: Record<string, unknown>
  lineItems?: LineItem[]
  gatewayFee?: number
  paymentRequestUuid?: string
}

export default function PaystackEmbeddedCheckout({
  amount,
  reference,
  accessCode,
  companyName,
  paymentType,
  propertyAddress,
  onSuccess,
  onClose,
  metadata = {},
  lineItems = [],
  paymentRequestUuid,
}: PaystackEmbeddedProps) {
  const toast = useToast()
  const [initializedConfig, setInitializedConfig] = useState<CheckoutConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const openedAccessCodeRef = useRef<string | null>(null)
  const onSuccessRef = useRef(onSuccess)
  const onCloseRef = useRef(onClose)
  const toastRef = useRef(toast)

  const config = useMemo<CheckoutConfig | null>(
    () =>
      accessCode
        ? {
            type: 'PAYSTACK',
            accessCode,
            reference,
            amount,
          }
        : initializedConfig,
    [accessCode, reference, amount, initializedConfig],
  )

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onCloseRef.current = onClose
    toastRef.current = toast
  }, [onSuccess, onClose, toast])

  const lineItemsStr = JSON.stringify(lineItems)
  const metadataStr = JSON.stringify(metadata)

  useEffect(() => {
    if (accessCode) return
    let cancelled = false

    async function init() {
      try {
        const parsedLineItems = JSON.parse(lineItemsStr) as LineItem[]
        const parsedMetadata = JSON.parse(metadataStr) as Record<string, unknown>

        const description =
          parsedLineItems.length > 0
            ? `Breakdown: ${parsedLineItems.map((item) => `${item.name} (N${item.amount.toLocaleString()})`).join(', ')}`
            : `${paymentType || 'Rent payment'} for ${propertyAddress || companyName}`

        const res = await deduplicatedInitializePayment({
          amount,
          paymentRequestUuid,
          metadata: {
            ...parsedMetadata,
            description,
            lineItems: parsedLineItems,
            paymentType,
            propertyAddress,
          }
        })

        if (cancelled) return

        if (res && res.type === 'DVA' && res.dva) {
          setInitializedConfig({
            type: 'DVA',
            dva: res.dva,
            reference: res.reference,
            amount: res.amount,
          })
        } else if (res && res.type === 'PAYSTACK') {
          if (!res.accessCode) {
            throw new Error('Standard checkout is required, but the payment access code could not be resolved. Please contact support.')
          }
          setInitializedConfig({
            type: 'PAYSTACK',
            accessCode: res.accessCode,
            reference: res.reference,
            amount: res.amount,
          })
        } else {
          throw new Error('Direct bank transfer is required for this property, but the payment account could not be resolved. Please contact support.')
        }
      } catch (err: unknown) {
        if (cancelled) return
        console.error('Failed to initialize payment:', err)
        const errorMsg =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to connect to payment gateway'
        setError(errorMsg)
        toastRef.current.error(errorMsg, 'Payment Initialization Failed')
      }
    }
    init()

    return () => {
      cancelled = true
    }
  }, [accessCode, amount, companyName, lineItemsStr, metadataStr, paymentRequestUuid, paymentType, propertyAddress])

  useEffect(() => {
    let cancelled = false

    sessionTracker.trackEvent('OPEN_CHECKOUT_MODAL', {
      amount,
      paymentType,
      companyName,
      paymentRequestUuid,
    }, 'CHECKOUT_MODAL')

    if (config?.type === 'PAYSTACK' && config.accessCode) {
      if (openedAccessCodeRef.current === config.accessCode) {
        return
      }
      openedAccessCodeRef.current = config.accessCode

      const scriptId = 'paystack-inline-js'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      const paystackWindow = window as PaystackWindow

      const openPaystackPopup = () => {
        if (cancelled) return
        try {
          const PaystackPop = paystackWindow.PaystackPop
          if (!PaystackPop) {
            throw new Error('Paystack checkout library is not ready.')
          }

          sessionTracker.trackEvent('INITIATE_PAYSTACK', {
            accessCode: config.accessCode,
            amount: config.amount,
            reference: config.reference,
          }, 'PAYSTACK_POPUP')

          const popup = new PaystackPop()
          popup.resumeTransaction(config.accessCode, {
            onSuccess: (transaction: PaystackTransaction) => {
              sessionTracker.trackEvent('PAYMENT_SUCCESS', {
                reference: transaction.reference,
                amount: config.amount,
              }, 'PAYMENT_COMPLETE')
              onSuccessRef.current(transaction.reference)
            },
            onCancel: () => {
              sessionTracker.trackEvent('PAYSTACK_CLOSED_UNPAID', {
                amount: config.amount,
                accessCode: config.accessCode,
                reference: config.reference,
              }, 'PAYSTACK_CANCELLED')
              onCloseRef.current()
            },
          })
        } catch (popupErr: unknown) {
          console.error('Paystack popup error:', popupErr)
          openedAccessCodeRef.current = null
          const popupErrMsg =
            popupErr instanceof Error && popupErr.message
              ? popupErr.message
              : 'Failed to open Paystack secure checkout popup'
          sessionTracker.trackEvent('PAYMENT_ERROR', {
            error: popupErrMsg,
            accessCode: config.accessCode,
          }, 'PAYSTACK_ERROR')
          setError('Failed to open Paystack secure checkout popup.')
          toastRef.current.error('Failed to load payment modal', 'Payment Error')
        }
      }

      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://js.paystack.co/v2/inline.js'
        script.async = true
        script.onload = openPaystackPopup
        script.onerror = () => {
          if (cancelled) return
          openedAccessCodeRef.current = null
          sessionTracker.trackEvent('PAYMENT_ERROR', {
            error: 'Failed to load Paystack payment script from CDN',
          }, 'CDN_ERROR')
          setError('Failed to load Paystack payment library.')
          toastRef.current.error('Could not load Paystack checkout script', 'Network Error')
        }
        document.body.appendChild(script)
      } else {
        if (paystackWindow.PaystackPop) {
          openPaystackPopup()
        } else {
          script.addEventListener('load', openPaystackPopup, { once: true })
        }
      }
    }

    return () => {
      cancelled = true
    }
  }, [config, amount, paymentType, companyName, paymentRequestUuid])

  if (config?.type === 'DVA') {
    const metadataUserPropertyId =
      typeof metadata?.userPropertyId === 'number' ? metadata.userPropertyId : undefined
    return (
      <DedicatedAccountCheckout
        accountNumber={config.dva.accountNumber}
        accountName={config.dva.accountName}
        bankName={config.dva.bankName}
        amount={config.amount}
        reference={config.reference}
        companyName={companyName}
        paymentRequestUuid={paymentRequestUuid}
        userPropertyId={config.dva?.userPropertyId ?? metadataUserPropertyId}
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
