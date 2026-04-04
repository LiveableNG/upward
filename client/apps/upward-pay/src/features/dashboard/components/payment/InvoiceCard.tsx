import React from 'react'
import { formatCurrency } from '@/lib/utils'

interface InvoiceCardProps {
  invoiceNumber: string
  notes?: string
  lineItems: Array<{ label: string; amount: number }>
  totalAmount: number
  isPriority?: boolean
}

export default function InvoiceCard({
  invoiceNumber,
  notes,
  lineItems,
  totalAmount,
  isPriority,
}: InvoiceCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-solid)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          Invoice #{invoiceNumber}
        </div>
        {isPriority && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '2px 8px',
              background: 'rgba(217,119,87,0.1)',
              color: 'var(--clay)',
              borderRadius: '100px',
              letterSpacing: '0.05em',
            }}
          >
            Priority
          </span>
        )}
      </div>

      {lineItems.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 14,
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</span>
        </div>
      ))}

      <div style={{ height: 1, background: 'var(--border-solid)', margin: '12px 0' }} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        <span>Total</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>

      {notes && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>Note:</strong> {notes}
        </div>
      )}
    </div>
  )
}
