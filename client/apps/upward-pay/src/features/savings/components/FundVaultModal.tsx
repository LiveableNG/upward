'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Landmark, Zap, Info, FlaskConical, Loader2 } from 'lucide-react'
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

export function FundVaultModal({ isOpen, onClose, dedicatedAccount }: FundVaultModalProps) {
  const [copiedField, setCopiedField] = useState<'account' | 'all' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [customAmount, setCustomAmount] = useState('500,000')
  const { success: toastSuccess, error: toastError } = useToast()
  const simulateMutation = useSimulateVaultDeposit()

  const PRESET_AMOUNTS = [50_000, 100_000, 500_000, 1_000_000]

  useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  const bankName = dedicatedAccount?.bank_name || 'Wema Bank'
  const accountNumber = dedicatedAccount?.account_number || '9012345678'
  const accountName = dedicatedAccount?.account_name || 'Upward Rent Savings'

  const handleCopy = (text: string, field: 'account' | 'all') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toastSuccess('Account details copied to clipboard!')
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleSimulateDeposit = async (amountKobo: number, label: string) => {
    try {
      await simulateMutation.mutateAsync({
        accountNumber,
        amountKobo,
      })
      toastSuccess(`Instant test deposit of ${label} credited to vault!`)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to simulate test deposit')
    }
  }

  const handleCustomDeposit = async () => {
    const rawNumber = Number(customAmount.replace(/,/g, ''))
    if (!rawNumber || isNaN(rawNumber) || rawNumber <= 0) {
      toastError('Please enter a valid deposit amount')
      return
    }
    const amountKobo = Math.round(rawNumber * 100)
    await handleSimulateDeposit(amountKobo, formatCurrency(rawNumber, 'NGN'))
  }

  return createPortal(
    <div className="vault-modal-overlay" onClick={onClose}>
      <div
        className="vault-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
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
              <span className="vault-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                Save Towards Your Rent
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Transfer from any bank app, USSD, or internet banking
              </p>
            </div>
          </div>
          <button type="button" className="vault-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Dedicated Bank Transfer Card */}
        <div className="vault-dva-card">
          <div className="vault-dva-card__header">
            <span className="vault-dva-card__title">Your Rent Account Details</span>
            <span className="vault-dva-card__badge">
              <Zap size={11} /> Instant Credit
            </span>
          </div>

          {/* Account Number Row */}
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

          {/* Bank & Beneficiary Info */}
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

        {/* How it works guidance */}
        <div
          style={{
            background: 'rgba(200, 107, 73, 0.05)',
            border: '1px solid rgba(200, 107, 73, 0.15)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            display: 'flex',
            gap: 10,
          }}
        >
          <Info size={16} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>How to fund:</strong> Send any amount from your bank app or USSD to this account
            number. Your deposit enters immediately and starts growing with 14.5% annual interest.
          </div>
        </div>

        {/* Sandbox Simulation Widget (Local / Dev Environment) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="vault-sandbox-card">
            <div className="vault-sandbox-card__header">
              <span className="vault-sandbox-card__title">
                <FlaskConical size={14} color="var(--clay)" />
                <span>Test Environment Funding</span>
              </span>
              <span className="vault-sandbox-card__badge">Dev Sandbox</span>
            </div>
            <p className="vault-sandbox-card__desc">
              Simulate a bank transfer with any amount to test your balance & daily interest:
            </p>

            {/* Quick Preset Chips */}
            <div className="vault-sandbox-card__chips">
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
                  {preset >= 1_000_000 ? `₦${preset / 1_000_000}M` : `₦${preset / 1_000}k`}
                </button>
              ))}
            </div>

            {/* Custom Amount Input Row */}
            <div className="vault-sandbox-card__input-row">
              <div className="vault-sandbox-card__input-wrapper">
                <span className="vault-sandbox-card__currency-prefix">₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="vault-sandbox-card__input"
                  placeholder="e.g. 250,000"
                  value={customAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    setCustomAmount(digits ? Number(digits).toLocaleString() : '')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCustomDeposit()
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className="vault-sandbox-card__submit-btn"
                disabled={simulateMutation.isPending || !customAmount}
                onClick={handleCustomDeposit}
              >
                {simulateMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Deposit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className="vault-btn-secondary"
            onClick={onClose}
            style={{ flex: 1, height: 42, fontSize: '0.8125rem', fontWeight: 600 }}
          >
            Close
          </button>
          <button
            type="button"
            className="vault-btn-primary"
            onClick={() => handleCopy(`${accountNumber}\n${bankName}\n${accountName}`, 'all')}
            style={{ flex: 1.5, height: 42, fontSize: '0.8125rem', fontWeight: 600 }}
          >
            {copiedField === 'all' ? (
              <>
                <Check size={15} /> Details Copied!
              </>
            ) : (
              <>
                <Copy size={15} /> Copy All Details
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
