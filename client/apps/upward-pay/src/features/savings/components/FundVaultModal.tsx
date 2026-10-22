'use client'

import React, { useState } from 'react'
import { X, Copy, Check, Landmark, ShieldCheck, ArrowRight, Zap, Info } from 'lucide-react'
import { useToast } from '@/components/common/Toast'

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
  const { success: toastSuccess } = useToast()

  if (!isOpen) return null

  const bankName = dedicatedAccount?.bank_name || 'Wema Bank'
  const accountNumber = dedicatedAccount?.account_number || '9012345678'
  const accountName = dedicatedAccount?.account_name || 'Upward Rent Savings'

  const handleCopy = (text: string, field: 'account' | 'all') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toastSuccess('Account details copied to clipboard!')
    setTimeout(() => setCopiedField(null), 2500)
  }

  return (
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
                Fund Your Rent Vault
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Transfer from any Nigerian bank app or USSD
              </p>
            </div>
          </div>
          <button type="button" className="vault-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Dedicated Bank Transfer Card */}
        <div
          style={{
            background: 'var(--surface, #f9fafb)',
            border: '1.5px solid var(--border, #e5e7eb)',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Dedicated Virtual Account
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.08)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              <Zap size={11} /> Instant Credit
            </span>
          </div>

          {/* Account Number Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg, #fff)',
              border: '1px solid var(--border, #e5e7eb)',
              borderRadius: 10,
              padding: '12px 16px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                Account Number
              </span>
              <span
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  color: 'var(--text)',
                }}
              >
                {accountNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(accountNumber, 'account')}
              style={{
                background:
                  copiedField === 'account'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'var(--clay-faint, rgba(200, 107, 73, 0.1))',
                color: copiedField === 'account' ? '#10b981' : 'var(--clay)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                Bank Name
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                {bankName}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>
                Account Name
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                {accountName}
              </span>
            </div>
          </div>
        </div>

        {/* How it works guidance */}
        <div
          style={{
            background: 'rgba(200, 107, 73, 0.05)',
            border: '1px solid rgba(200, 107, 73, 0.15)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: 20,
            display: 'flex',
            gap: 10,
          }}
        >
          <Info size={16} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>How to fund:</strong> Transfer any amount from your bank mobile app or USSD to
            the account details above. Your deposit reflects in seconds and begins compounding daily
            at 14.5% p.a.
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="vault-btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Close
          </button>
          <button
            type="button"
            className="vault-btn-primary"
            onClick={() => handleCopy(`${accountNumber}\n${bankName}\n${accountName}`, 'all')}
            style={{ flex: 2 }}
          >
            {copiedField === 'all' ? (
              <>
                <Check size={16} /> Details Copied!
              </>
            ) : (
              <>
                <Copy size={16} /> Copy All Details
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
