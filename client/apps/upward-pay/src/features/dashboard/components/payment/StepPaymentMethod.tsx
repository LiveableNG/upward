import React from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type StepPaymentMethodProps = {
  amount: number
  totalInvoiceAmount?: number
  amountPaidAlready?: number
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
  totalInvoiceAmount = 0,
  amountPaidAlready = 0,
  onPayOnline,
  onBankTransfer,
  processing = false,
  bankTransferDisabled = false,
  bankTransferDisabledReason,
  onCancel,
  cancelling = false,
}: StepPaymentMethodProps) {
  const busy = processing || cancelling
  const isCompletingBalance = amountPaidAlready > 0 && totalInvoiceAmount > amountPaidAlready

  return (
    <div className="pay-flow__payment-method">
      <p className="pay-flow__payment-method-intro">
        {isCompletingBalance ? (
          <>
            Completing your remaining rent balance of <strong>{formatCurrency(amount)}</strong> (
            {formatCurrency(amountPaidAlready)} already paid of {formatCurrency(totalInvoiceAmount)})
            — choose how you&apos;d like to pay.
          </>
        ) : (
          <>
            Paying <strong>{formatCurrency(amount)}</strong> — choose how you&apos;d like to pay.
          </>
        )}
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
          <p className="pay-flow__method-card-title">Pay now (Bank Transfer, Card or USSD)</p>
          <p className="pay-flow__method-card-desc">Instant payment through Upward · Immediate confirmation</p>
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
          <p className="pay-flow__method-card-title">Upload payment proof</p>
          <p className="pay-flow__method-card-desc">
            {bankTransferDisabled
              ? bankTransferDisabledReason || 'Direct transfer is unavailable for this property.'
              : 'Already made or making a direct transfer? Upload receipt for manual review'}
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
