'use client'

import React, { useState, useEffect } from 'react'
import { Check, Loader, AlertCircle, ArrowLeft, ChevronDown, Landmark } from 'lucide-react'
import { LandlordAvatar } from './LandlordAvatar'
import { BankSelectionModal } from './BankSelectionModal'
import { type Landlord } from './types'
import { api } from '@/lib/api'

const spinStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 8,
}

const inputWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 16px',
  background: 'var(--surface)',
  border: '1px solid var(--border-solid)',
  borderRadius: 'var(--radius-md)',
  transition: 'all 0.2s',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  padding: '14px 0',
  fontSize: 15,
  fontFamily: 'var(--font)',
  color: 'var(--text)',
  outline: 'none',
  width: '100%',
}

export function StepNewLandlord({
  onContinue,
  onBack,
}: {
  onContinue: (
    data: Partial<Landlord> & {
      amount: number
      narration: string
      save: boolean
    },
  ) => void
  onBack: () => void
}) {
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [form, setForm] = useState({
    accountNumber: '',
    bankCode: '',
    accountName: '',
    save: true,
  })

  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [bankError, setBankError] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    setLoadingBanks(true)
    api
      .getBanks()
      .then((data) => {
        if (Array.isArray(data)) {
          const uniqueBanks = Array.from(new Map(data.map((b) => [b.code, b])).values())
          setBanks(uniqueBanks)
          setBankError(false)
        } else {
          setBankError(true)
        }
      })
      .catch((err) => {
        console.error('Failed to load banks', err)
        setBankError(true)
      })
      .finally(() => setLoadingBanks(false))
  }, [])

  useEffect(() => {
    // Reset state when input changes
    setResolved(false)
    setResolveError(null)
    set('accountName', '')

    if (form.accountNumber.length === 10 && form.bankCode) {
      const handler = setTimeout(() => {
        setResolving(true)
        api
          .resolveAccount(form.accountNumber, form.bankCode)
          .then((res) => {
            setResolved(true)
            set('accountName', res.accountName)
            setResolveError(null)
          })
          .catch((err) => {
            setResolved(false)
            setResolveError(err.message || 'Account could not be resolved')
            console.error('Resolution error:', err)
          })
          .finally(() => setResolving(false))
      }, 600) // 600ms debounce

      return () => clearTimeout(handler)
    }
  }, [form.accountNumber, form.bankCode])

  const selectedBank = banks.find((b) => b.code === form.bankCode)
  const canProceed = resolved

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <style dangerouslySetInnerHTML={{ __html: spinStyle }} />

      {/* Bank Selection Trigger */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Bank</label>
        <div
          onClick={() => !loadingBanks && setIsBankModalOpen(true)}
          style={{
            ...inputWrapStyle,
            cursor: loadingBanks ? 'wait' : 'pointer',
            padding: '12px 16px',
            borderColor: isBankModalOpen ? 'var(--clay)' : 'var(--border-solid)',
          }}
        >
          <div style={{ marginRight: 12, color: 'var(--clay)' }}>
            <Landmark size={20} />
          </div>
          <div style={{ flex: 1 }}>
            {selectedBank ? (
              <div style={{ fontSize: 15, fontWeight: 600 }}>{selectedBank.name}</div>
            ) : (
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
                {loadingBanks ? 'Loading banks...' : 'Select bank'}
              </div>
            )}
          </div>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: isBankModalOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </div>

      {/* Custom Bank Selection Modal */}
      {isBankModalOpen && (
        <BankSelectionModal
          banks={banks}
          loading={loadingBanks}
          error={bankError}
          onClose={() => setIsBankModalOpen(false)}
          onSelect={(bank) => {
            set('bankCode', bank.code)
            setIsBankModalOpen(false)
          }}
        />
      )}

      {/* Account Number */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Account number</label>
        <div
          style={{
            ...inputWrapStyle,
            borderColor: resolving
              ? 'var(--warning)'
              : resolveError
                ? '#ef4444' // Error state
                : resolved
                  ? 'var(--success)'
                  : 'var(--border-solid)',
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="10-digit account number"
            maxLength={10}
            value={form.accountNumber}
            onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
            style={inputStyle}
          />

          {resolving && (
            <div style={{ color: 'var(--warning)' }}>
              <Loader className="animate-spin" size={20} />
            </div>
          )}

          {resolved && (
            <div style={{ color: 'var(--success)' }}>
              <Check size={18} />
            </div>
          )}

          {resolveError && !resolving && (
            <div style={{ color: '#ef4444' }}>
              <AlertCircle size={18} />
            </div>
          )}
        </div>
      </div>

      {/* Resolve Error Alert */}
      {resolveError && !resolving && (
        <div
          style={{
            marginBottom: 24,
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#ef4444',
          }}
        >
          <AlertCircle size={18} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>{resolveError}</div>
        </div>
      )}

      {/* Resolved Account */}
      {resolved && !resolving && (
        <div
          style={{
            marginBottom: 24,
            padding: '12px 16px',
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <LandlordAvatar letter={form.accountName?.[0] || '?'} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{form.accountName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedBank?.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--success)' }}>
            <Check size={16} />
          </div>
        </div>
      )}


      {/* Save Toggle */}
      <div
        onClick={() => set('save', !form.save)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          border: '1px solid var(--border-solid)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `2px solid ${form.save ? 'var(--clay)' : 'var(--border-solid)'}`,
            background: form.save ? 'var(--clay)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {form.save && <Check size={13} />}
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Save for future payments</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Quickly pay this landlord next time
          </div>
        </div>
      </div>

      {/* Continue */}
      <button
        disabled={!canProceed}
        onClick={() => {
          if (!canProceed) return

          onContinue({
            id: Date.now().toString(),
            name: form.accountName,
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            bankName: selectedBank?.name || '',
            bankCode: form.bankCode,
            avatar: form.accountName?.[0] || '?',
            amount: 0,
            narration: '',
            lastPaid: null,
            lastAmount: 0,
            save: form.save,
            isNewLocal: true,
          } as any)
        }}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4 }}
      >
        Review payment
      </button>
    </div>
  )
}
