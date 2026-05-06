'use client'

import { Info, AlertCircle, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentInputProps {
  canPayPartial: boolean
  isBelowMin: boolean
  amountInput: string
  currency: string
  totalOwed: number
  minRequired: number
  onAmountChange: (val: string) => void
  isGuest?: boolean
}

export function PaymentInput({
  canPayPartial,
  isBelowMin,
  amountInput,
  currency,
  totalOwed,
  minRequired,
  onAmountChange,
  isGuest
}: PaymentInputProps) {
  const amountNum = parseFloat(amountInput) || 0

  return (
    <div className="pay-input-section">
      {canPayPartial && (
        <div className="pay-input-notice">
          <Info size={14} className="pay-input-notice__icon" />
          <span className="pay-input-notice__text">Partial payments are accepted. You can also edit line items below to adjust your total.</span>
        </div>
      )}

      <div className="pay-amount-field">
        <label className="pay-amount-field__label">
          {isGuest ? 'Total Amount' : canPayPartial ? 'Payment Amount' : 'Confirmed Amount'}
        </label>
        
        <div className={`pay-amount-field__container ${isBelowMin ? 'is-error' : amountNum > 0 ? 'is-valid' : ''}`}>
          <div className="pay-amount-field__currency">
            {currency}
          </div>
          <input
            type="number"
            className="pay-amount-field__input"
            value={amountInput}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="0.00"
            min={0}
            readOnly={true}
          />
          {!canPayPartial && (
            <div className="pay-amount-field__fixed-badge">
               <span className="pay-amount-field__fixed-text">Fixed</span>
            </div>
          )}
        </div>

        {isBelowMin && (
          <div className="pay-input-feedback is-error">
            <AlertCircle size={14} />
            <span>Minimum {formatCurrency(minRequired, currency)}</span>
          </div>
        )}

        {!isBelowMin && amountNum > 0 && amountNum < totalOwed && (
          <div className="pay-input-feedback">
            <Info size={14} />
            <span>Balance after payment: {formatCurrency(totalOwed - amountNum, currency)}</span>
          </div>
        )}

        {!isBelowMin && amountNum === totalOwed && (
          <div className="pay-input-feedback is-success">
            <Check size={14} />
            <span>Paying in full</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .pay-input-section {
          margin-bottom: 24px;
        }
        .pay-input-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          padding: 14px 18px;
          border-radius: 18px;
          margin-bottom: 16px;
        }
        .pay-input-notice__icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .pay-input-notice__text {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        
        .pay-amount-field__label {
          display: block;
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          margin-bottom: 12px;
          padding-left: 4px;
        }
               .pay-amount-field__container {
          display: flex;
          align-items: center;
          background: var(--bg);
          border: 1.5px solid var(--border-solid);
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          height: 60px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .pay-amount-field__container:focus-within {
          border-color: var(--clay);
          box-shadow: 0 8px 32px var(--clay-glow);
          transform: translateY(-1px);
        }
        .pay-amount-field__container.is-error { border-color: var(--error); background: rgba(239, 68, 68, 0.02); }
        .pay-amount-field__container.is-warn { border-color: var(--warning); }
        .pay-amount-field__container.is-valid { border-color: var(--clay); }

        .pay-amount-field__currency {
          padding: 0 24px;
          font-size: 14px;
          font-weight: 850;
          color: var(--text-muted);
          border-right: 1.5px solid var(--border-solid);
          height: 100%;
          display: flex;
          align-items: center;
          background: var(--surface);
          letter-spacing: 0.05em;
        }
        .pay-amount-field__input {
          flex: 1;
          border: none;
          background: none;
          padding: 0 24px;
          font-size: 28px;
          font-weight: 950;
          color: var(--text);
          outline: none;
          width: 100%;
          letter-spacing: -0.02em;
        }
        .pay-amount-field__fixed-badge {
          margin-right: 16px;
          padding: 4px 12px;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 100px;
        }
        .pay-amount-field__fixed-text {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .pay-input-feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-left: 4px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
        }
        .pay-input-feedback.is-error { color: var(--error); }
        .pay-input-feedback.is-success { color: var(--clay); }

        .pay-overpay-confirm {
          margin-top: 24px;
          padding: 24px;
          border-radius: 20px;
          background: var(--clay-faint);
          border: 1px solid rgba(217, 119, 87, 0.1);
        }
        .pay-overpay-confirm__header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .pay-overpay-confirm__icon-box {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(217, 119, 87, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
        }
        .pay-overpay-confirm__title {
          font-size: 11px;
          font-weight: 850;
          color: var(--clay);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pay-overpay-confirm__text {
          font-size: 13px;
          font-weight: 550;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .pay-overpay-confirm__text .highlight {
          font-weight: 900;
          color: var(--clay);
        }
        .pay-overpay-confirm__btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: var(--clay);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 24px var(--clay-glow);
        }
        .pay-overpay-confirm__btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .pay-overpay-confirm__status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          border-radius: 14px;
          background: var(--clay-faint);
          border: 1px solid rgba(217, 119, 87, 0.1);
          color: var(--clay);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}
