import React from 'react'
import { formatCurrency } from '@/lib/utils'

interface InvoiceCardProps {
  title?: string
  invoiceNumber?: string
  notes?: string
  lineItems: Array<{ label: string; amount: number }>
  totalAmount: number
  isPriority?: boolean
}

export default function InvoiceCard({
  title = 'Payment Summary',
  invoiceNumber,
  notes,
  lineItems,
  totalAmount,
  isPriority,
}: InvoiceCardProps) {
  void totalAmount

  return (
    <div className="pay-flow__invoice-card">
      <div className="pay-flow__invoice-card__head">
        <div className="pay-flow__invoice-card__title">
          {invoiceNumber ? `Invoice #${invoiceNumber}` : title}
        </div>
        {isPriority && <span className="pay-flow__invoice-card__priority">Priority</span>}
      </div>

      {lineItems.map((item, idx) => (
        <div key={idx} className="pay-flow__invoice-card__row">
          <span className="pay-flow__invoice-card__row-label">{item.label}</span>
          <span className="pay-flow__invoice-card__row-value">{formatCurrency(item.amount)}</span>
        </div>
      ))}

      {notes && (
        <div className="pay-flow__invoice-card__notes">
          <strong>Note:</strong> {notes}
        </div>
      )}
    </div>
  )
}
