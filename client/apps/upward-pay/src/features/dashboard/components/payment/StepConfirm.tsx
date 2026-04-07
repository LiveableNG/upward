import React from 'react'
import { MapPin, Wallet } from 'lucide-react'
import { type Landlord } from './types'
import { LandlordAvatar } from './LandlordAvatar'
import { formatCurrency } from '@/lib/utils'
import InvoiceCard from './InvoiceCard'

export function StepConfirm({
  landlord,
  amount,
  narration,
  paymentType = 'Rent Payment',
  propertyAddress = '',
  onConfirm,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBack,
  useSavings,
  onToggleSavings,
  savingsBalance,
  isPriorityRequest,
  lineItems = [],
}: {
  landlord: Landlord
  amount: number
  narration: string
  paymentType?: string
  propertyAddress?: string
  onConfirm: () => void
  onBack: () => void
  useSavings: boolean
  onToggleSavings: (v: boolean) => void
  savingsBalance: number
  isPriorityRequest?: boolean
  lineItems?: Array<{ label: string; amount: number }>
}) {
  const savingsToUse = useSavings ? Math.min(savingsBalance, amount) : 0
  const totalDebit = amount - savingsToUse

  return (
    <div style={{ padding: '0 20px 40px' }}>
      <div style={{ padding: '20px 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LandlordAvatar letter={landlord.avatar} size={48} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {landlord.name}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {landlord.role || 'Property Manager'}
            </p>
          </div>
        </div>
        {landlord.address && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <MapPin size={14} color="var(--text-muted)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {landlord.address}
            </span>
          </div>
        )}
      </div>
      <div
        style={{
          padding: '24px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border-solid)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 4,
          }}
        >
          Amount Due
        </span>
        <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>
          {formatCurrency(amount)}
        </span>
      </div>
      {(isPriorityRequest || (lineItems && lineItems.length > 0)) && (
        <div style={{ marginBottom: 20 }}>
          <InvoiceCard
            invoiceNumber={landlord.accountNumber.slice(-6)}
            notes={narration}
            lineItems={lineItems || []}
            totalAmount={amount}
            isPriority={!!isPriorityRequest}
          />
        </div>
      )}
      <div
        style={{
          background: useSavings ? 'var(--clay-faint)' : 'var(--surface)',
          border: `1px solid ${useSavings ? 'var(--clay)' : 'var(--border-solid)'}`,
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '20px',
          transition: 'all 0.2s ease',
          boxShadow: useSavings ? '0 10px 25px -10px var(--clay-glow)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'var(--clay-faint)',
                color: 'var(--clay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={18} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Savings</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Available: {formatCurrency(savingsBalance)}
              </p>
            </div>
          </div>
          <label
            className="switch"
            style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}
          >
            <input
              type="checkbox"
              checked={useSavings}
              onChange={(e) => onToggleSavings(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: useSavings ? 'var(--clay)' : '#ccc',
                transition: '.4s',
                borderRadius: '34px',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: '16px',
                  width: '16px',
                  left: useSavings ? '20px' : '4px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%',
                }}
              />
            </span>
          </label>
        </div>
        {useSavings && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px dashed rgba(217,119,87,0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Savings applied</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clay)' }}>
              -{formatCurrency(savingsToUse)}
            </span>
          </div>
        )}
      </div>
      <div style={{ padding: '0 4px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total To Pay</span>
          <span style={{ fontSize: 24, fontWeight: 801, color: 'var(--text)' }}>
            {formatCurrency(totalDebit)}
          </span>
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="btn btn--primary btn--full"
        style={{ marginBottom: 12, height: 56, fontSize: 16 }}
      >
        {totalDebit <= 0 ? 'Pay with Savings' : `Confirm & Pay`}
      </button>
    </div>
  )
}
