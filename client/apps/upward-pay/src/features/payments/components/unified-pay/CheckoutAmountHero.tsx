'use client'

import { Lock } from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'

interface CheckoutAmountHeroProps {
  currency: string
  rentAmount: number
  editable: boolean
  canPayPartial: boolean
  isBelowMin: boolean
  isFullPaymentRequired: boolean
  minRequired: number
  onRentChange: (value: string) => void
}

export function CheckoutAmountHero({
  currency,
  rentAmount,
  editable,
  canPayPartial,
  isBelowMin,
  isFullPaymentRequired,
  minRequired,
  onRentChange,
}: CheckoutAmountHeroProps) {
  const displayValue = formatCurrencyInput(rentAmount)

  const partialStatusText = canPayPartial
    ? 'Partial payments allowed'
    : 'Full payment only'

  return (
    <div className={`pay-flow__amount-hero ${editable ? 'pay-flow__amount-hero--editable' : ''}`}>
      <div className="pay-flow__amount-hero-label">
        Rent amount
        {!editable && isFullPaymentRequired ? (
          <span className="pay-flow__amount-hero-lock">
            <Lock size={11} aria-hidden />
            Fixed
          </span>
        ) : null}
      </div>

      <p className="pay-flow__amount-hero-status">{partialStatusText}</p>

      <div
        className={`pay-flow__amount-hero-input-wrap ${
          isBelowMin ? 'is-error' : rentAmount > 0 ? 'is-valid' : ''
        }`}
      >
        <span className="pay-flow__amount-hero-currency">{currency}</span>
        <input
          type="text"
          inputMode="numeric"
          className="pay-flow__amount-hero-input"
          value={displayValue}
          onChange={(e) => onRentChange(e.target.value)}
          placeholder="0"
          readOnly={!editable}
          aria-label="Rent amount"
        />
      </div>

      {isBelowMin ? (
        <p className="pay-flow__amount-hero-hint is-error">
          Minimum {formatCurrency(minRequired, currency)}
        </p>
      ) : null}
    </div>
  )
}

export function parseRentInput(value: string): number {
  return parseCurrencyInput(value) ?? 0
}
