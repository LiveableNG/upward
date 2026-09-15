import React from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { RentDepositApplicationCard } from '@/features/payments/components/unified-pay/RentDepositApplicationCard'

type StepPaymentMethodProps = {
  amount: number
  paymentRequestUuid?: string
  propertyUuid?: string
  lineItems?: any[]
  canPayPartial?: boolean
  onDepositApplied?: (appliedAmount: number) => void
  onSettledSuccess?: () => void
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
  paymentRequestUuid,
  propertyUuid,
  lineItems = [],
  canPayPartial = true,
  onDepositApplied,
  onSettledSuccess,
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
      {paymentRequestUuid && (
        <RentDepositApplicationCard
          paymentRequestUuid={paymentRequestUuid}
          propertyUuid={propertyUuid}
          totalOwed={amount}
          lineItems={lineItems}
          canPayPartial={canPayPartial}
          onDepositApplied={onDepositApplied}
          onSettledSuccess={onSettledSuccess}
        />
      )}

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
