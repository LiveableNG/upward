import React from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type StepPaymentMethodProps = {
  amount: number
  onPayOnline: () => void
  onBankTransfer: () => void
  processing?: boolean
}

export function StepPaymentMethod({
  amount,
  onPayOnline,
  onBankTransfer,
  processing = false,
}: StepPaymentMethodProps) {
  return (
    <div className="pay-flow__payment-method">
      <p className="pay-flow__payment-method-intro">
        Paying <strong>{formatCurrency(amount)}</strong> — choose how you&apos;d like to pay.
      </p>

      <button
        type="button"
        className="pay-flow__method-card"
        onClick={onPayOnline}
        disabled={processing}
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
        disabled={processing}
      >
        <div className="pay-flow__method-card-icon pay-flow__method-card-icon--bank">
          <Landmark size={22} />
        </div>
        <div className="pay-flow__method-card-body">
          <p className="pay-flow__method-card-title">Bank transfer</p>
          <p className="pay-flow__method-card-desc">Pay directly to landlord · no platform fees · upload proof after</p>
        </div>
      </button>
    </div>
  )
}
