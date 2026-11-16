'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Copy,
  Check,
  Landmark,
  Zap,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import { useSimulateVaultDeposit } from '../hooks/useRentSavings'

interface FundVaultModalProps {
  isOpen: boolean
  onClose: () => void
  recommendedAmountNaira?: number
  cadence?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dedicatedAccount?: {
    bank_name: string
    account_number: string
    account_name: string
  } | null
}

const emptySubscribe = () => () => {}

export function FundVaultModal({
  isOpen,
  onClose,
  recommendedAmountNaira,
  cadence = 'MONTHLY',
  dedicatedAccount,
}: FundVaultModalProps) {
  const [copiedField, setCopiedField] = useState<'account' | 'all' | null>(null)
  const [customAmount, setCustomAmount] = useState(() =>
    recommendedAmountNaira && recommendedAmountNaira > 0
      ? recommendedAmountNaira.toLocaleString()
      : '100,000',
  )
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
              <Landmark size={20} />
            </div>
            <div>
              <span className="vault-modal-title" style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
                Add Money to Rent Savings
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Earns 14.5% returns every year so you pay less for rent
              </p>
            </div>
          </div>
          <button type="button" className="vault-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Amount input */}
          <div>
            <label htmlFor="quick-save-amount" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
              Amount to Transfer ({cadence.toLowerCase()} target)
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

          {/* Personal Rent Account Details */}
          <div className="vault-dva-card" style={{ margin: 0 }}>
            <div className="vault-dva-card__header">
              <span className="vault-dva-card__title">Personal Rent Account</span>
              <span className="vault-dva-card__badge">
                <Zap size={11} /> Instant Credit
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="vault-btn-primary"
              onClick={handleIHavePaid}
              disabled={hasPaidNotified}
            >
              <CheckCircle2 size={16} />
              <span>{hasPaidNotified ? 'Transfer Recorded!' : 'I Have Transferred'}</span>
            </button>

            {process.env.NODE_ENV !== 'production' && (
              <button
                type="button"
                className="vault-btn-secondary"
                onClick={handleDeposit}
                disabled={simulateMutation.isPending}
                style={{ fontSize: '0.75rem' }}
              >
                {simulateMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Simulating Transfer...
                  </>
                ) : (
                  <span>Simulate Instant Bank Transfer (₦{customAmount || '0'})</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
