'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, Info, ShieldCheck, ArrowRight, Loader2, RefreshCcw } from 'lucide-react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { api } from '@/lib/api'

interface DedicatedAccountCheckoutProps {
  accountNumber: string
  accountName: string
  bankName: string
  amount: number
  reference: string
  companyName: string
  onSuccess: (reference: string) => void
  onClose: () => void
}

export default function DedicatedAccountCheckout({
  accountNumber,
  accountName,
  bankName,
  amount,
  reference,
  companyName,
  onSuccess,
  onClose,
}: DedicatedAccountCheckoutProps) {
  const [copied, setCopied] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = async () => {
    setIsVerifying(true)
    setVerifyError(null)
    try {
      const res = await api.verifyPayment(reference)
      if (res?.isVerified || res?.status === 'SUCCESS' || res?.status === 'PAID') {
        onSuccess(reference)
      } else {
        setVerifyError("Payment not detected yet. It might take a few minutes for the bank to process the transfer.")
      }
    } catch (err: any) {
      setVerifyError("Unable to verify at the moment. Please try again in a minute.")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="psk-overlay">
      <div className="psk-checkout">
        <div className="psk-header">
          <div className="psk-header__left">
            <UpwardLogo size={20} color="var(--clay)" />
            <span>Secure Checkout</span>
          </div>
          <button className="psk-close" onClick={onClose}>
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="psk-banner">
          <span className="psk-banner__to">Paying to</span>
          <span className="psk-banner__company">{companyName}</span>
          <span className="psk-banner__amount">₦{amount.toLocaleString()}</span>
        </div>

        <div className="psk-body">
          <div className="psk-method-badge">
            <Banknote size={14} />
            <span>Bank Transfer</span>
          </div>

          <p className="psk-transfer-instruction">
            Please make a transfer of <strong>₦{amount.toLocaleString()}</strong> to the account below:
          </p>

          <div className="psk-account-details">
            <div className="psk-account-row">
              <span className="psk-account-label">Bank Name</span>
              <span className="psk-account-value">{bankName}</span>
            </div>
            <div className="psk-account-row">
              <span className="psk-account-label">Account Name</span>
              <span className="psk-account-value">{accountName}</span>
            </div>
            <div className="psk-account-row psk-account-row--action">
              <div className="psk-account-row">
                <span className="psk-account-label">Account Number</span>
                <span className="psk-account-value psk-account-value--big">{accountNumber}</span>
              </div>
              <button className="psk-copy-btn" onClick={handleCopy} title="Copy Account Number">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="psk-info-note" style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
            <Info size={16} style={{ color: 'var(--clay)', marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Your payment will be automatically detected. Once you've completed the transfer, click the button below.
            </p>
          </div>
          
          {verifyError && (
             <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 12, textAlign: 'center' }}>
                {verifyError}
             </p>
          )}

          <div className="psk-actions" style={{ marginTop: 32 }}>
            <button 
              className="dashboard-btn dashboard-btn--primary" 
              style={{ width: '100%', height: 48 }}
              onClick={() => handleConfirm()}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span style={{ marginLeft: 8 }}>Checking Payment...</span>
                </>
              ) : (
                <>
                  <span>I've Made the Payment</span>
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>
          </div>

          <div className="psk-footer-text">
            <ShieldCheck size={12} color="var(--success)" />
            <span>Secured by Paystack & Upward</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Banknote({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}
