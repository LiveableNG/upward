import React, { useState } from 'react'
import { LandlordAvatar } from './LandlordAvatar'
import { type Landlord } from './types'
import { formatCurrency } from '@/lib/utils'

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

export function StepAmount({
  landlord,
  onContinue,
}: {
  landlord: Landlord
  onContinue: (amount: number, narration: string) => void
}) {
  const [amount, setAmount] = useState(landlord.lastAmount > 0 ? String(landlord.lastAmount) : '')
  const [narration, setNarration] = useState('')
  const presets = [50000, 100000, 150000, 200000]
  const canProceed = Number(amount) >= 1000

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div
        style={{
          padding: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-solid)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <LandlordAvatar
          letter={landlord.avatar}
          size={40}
          color={landlord.source === 'pm' ? '#3b82f6' : undefined}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {landlord.accountName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {landlord.bankName} · {landlord.accountNumber}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Amount (₦)</label>
        <div
          style={{
            ...inputWrapStyle,
            borderColor: Number(amount) >= 1000 ? 'var(--clay)' : 'var(--border-solid)',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: `1px solid ${amount === String(p) ? 'var(--clay)' : 'var(--border-solid)'}`,
              background: amount === String(p) ? 'var(--clay-faint)' : 'var(--surface)',
              color: amount === String(p) ? 'var(--clay)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'all 0.15s',
            }}
          >
            {formatCurrency(p)}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>
          Narration <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
        </label>
        <div style={inputWrapStyle}>
          <input
            type="text"
            placeholder="e.g. March rent"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <button
        disabled={!canProceed}
        onClick={() => onContinue(Number(amount), narration)}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4 }}
      >
        Continue
      </button>
    </div>
  )
}
