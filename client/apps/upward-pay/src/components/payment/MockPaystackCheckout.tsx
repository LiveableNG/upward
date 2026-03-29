'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { ShieldCheck, X, Building2, Copy, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

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
 * Simplified Mock Paystack Checkout
 * Focused on the "Transfer" flow with zero manual inputs.
 */
export default function MockPaystackCheckout({
  amount,
  currency,
  reference,
  companyName,
  onSuccess,
  onClose,
}: PaystackCheckoutProps) {
  const [step, setStep] = useState<'transfer' | 'verifying' | 'success'>('transfer')

  function handleConfirmSent() {
    setStep('verifying')
    // Simulate verification delay
    setTimeout(() => {
      setStep('success')
      // Small delay before closing the mock and notifying the parent
      setTimeout(() => {
        onSuccess(reference)
      }, 1500)
    }, 2500)
  }

  return (
    <div className="psk-overlay">
      <div className="psk-checkout">
        {/* Header */}
        <div className="psk-header">
          <div className="psk-header__left">
            <ShieldCheck size={18} color="var(--clay)" />
            <span>Upward Pay</span>
          </div>
          <button className="psk-close" onClick={onClose} disabled={step === 'verifying'}>
            <X size={18} />
          </button>
        </div>

        {/* Amount banner */}
        <div className="psk-banner">
          <span className="psk-banner__to">Pay</span>
          <span className="psk-banner__company">{companyName}</span>
          <span className="psk-banner__amount">{formatCurrency(amount, currency)}</span>
        </div>

        {/* Step Content */}
        {step === 'transfer' && (
          <div className="psk-body">
            <div className="psk-method-badge">
              <Building2 size={14} />
              <span>Simulated Bank Transfer</span>
            </div>

            <div className="psk-transfer-box">
              <p className="psk-transfer-instruction">
                Transfer exactly <strong>{formatCurrency(amount, currency)}</strong> to the account below:
              </p>

              <div className="psk-account-details">
                <div className="psk-account-row">
                  <span className="psk-account-label">Bank</span>
                  <span className="psk-account-value">Upward Test Bank</span>
                </div>
                <div className="psk-account-row psk-account-row--action">
                  <div className="psk-account-col">
                    <span className="psk-account-label">Account Number</span>
                    <span className="psk-account-value psk-account-value--big">0123456789</span>
                  </div>
                  <button className="psk-copy-btn" onClick={() => {}}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="psk-expiry-timer">
                Expires in 29:59
              </div>
            </div>

            <div className="psk-actions">
              <button className="psk-btn psk-btn--primary" onClick={handleConfirmSent}>
                I have sent the money <ArrowRight size={16} />
              </button>
              <button className="psk-btn psk-btn--text" onClick={onClose}>
                Change Payment Method
              </button>
            </div>

            <p className="psk-footer-text">
              <ShieldCheck size={10} style={{ marginRight: 4 }} color="var(--clay)" />
              Secured by Upward
            </p>
          </div>
        )}

        {/* Verifying Step */}
        {step === 'verifying' && (
          <div className="psk-body psk-body--center">
            <div className="psk-status-hero">
              <Loader2 size={48} className="psk-spinner" />
              <h3>Verifying Transfer</h3>
              <p>We&apos;re confirming your bank transfer. This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {/* Success Step (Temporary feedback) */}
        {step === 'success' && (
          <div className="psk-body psk-body--center">
            <div className="psk-status-hero psk-status-hero--success">
              <CheckCircle2 size={48} color="#22c55e" />
              <h3>Payment Successful</h3>
              <p>Your transfer was verified successfully.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
