'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Copy,
  Check,
  Landmark,
  Zap,
  CreditCard,
  Building2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import { useSimulateVaultDeposit } from '../hooks/useRentSavings'

interface FundVaultModalProps {
  isOpen: boolean
  onClose: () => void
  dedicatedAccount?: {
    bank_name: string
    account_number: string
    account_name: string
  } | null
}

const emptySubscribe = () => () => {}

export function FundVaultModal({ isOpen, onClose, dedicatedAccount }: FundVaultModalProps) {
  // Cowrywise pattern: Direct Debit / Card is primary, Bank Transfer is alternative
  const [fundingMode, setFundingMode] = useState<'DIRECT_DEBIT' | 'TRANSFER'>('DIRECT_DEBIT')
  const [debitSource, setDebitSource] = useState<'CARD' | 'BANK'>('CARD')
  const [copiedField, setCopiedField] = useState<'account' | 'all' | null>(null)
  const [customAmount, setCustomAmount] = useState('100,000')
  const [hasPaidNotified, setHasPaidNotified] = useState(false)

  const { success: toastSuccess, error: toastError } = useToast()
  const simulateMutation = useSimulateVaultDeposit()

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const PRESET_AMOUNTS = [50_000, 100_000, 250_000, 500_000]

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = () => {
    setHasPaidNotified(false)
    onClose()
  }

  if (!isOpen || !isClient || typeof document === 'undefined') return null

  const bankName = dedicatedAccount?.bank_name || 'Wema Bank'
  const accountNumber = dedicatedAccount?.account_number || '9012345678'
  const accountName = dedicatedAccount?.account_name || 'Upward Rent Savings'

  const handleCopy = (text: string, field: 'account' | 'all') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toastSuccess('Account details copied to clipboard!')
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleDeposit = async () => {
    const rawNumber = Number(customAmount.replace(/,/g, ''))
    if (!rawNumber || isNaN(rawNumber) || rawNumber < 1000) {
      toastError('Please enter a valid deposit amount (minimum ₦1,000)')
      return
    }
    const amountKobo = Math.round(rawNumber * 100)

    try {
      await simulateMutation.mutateAsync({
        accountNumber,
        amountKobo,
      })
      toastSuccess(`Instant deposit of ${formatCurrency(rawNumber, 'NGN')} credited to your vault!`)
      onClose()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to complete deposit. Please try again.')
    }
  }

  const handleIHavePaid = () => {
    setHasPaidNotified(true)
    toastSuccess('Payment recorded! We will credit your vault as soon as your transfer arrives.')
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return createPortal(
    <div className="vault-modal-overlay" onClick={handleClose}>
      <div
        className="vault-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--clay-faint, rgba(200, 107, 73, 0.1))',
                color: 'var(--clay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <span className="vault-modal-title" style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
                Add Money to Rent Savings
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Earns 14.5% returns every year, added daily
              </p>
            </div>
          </div>
          <button type="button" className="vault-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection: Direct Debit (Primary) vs Bank Transfer (Alternative) */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, padding: 3, gap: 4 }}>
          <button
            type="button"
            onClick={() => setFundingMode('DIRECT_DEBIT')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: fundingMode === 'DIRECT_DEBIT' ? 'var(--bg)' : 'transparent',
              boxShadow: fundingMode === 'DIRECT_DEBIT' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              color: fundingMode === 'DIRECT_DEBIT' ? 'var(--text)' : 'var(--text-muted)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Zap size={14} color={fundingMode === 'DIRECT_DEBIT' ? 'var(--clay)' : 'inherit'} />
            <span>Direct Debit (Card/Bank)</span>
          </button>
          <button
            type="button"
            onClick={() => setFundingMode('TRANSFER')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: fundingMode === 'TRANSFER' ? 'var(--bg)' : 'transparent',
              boxShadow: fundingMode === 'TRANSFER' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              color: fundingMode === 'TRANSFER' ? 'var(--text)' : 'var(--text-muted)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Landmark size={14} color={fundingMode === 'TRANSFER' ? 'var(--clay)' : 'inherit'} />
            <span>Bank Transfer</span>
          </button>
        </div>

        {/* MODE 1: Direct Debit / Quick Save (Cowrywise Image 5 pattern) */}
        {fundingMode === 'DIRECT_DEBIT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Amount input with big display */}
            <div>
              <label htmlFor="quick-save-amount" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                How much would you like to save?
              </label>
              <div className="vault-sandbox-card__input-wrapper" style={{ height: 46 }}>
                <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.25rem', fontWeight: 700 }}>₦</span>
                <input
                  id="quick-save-amount"
                  type="text"
                  inputMode="numeric"
                  className="vault-sandbox-card__input"
                  style={{ fontSize: '1.25rem', fontWeight: 700 }}
                  placeholder="e.g. 100,000"
                  value={customAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    setCustomAmount(digits ? Number(digits).toLocaleString() : '')
                  }}
                />
              </div>

              {/* Quick preset chips */}
              <div className="vault-sandbox-card__chips" style={{ marginTop: 8 }}>
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`vault-sandbox-card__chip ${
                      customAmount.replace(/,/g, '') === String(preset)
                        ? 'vault-sandbox-card__chip--active'
                        : ''
                    }`}
                    onClick={() => setCustomAmount(preset.toLocaleString())}
                  >
                    ₦{preset >= 1_000_000 ? `${preset / 1_000_000}M` : `${preset / 1_000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Set Primary Source of Funds (Cowrywise Image 5) */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                Set Primary Source of Funds
              </span>
              <div className="vault-setup__source-grid">
                <div
                  className={`vault-setup__source-card ${
                    debitSource === 'CARD' ? 'vault-setup__source-card--active' : ''
                  }`}
                  onClick={() => setDebitSource('CARD')}
                >
                  <CreditCard size={18} color="var(--clay)" />
                  <div className="vault-setup__source-info">
                    <span className="vault-setup__source-title">Debit Card</span>
                    <span className="vault-setup__source-sub">Mastercard •••• 7572</span>
                  </div>
                </div>

                <div
                  className={`vault-setup__source-card ${
                    debitSource === 'BANK' ? 'vault-setup__source-card--active' : ''
                  }`}
                  onClick={() => setDebitSource('BANK')}
                >
                  <Building2 size={18} color="var(--clay)" />
                  <div className="vault-setup__source-info">
                    <span className="vault-setup__source-title">Bank Account</span>
                    <span className="vault-setup__source-sub">Direct debit from bank</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="vault-btn-primary"
              disabled={simulateMutation.isPending || !customAmount}
              onClick={handleDeposit}
              style={{ height: 44, marginTop: 4 }}
            >
              {simulateMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Deposit...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Save ₦{customAmount || '0'} Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* MODE 2: Bank Transfer (Cowrywise Image 2 pattern) */}
        {fundingMode === 'TRANSFER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Transfer from any Nigerian bank mobile app or USSD to your personal rent account below:
            </p>

            <div className="vault-dva-card" style={{ margin: 0 }}>
              <div className="vault-dva-card__header">
                <span className="vault-dva-card__title">Your Personal Rent Account</span>
                <span className="vault-dva-card__badge">
                  <Zap size={11} /> Enters Instantly
                </span>
              </div>

              <div className="vault-dva-card__number-row">
                <div className="vault-dva-card__number-block">
                  <span className="vault-dva-card__number-label">Account Number</span>
                  <span className="vault-dva-card__number">{accountNumber}</span>
                </div>
                <button
                  type="button"
                  className={`vault-dva-card__copy-btn ${
                    copiedField === 'account' ? 'vault-dva-card__copy-btn--copied' : ''
                  }`}
                  onClick={() => handleCopy(accountNumber, 'account')}
                >
                  {copiedField === 'account' ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </button>
              </div>

              <div className="vault-dva-card__meta-list">
                <div className="vault-dva-card__meta-row">
                  <span className="vault-dva-card__meta-label">Bank Name</span>
                  <span className="vault-dva-card__meta-value">{bankName}</span>
                </div>
                <div className="vault-dva-card__meta-row">
                  <span className="vault-dva-card__meta-label">Account Name</span>
                  <span className="vault-dva-card__meta-value">{accountName}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="vault-btn-secondary"
                onClick={() => handleCopy(`${accountNumber}\n${bankName}\n${accountName}`, 'all')}
                style={{ flex: 1, height: 42, fontSize: '0.8125rem' }}
              >
                {copiedField === 'all' ? (
                  <>
                    <Check size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Details
                  </>
                )}
              </button>

              <button
                type="button"
                className="vault-btn-primary"
                onClick={handleIHavePaid}
                style={{ flex: 1.4, height: 42, fontSize: '0.8125rem' }}
                disabled={hasPaidNotified}
              >
                <CheckCircle2 size={16} />
                <span>{hasPaidNotified ? 'Payment Recorded' : 'I Have Transferred'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
