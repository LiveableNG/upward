import React from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type StepPaymentMethodProps = {
  amount: number
  onPayOnline: () => void
  onBankTransfer: () => void
  processing?: boolean
  bankTransferDisabled?: boolean
  bankTransferDisabledReason?: string
  onCancel?: () => void
  cancelling?: boolean
}

export function StepPaymentMethod({
  amount,
  onPayOnline,
  onBankTransfer,
  processing = false,
  bankTransferDisabled = false,
  bankTransferDisabledReason,
  onCancel,
  cancelling = false,
}: StepPaymentMethodProps) {
  const busy = processing || cancelling

  return (
    <div className="pay-flow__payment-method">
      <p className="pay-flow__payment-method-intro">
        Paying <strong>{formatCurrency(amount)}</strong> — choose how you&apos;d like to pay.
      </p>

      <button
        type="button"
        className="pay-flow__method-card"
        onClick={onPayOnline}
        disabled={busy}
      >
        <div className="pay-flow__method-card-icon pay-flow__method-card-icon--online">
          <CreditCard size={22} />
        </div>
        <div className="pay-flow__method-card-body">
          <p className="pay-flow__method-card-title">Pay online</p>
          <p className="pay-flow__method-card-desc">Instant confirmation · processing fee applies at checkout</p>
        </div>
      </button>

      <button
        type="button"
        className="pay-flow__method-card"
        onClick={onBankTransfer}
        disabled={busy || bankTransferDisabled}
      >
        <div className="pay-flow__method-card-icon pay-flow__method-card-icon--bank">
          <Landmark size={22} />
        </div>
        <div className="pay-flow__method-card-body">
          <p className="pay-flow__method-card-title">Bank transfer</p>
          <p className="pay-flow__method-card-desc">
            {bankTransferDisabled
              ? bankTransferDisabledReason || 'Bank transfer is unavailable for this property.'
              : 'Pay directly to landlord · no platform fees · upload proof after'}
          </p>
        </div>
      </button>

      {onCancel ? (
        <button
          type="button"
          className="btn btn--ghost btn--full btn--pill"
          onClick={onCancel}
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {cancelling ? 'Cancelling…' : 'Cancel this payment request'}
        </button>
      ) : null}
    </div>
  )
}
