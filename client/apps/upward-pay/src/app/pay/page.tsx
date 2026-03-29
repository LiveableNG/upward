'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type PaymentRequestData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, Smartphone, MapPin, CreditCard, X, ShieldCheck, ArrowLeft } from 'lucide-react'
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
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    // Check if running in a native app (Capacitor)
    const checkPlatform = async () => {
      const { Capacitor } = await import('@capacitor/core')
      setIsNative(Capacitor.isNativePlatform())
    }
    checkPlatform()
  }, [])

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

    // Mandatory login check
    if (!userLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(`/pay?token=${token}`)}`)
      return
    }

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
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
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
          onLogin={() =>
            router.push(
              `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
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
        <div className="pay-page__header-left">
          {userLoggedIn ? (
            <button
              className="dashboard__icon-btn"
              onClick={() => router.push('/dashboard')}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={20} color="var(--text)" />
            </button>
          ) : (
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', background: 'var(--clay)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UpwardLogo size={16} color="#fff" />
              </div>
              Upward
            </div>
          )}
        </div>
        <div className="pay-page__header-right">
          {userLoggedIn && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => router.push('/dashboard?noRedirect=true')}
              style={{ padding: '8px 12px' }}
            >
              Dashboard
            </button>
          )}
          {!isNative && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => window.open('https://upward.ng/download', '_blank')}
              style={{ padding: '8px 12px' }}
            >
              Get App
            </button>
          )}
        </div>
      </header>

      {/* Web Promo Banner */}
      {!isNative && (
        <div className="pay-page__web-promo">
          <span className="pay-page__web-promo-icon"><Smartphone size={20} /></span>
          <div className="pay-page__web-promo-content">
            <p className="pay-page__web-promo-title">Experience Upward on Mobile</p>
            <p className="pay-page__web-promo-text">Get the app to build your rent credibility and enjoy more benefits.</p>
          </div>
          <button className="pay-page__web-promo-close" onClick={() => setIsNative(true)}><X size={14} /></button>
        </div>
      )}

      {/* Company + Property */}
      <div className="pay-page__company-section">
        <CompanyHeader name={data.company.name} logoUrl={data.company.logoUrl} />
        {data.property && (
          <div className="pay-page__property">
            <span className="pay-page__property-icon"><MapPin size={14} /></span>
            <span>
              {data.property.name} — {data.property.address}
            </span>
          </div>
        )}
      </div>

      <div className="dashboard__main-grid" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
        <div className="dashboard__col--left">
          {/* Big Amount */}
          <div className="pay-page__amount-hero">
            <span className="pay-page__amount-label">Amount Due</span>
            <span className="pay-page__amount-value">
              {formatCurrency(data.paymentRequest.totalAmount, data.paymentRequest.currency)}
            </span>
          </div>

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
            {userLoggedIn && data.tenant && (
              <div className="pay-page__saved-method">
                <div className="pay-page__saved-icon"><CreditCard size={20} /></div>
                <div>
                  <span className="pay-page__saved-label">Quick pay as</span>
                  <span className="pay-page__saved-name">{data.tenant.fullName}</span>
                </div>
              </div>
            )}

            <button className="btn btn--primary btn--full btn--pay" onClick={handlePay}>
              {userLoggedIn
                ? 'Confirm & Pay'
                : `Login to Pay ${formatCurrency(data.paymentRequest.totalAmount, data.paymentRequest.currency)}`}
            </button>

            <p className="pay-page__secure-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--clay)" />
              Encrypyted and Secure
            </p>
          </div>
        </div>

        <div className="dashboard__col--right" style={{ paddingTop: '80px' }}>
          <div className="dashboard__adverts">
             <div className="dashboard__ad-card dashboard__ad-card--primary" style={{ cursor: 'default' }}>
                <div className="dashboard__ad-badge">Info</div>
                <h4 className="dashboard__ad-title">Pay Anywhere</h4>
                <p className="dashboard__ad-desc">Upward Pay is universally supported across desktop, tablet, and mobile platforms securely.</p>
                <div className="dashboard__ad-icon"><Smartphone size={40} /></div>
             </div>
          </div>
        </div>
      </div>

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
