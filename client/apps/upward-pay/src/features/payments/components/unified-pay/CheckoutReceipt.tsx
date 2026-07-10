'use client'

import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'

export interface CheckoutReceiptRow {
  id: number
  name: string
  amount: number
  editable?: boolean
  maxAmount?: number
}

interface CheckoutReceiptProps {
  rows: CheckoutReceiptRow[]
  total: number
  currency: string
  onRowChange?: (id: number, amount: number) => void
}

export function CheckoutReceipt({
  rows,
  total,
  currency,
  onRowChange,
}: CheckoutReceiptProps) {
  return (
    <div className="pay-flow__receipt">
      <p className="pay-flow__receipt-heading">Summary</p>
      <div className="pay-flow__receipt-rows">
        {rows.map((row) => (
          <div key={row.id} className="pay-flow__receipt-row">
            <span className="pay-flow__receipt-label">{row.name}</span>
            {row.editable && onRowChange ? (
              <div className="pay-flow__receipt-edit">
                <span className="pay-flow__receipt-currency">{currency}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="pay-flow__receipt-input"
                  value={formatCurrencyInput(row.amount)}
                  onChange={(e) =>
                    onRowChange(row.id, parseCurrencyInput(e.target.value) ?? 0)
                  }
                  onFocus={(e) => e.target.select()}
                  max={row.maxAmount}
                  min={0}
                  aria-label={`${row.name} amount`}
                />
              </div>
            ) : (
              <span className="pay-flow__receipt-value">
                {formatCurrency(row.amount, currency)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="pay-flow__receipt-total">
        <span>Total</span>
        <strong>{formatCurrency(total, currency)}</strong>
      </div>
    </div>
  )
}
