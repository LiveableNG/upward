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
  isPriorityRequest?: boolean
  lineItems?: Array<{ label: string; amount: number }>
}) {


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
              Managed by {landlord.accountName}
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
      {lineItems && lineItems.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <InvoiceCard
            invoiceNumber={landlord.accountNumber.slice(-6)}
            notes={narration}
            lineItems={lineItems}
            totalAmount={amount}
            isPriority={!!isPriorityRequest}
          />
        </div>
      )}
      <div style={{ padding: '0 4px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total To Pay</span>
          <span style={{ fontSize: 24, fontWeight: 801, color: 'var(--text)' }}>
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="btn btn--primary btn--full"
        style={{ marginBottom: 12, height: 56, fontSize: 16 }}
      >
        Confirm & Pay
      </button>
    </div>
  )
}
