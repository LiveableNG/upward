import React, { useState, useEffect } from 'react'
import { LandlordAvatar } from './LandlordAvatar'
import { type Landlord, type LineItem } from './types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Info } from 'lucide-react'

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

const COMMON_LABELS = [
  'Rent',
  'Service Charge',
  'Power/Electricity',
  'Water Bill',
  'Waste Disposal',
  'Security Fee',
  'Legal & Agreement',
  'Agency Fee',
  'Caution Deposit',
]

export function StepAmount({
  landlord,
  onContinue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBack,
}: {
  landlord: Landlord
  onContinue: (amount: number, narration: string, lineItems?: LineItem[]) => void
  onBack?: () => void
}) {
  const [amount, setAmount] = useState(landlord.lastAmount > 0 ? String(landlord.lastAmount) : '')
  const [narration, setNarration] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { label: 'Rent', amount: landlord.lastAmount > 0 ? landlord.lastAmount : 0 },
  ])

  const presets = [50000, 100000, 150000, 200000]

  useEffect(() => {
    if (showBreakdown) {
      const total = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      setAmount(String(total))
    }
  }, [lineItems, showBreakdown])

  const addLineItem = () => {
    setLineItems([...lineItems, { label: '', amount: 0 }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, updates: Partial<LineItem>) => {
    const newItems = [...lineItems]
    newItems[index] = { ...newItems[index], ...updates }
    setLineItems(newItems)
  }

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

      {!showBreakdown ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Amount (₦)</label>
            <div
              style={{
                ...inputWrapStyle,
                borderColor: Number(amount) >= 1000 ? 'var(--clay)' : 'var(--border-solid)',
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginRight: 10,
                }}
              >
                ₦
              </span>
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
        </>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>Payment Breakdown</label>
            <button
              onClick={addLineItem}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--clay)',
                background: 'var(--clay-faint)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 12,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'flex-start' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ ...inputWrapStyle, padding: '0 12px' }}>
                    <input
                      list="common-labels"
                      placeholder="e.g. Service Charge"
                      value={item.label}
                      onChange={(e) => updateLineItem(idx, { label: e.target.value })}
                      style={{ ...inputStyle, padding: '10px 0', fontSize: 13 }}
                    />
                    <div
                      style={{
                        height: 20,
                        width: 1,
                        background: 'var(--border-solid)',
                        margin: '0 10px',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginRight: 4,
                      }}
                    >
                      ₦
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.amount || ''}
                      onChange={(e) => updateLineItem(idx, { amount: Number(e.target.value) })}
                      style={{
                        ...inputStyle,
                        padding: '10px 0',
                        fontSize: 13,
                        fontWeight: 700,
                        width: 80,
                        flex: 'none',
                      }}
                    />
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <button
                    onClick={() => removeLineItem(idx)}
                    style={{
                      marginTop: 8,
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <datalist id="common-labels">
            {COMMON_LABELS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>

          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--dark)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              Total Amount
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--clay)' }}>
              {formatCurrency(Number(amount))}
            </span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px',
            background: 'none',
            border: `1px dashed ${showBreakdown ? 'var(--clay)' : 'var(--border-solid)'}`,
            borderRadius: 'var(--radius-md)',
            color: showBreakdown ? 'var(--clay)' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showBreakdown ? 'Switch to Single Amount' : 'Breakdown Payment (Rent, Bills, etc.)'}
        </button>
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
        onClick={() => onContinue(Number(amount), narration, showBreakdown ? lineItems : undefined)}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4, marginBottom: 12, height: 52 }}
      >
        Continue
      </button>

      <p
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Info size={12} /> Minimum payment amount is ₦1,000
      </p>
    </div>
  )
}
