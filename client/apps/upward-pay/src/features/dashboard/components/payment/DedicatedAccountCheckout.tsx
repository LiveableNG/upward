'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Copy, Check, Info, ShieldCheck, ArrowRight, Loader2, X, RefreshCw, ArrowLeftRight } from 'lucide-react'
import { UpwardLogo } from '../../../../components/PoweredByUpward'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

type VerifyStatus = 'idle' | 'pending' | 'error' | 'refund'

interface DedicatedAccountCheckoutProps {
  accountNumber: string
  accountName: string
  bankName: string
  amount: number
  reference: string
  companyName: string
  userPropertyId?: number
  paymentRequestUuid?: string
  onSuccess: (reference: string) => void
  onClose: () => void
}

export default function DedicatedAccountCheckout({
  accountNumber: initialAccountNumber,
  accountName: initialAccountName,
  bankName: initialBankName,
  amount,
  reference,
  companyName,
  userPropertyId,
  paymentRequestUuid,
  onSuccess,
  onClose,
}: DedicatedAccountCheckoutProps) {
  const toast = useToast()
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber)
  const [accountName, setAccountName] = useState(initialAccountName)
  const [bankName, setBankName] = useState(initialBankName)
  const [isSwitching, setIsSwitching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle')
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Refs to track mounted state and the auto-close timeout
  const isMounted = useRef(true)
  const autoCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (autoCloseTimeout.current) {
        clearTimeout(autoCloseTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    setAccountNumber(initialAccountNumber)
    setAccountName(initialAccountName)
    setBankName(initialBankName)
  }, [initialAccountNumber, initialAccountName, initialBankName])

  const isWema = (bankName || '').toLowerCase().includes('wema')
  const currentDisplayName = isWema ? 'Wema Bank' : (bankName.toLowerCase().includes('titan') || bankName.toLowerCase().includes('paystack') ? 'Paystack-Titan' : bankName)
  const alternateDisplayName = isWema ? 'Paystack-Titan' : 'Wema Bank'

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSwitchBank = async () => {
    if (isSwitching) return
    setIsSwitching(true)
    try {
      const res = await api.switchDedicatedAccount({
        userPropertyId,
        paymentRequestUuid,
        preferredBank: isWema ? 'titan-paystack' : 'wema-bank',
      })
      if (res && res.accountNumber) {
        setAccountNumber(res.accountNumber)
        if (res.accountName) setAccountName(res.accountName)
        if (res.bankName) setBankName(res.bankName)
        setCopied(false)
        toast.success(`Switched to ${res.bankName || alternateDisplayName} account`)
      }
    } catch (err: any) {
      console.error('Failed to switch bank account:', err)
      toast.error(err.message || 'Could not generate alternate account. Please try again.')
    } finally {
      if (isMounted.current) {
        setIsSwitching(false)
      }
    }
  }

  const checkPayment = async (): Promise<boolean> => {
    try {
      const res = await api.verifyPayment(reference)

      if (!isMounted.current) return true // Component unmounted, stop polling

      if (res?.settlementStatus === 'PENDING_REFUND') {
        setVerifyStatus('refund')
        setVerifyMessage('A refund will be triggered for you soon. This window will close automatically in 20s. Further info will be communicated with you soon.')
        autoCloseTimeout.current = setTimeout(() => {
          if (isMounted.current) onClose()
        }, 20000)
        return true // Stop polling
      }

      if (res?.isVerified || res?.status === 'SUCCESS' || res?.status === 'PAID') {
        onSuccess(reference)
        return true // Stop polling
      }
      return false
    } catch {
      return false
    }
  }

  // Background polling every 8 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const found = await checkPayment()
      if (found) {
        clearInterval(interval)
      } else {
        if (isMounted.current) {
          setPollCount(prev => prev + 1)
        }
      }
    }, 8000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  const handleConfirm = async () => {
    if (verifyStatus === 'refund') return

    setIsVerifying(true)
    setVerifyStatus('idle')
    setVerifyMessage(null)

    const found = await checkPayment()

    if (!found && isMounted.current) {
      setVerifyStatus('error')
      setVerifyMessage("Payment not detected yet. It might take a few minutes for the bank to process the transfer. We're checking automatically.")
      setIsVerifying(false)
    }
  }

  const statusColor =
    verifyStatus === 'refund' ? 'var(--clay)' :
    verifyStatus === 'error'  ? 'var(--error)' :
    'inherit'

  return (
    <div className="psk-overlay">
      <div className="psk-checkout">
        <div className="psk-header">
          <div className="psk-header__left">
            <UpwardLogo size={20} color="var(--clay)" />
            <span>Secure Checkout</span>
          </div>
          <button className="psk-close" onClick={onClose} title="Close">
            <X size={18} />
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
            <div className="psk-account-grid">
              <div className="psk-account-row">
                <span className="psk-account-label">Bank Name</span>
                <span className="psk-account-value">{currentDisplayName}</span>
              </div>
              <div className="psk-account-row">
                <span className="psk-account-label">Account Name</span>
                <span className="psk-account-value">{accountName}</span>
              </div>
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

          {/* Bank Downtime & Instant Fallback Switcher */}
          <div className="psk-downtime-card">
            <div className="psk-downtime-card__header">
              <div className="psk-downtime-card__icon-wrap">
                <ArrowLeftRight size={14} />
              </div>
              <div className="psk-downtime-card__content">
                <h4 className="psk-downtime-card__title">Having trouble transferring to {currentDisplayName}?</h4>
                <p className="psk-downtime-card__desc">
                  If your banking app is unable to send to this account right now, you can switch to an alternate <strong>{alternateDisplayName}</strong> account.
                </p>
              </div>
            </div>
            <div className="psk-downtime-card__action">
              <button
                type="button"
                className="psk-switch-btn"
                onClick={handleSwitchBank}
                disabled={isSwitching}
                title={`Switch to ${alternateDisplayName}`}
              >
                <RefreshCw size={13} className={isSwitching ? 'animate-spin' : ''} />
                <span>{isSwitching ? 'Switching Bank...' : `Switch to ${alternateDisplayName}`}</span>
              </button>
            </div>
          </div>

          <div className="psk-info-note" style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
            <Info size={16} style={{ color: 'var(--clay)', marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Your payment will be automatically detected once the transfer is complete. {pollCount > 0 && <span style={{ color: 'var(--text-muted)' }}>Listening for payment... ({pollCount})</span>}
            </p>
          </div>
          
          {verifyMessage && (
             <p style={{ fontSize: 12, color: statusColor, marginTop: 12, textAlign: 'center' }}>
                {verifyMessage}
             </p>
          )}

          <div className="psk-actions" style={{ marginTop: 24 }}>
            <button 
              className="btn btn--primary btn--full" 
              onClick={() => handleConfirm()}
              disabled={isVerifying || verifyStatus === 'refund'}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span style={{ marginLeft: 8 }}>Checking Payment...</span>
                </>
              ) : (
                <>
                  <span>I've Made the Transfer</span>
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>
          </div>

          <div className="psk-footer-text">
            <ShieldCheck size={12} color="var(--success)" />
            <span>Secured by Paystack &amp; Upward</span>
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

