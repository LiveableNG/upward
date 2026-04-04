'use client'

import React, { useState, useEffect } from 'react'
import { Check, Loader, AlertCircle, ArrowLeft } from 'lucide-react'
import { LandlordAvatar } from './LandlordAvatar'
import { type Landlord } from './types'
import { api } from '@/lib/api'

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
    amount: '',
    narration: '',
    save: true,
  })

  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    api
      .getBanks()
      .then((data) => {
        const uniqueBanks = Array.from(new Map(data.map((b) => [b.code, b])).values())
        setBanks(uniqueBanks)
      })
      .catch((err) => console.error('Failed to load banks', err))
  }, [])

  useEffect(() => {
    if (form.accountNumber.length === 10 && form.bankCode) {
      setResolving(true)

      api
        .resolveAccount(form.accountNumber, form.bankCode)
        .then((res) => {
          setResolved(true)
          set('accountName', res.accountName)
        })
        .catch(() => {
          setResolved(false)
          set('accountName', '')
        })
        .finally(() => setResolving(false))
    } else {
      setResolved(false)
      set('accountName', '')
    }
  }, [form.accountNumber, form.bankCode])

  const selectedBank = banks.find((b) => b.code === form.bankCode)
  const amountNumber = Number(form.amount)
  const canProceed = resolved && amountNumber >= 1000

  return (
    <div style={{ padding: '0 20px 32px' }}>
      {/* Back Button */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Bank */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Bank</label>
        <div style={inputWrapStyle}>
          <select
            value={form.bankCode}
            onChange={(e) => set('bankCode', e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            <option value="">Select bank</option>
            {banks.map((b, idx) => (
              <option key={`${b.code}-${idx}`} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Account Number */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Account number</label>
        <div
          style={{
            ...inputWrapStyle,
            borderColor: resolving
              ? 'var(--warning)'
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
              <Loader size={20} />
            </div>
          )}

          {resolved && (
            <div style={{ color: 'var(--success)' }}>
              <Check size={18} />
            </div>
          )}
        </div>
      </div>

      {/* Resolved Account */}
      {resolved && (
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

      {/* Amount */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Amount (₦)</label>
        <div style={inputWrapStyle}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>₦</span>
          <input
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 700 }}
          />
        </div>

        {amountNumber > 0 && amountNumber < 1000 && (
          <div
            style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--warning)' }}
          >
            <AlertCircle size={16} />
            Minimum payment is ₦1,000
          </div>
        )}
      </div>

      {/* Narration */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>
          Narration <span style={{ fontWeight: 400 }}>(optional)</span>
        </label>
        <div style={inputWrapStyle}>
          <input
            type="text"
            placeholder="e.g. March rent payment"
            value={form.narration}
            onChange={(e) => set('narration', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

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
            amount: amountNumber,
            narration: form.narration,
            lastPaid: null,
            lastAmount: 0,
            save: form.save,
          })
        }}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4 }}
      >
        Review payment
      </button>
    </div>
  )
}
