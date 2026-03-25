'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface PaystackCheckoutProps {
  email: string
  amount: number
  currency: string
  reference: string
  companyName: string
  onSuccess: (reference: string) => void
  onClose: () => void
}

/**
 * Mock Paystack Inline Checkout
 * Simulates the real Paystack popup to demonstrate the payment flow.
 * Shows what data gets passed from the payment token → Paystack.
 *
 * In production, you'd use:
 *   PaystackPop.setup({ key, email, amount, ref, subaccount, callback, onClose })
 */
export default function MockPaystackCheckout({
  email,
  amount,
  currency,
  reference,
  companyName,
  onSuccess,
  onClose,
}: PaystackCheckoutProps) {
  const [step, setStep] = useState<'card' | 'otp' | 'verifying'>('card')
  const [cardNumber, setCardNumber] = useState('5078 5078 5078 5078')
  const [expiry, setExpiry] = useState('09/30')
  const [cvv, setCvv] = useState('')
  const [pin, setPin] = useState('')
  const [otp, setOtp] = useState('')

  function handlePayCard() {
    if (cvv.length < 3) return
    setStep('otp')
  }

  function handleVerifyOtp() {
    if (otp.length < 4) return
    setStep('verifying')
    // Simulate processing delay
    setTimeout(() => {
      onSuccess(reference)
    }, 2000)
  }

  return (
    <div className="psk-overlay">
      <div className="psk-checkout">
        {/* Header */}
        <div className="psk-header">
          <div className="psk-header__left">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>paystack</span>
          </div>
          <button className="psk-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Amount banner */}
        <div className="psk-banner">
          <span className="psk-banner__to">Pay</span>
          <span className="psk-banner__company">{companyName}</span>
          <span className="psk-banner__amount">{formatCurrency(amount, currency)}</span>
        </div>

        {/* Data Debug — what the token provides */}
        <div className="psk-debug">
          <div className="psk-debug__title">Data from Payment Token</div>
          <div className="psk-debug__row">
            <span>email</span>
            <span>{email}</span>
          </div>
          <div className="psk-debug__row">
            <span>amount</span>
            <span>
              {(amount / 100).toLocaleString()} {currency}
            </span>
          </div>
          <div className="psk-debug__row">
            <span>reference</span>
            <span className="psk-debug__mono">{reference}</span>
          </div>
          <div className="psk-debug__row">
            <span>currency</span>
            <span>{currency}</span>
          </div>
          <div className="psk-debug__row">
            <span>merchant</span>
            <span>{companyName}</span>
          </div>
        </div>

        {/* Card Step */}
        {step === 'card' && (
          <div className="psk-body">
            <div className="psk-tabs">
              <button className="psk-tab psk-tab--active">💳 Card</button>
              <button className="psk-tab">🏦 Bank</button>
              <button className="psk-tab">📱 USSD</button>
            </div>

            <div className="psk-field">
              <label>Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="0000 0000 0000 0000"
              />
            </div>

            <div className="psk-field-row">
              <div className="psk-field">
                <label>Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                />
              </div>
              <div className="psk-field">
                <label>CVV</label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="•••"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="psk-field">
              <label>PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter card PIN"
                maxLength={4}
              />
            </div>

            <button className="psk-btn" onClick={handlePayCard} disabled={cvv.length < 3}>
              Pay {formatCurrency(amount, currency)}
            </button>

            <p className="psk-footer-text">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
              </svg>
              Secured by Paystack
            </p>
          </div>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <div className="psk-body">
            <div className="psk-otp-info">
              <div className="psk-otp-icon">📱</div>
              <h3>Enter OTP</h3>
              <p>A one-time password has been sent to your phone and email.</p>
            </div>

            <div className="psk-field">
              <label>OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                maxLength={6}
                autoFocus
              />
            </div>

            <button className="psk-btn" onClick={handleVerifyOtp} disabled={otp.length < 4}>
              Verify Payment
            </button>
          </div>
        )}

        {/* Verifying Step */}
        {step === 'verifying' && (
          <div className="psk-body psk-body--center">
            <div className="psk-spinner" />
            <p className="psk-verifying-text">Verifying your payment…</p>
            <p className="psk-verifying-sub">Please don&apos;t close this window</p>
          </div>
        )}
      </div>
    </div>
  )
}
