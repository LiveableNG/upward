'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type PaymentRequestData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import CompanyHeader from '@/components/payment/CompanyHeader'
import InvoiceCard from '@/components/payment/InvoiceCard'
import BenefitChips from '@/components/payment/BenefitChips'
import PaymentSuccess from '@/components/payment/PaymentSuccess'
import MockPaystackCheckout from '@/components/payment/MockPaystackCheckout'

type Stage = 'loading' | 'invoice' | 'checkout' | 'processing' | 'success' | 'error'

function PaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [stage, setStage] = useState<Stage>('loading')
  const [data, setData] = useState<PaymentRequestData | null>(null)
  const [error, setError] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const userLoggedIn = isLoggedIn()

  useEffect(() => {
    if (token) {
      loadPaymentRequest()
    }
  }, [token])

  async function loadPaymentRequest() {
    if (!token) return
    try {
      const result = await api.fetchPaymentRequest(token)
      setData(result)

      // If already paid, show success
      if (result.paymentRequest.status === 'paid') {
        setStage('success')
        return
      }

      // Pre-fill email for logged-in users — no longer needed for guest
      setStage('invoice')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment')
      setStage('error')
    }
  }

  // Payment init data for Paystack checkout
  const [checkoutData, setCheckoutData] = useState<{
    reference: string
    amount: number
    currency: string
    email: string
  } | null>(null)

  async function handlePay() {
    if (!data || !token) return

    const email = data.tenant?.email || ''

    try {
      // Step 1: Initialize payment on backend → get reference
      const initResult = await api.initializePayment({
        paymentToken: token,
        email,
      })

      // Step 2: Open Paystack checkout with the returned data
      setCheckoutData({
        reference: initResult.data.reference,
        amount: initResult.data.amount,
        currency: initResult.data.currency,
        email,
      })
      setStage('checkout')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed')
      setStage('error')
    }
  }

  async function handlePaystackSuccess(reference: string) {
    setStage('processing')
    try {
      // Step 3: Verify payment on backend
      const verifyResult = await api.verifyPayment(reference)
      setReceiptNumber(verifyResult.data.receipt.invoiceNumber)
      setStage('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed')
      setStage('error')
    }
  }

  function handlePaystackClose() {
    setStage('invoice')
    setCheckoutData(null)
  }

  /* ─── Paystack Checkout ─── */
  if (stage === 'checkout' && checkoutData && data) {
    return (
      <MockPaystackCheckout
        email={checkoutData.email}
        amount={checkoutData.amount}
        currency={checkoutData.currency}
        reference={checkoutData.reference}
        companyName={data.company.name}
        onSuccess={handlePaystackSuccess}
        onClose={handlePaystackClose}
      />
    )
  }

  /* ─── Loading ─── */
  if (stage === 'loading') {
    return (
      <div className="pay-page">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
          <p className="pay-page__splash-text">Securing your transaction…</p>
        </div>
      </div>
    )
  }

  /* ─── Error ─── */
  if (stage === 'error') {
    return (
      <div className="pay-page">
        <div className="pay-page__error">
          <div className="pay-page__error-icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button
            className="btn btn--secondary"
            onClick={() => {
              setStage('loading')
              loadPaymentRequest()
            }}
          >
            Try Again
          </button>
        </div>
        <PoweredByUpward className="pay-page__footer-badge" />
      </div>
    )
  }

  if (!data) return null

  /* ─── Success ─── */
  if (stage === 'success') {
    return (
      <div className="pay-page">
        <PaymentSuccess
          amount={data.paymentRequest.totalAmount}
          currency={data.paymentRequest.currency}
          invoiceNumber={receiptNumber || data.paymentRequest.invoiceNumber}
          companyName={data.company.name}
          isLoggedIn={userLoggedIn}
          onSignUp={() =>
            router.push(
              `/signup?email=${encodeURIComponent(data.tenant?.email || '')}&from=payment`,
            )
          }
          onGoToDashboard={() => router.push('/dashboard')}
        />
        <PoweredByUpward className="pay-page__footer-badge" />
      </div>
    )
  }

  /* ─── Processing ─── */
  if (stage === 'processing') {
    return (
      <div className="pay-page">
        <div className="pay-page__processing">
          <div className="pay-page__glow-ring" />
          <p className="pay-page__processing-text">Verifying payment…</p>
          <p className="pay-page__processing-sub">Please don&apos;t close this page</p>
        </div>
      </div>
    )
  }

  /* ─── Invoice Review ─── */
  return (
    <div className="pay-page">
      {/* Top Bar */}
      <header className="pay-page__header">
        {userLoggedIn ? (
          <span className="pay-page__greeting">
            Welcome back, {data.tenant?.fullName?.split(' ')[0]}
          </span>
        ) : (
          <PoweredByUpward />
        )}
      </header>

      {/* Company + Property */}
      <div className="pay-page__company-section">
        <CompanyHeader name={data.company.name} logoUrl={data.company.logoUrl} />
        {data.property && (
          <div className="pay-page__property">
            <span className="pay-page__property-icon">📍</span>
            <span>
              {data.property.name} — {data.property.address}
            </span>
          </div>
        )}
      </div>

      {/* Big Amount */}
      <div className="pay-page__amount-hero">
        <span className="pay-page__amount-label">Amount Due</span>
        <span className="pay-page__amount-value">
          {formatCurrency(data.paymentRequest.totalAmount, data.paymentRequest.currency)}
        </span>
      </div>

      {/* Benefits (guest only) */}
      {!userLoggedIn && <BenefitChips variant="scroll" />}

      {/* Invoice Details */}
      <InvoiceCard
        invoiceNumber={data.paymentRequest.invoiceNumber}
        notes={data.paymentRequest.notes}
        lineItems={data.lineItems}
        totalAmount={data.paymentRequest.totalAmount}
        currency={data.paymentRequest.currency}
        status={data.paymentRequest.status}
      />

      {/* Payment Tray */}
      <div className="pay-page__tray">
        {!userLoggedIn && (
          <>
            {/* If tenant is known & signed up, suggest login */}
            {data.tenant &&
              (data.tenant.signupStatus === 'app_installed' ||
                data.tenant.signupStatus === 'web_only') && (
                <div className="pay-page__login-hint">
                  <span className="pay-page__login-hint-icon">👋</span>
                  <div>
                    <span className="pay-page__login-hint-text">
                      Hey {data.tenant.fullName.split(' ')[0]},{' '}
                      <button
                        onClick={() =>
                          router.push(
                            `/login?redirect=${encodeURIComponent(`/pay?token=${token}`)}`,
                          )
                        }
                      >
                        log in
                      </button>{' '}
                      for faster checkout
                    </span>
                    <span className="pay-page__login-hint-sub">
                      or just pay below — we&apos;ll save your record
                    </span>
                  </div>
                </div>
              )}
          </>
        )}

        {userLoggedIn && data.tenant && (
          <div className="pay-page__saved-method">
            <div className="pay-page__saved-icon">💳</div>
            <div>
              <span className="pay-page__saved-label">Quick pay as</span>
              <span className="pay-page__saved-name">{data.tenant.fullName}</span>
            </div>
          </div>
        )}

        <button className="btn btn--primary btn--full btn--pay" onClick={handlePay}>
          {userLoggedIn
            ? 'Confirm & Pay'
            : `Pay ${formatCurrency(data.paymentRequest.totalAmount, data.paymentRequest.currency)}`}
        </button>

        <p className="pay-page__secure-note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          Secured by Paystack · 256-bit encryption
        </p>
      </div>

      {!userLoggedIn &&
        !data.tenant?.signupStatus?.includes('app_installed') &&
        !data.tenant?.signupStatus?.includes('web_only') && (
          <div className="pay-page__login-link">
            Have an account?{' '}
            <button
              onClick={() =>
                router.push(`/login?redirect=${encodeURIComponent(`/pay?token=${token}`)}`)
              }
            >
              Log in
            </button>
          </div>
        )}

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="pay-page">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse">
              <UpwardLogo size={28} color="#fff" />
            </div>
            <p className="pay-page__splash-text">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}
