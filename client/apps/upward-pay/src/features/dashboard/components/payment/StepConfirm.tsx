import React from 'react'
import { MapPin, Wallet, Info } from 'lucide-react'
import { type Landlord } from './types'
import { LandlordAvatar } from './LandlordAvatar'
import { PayFlowPrimaryButton } from './PayPageShell'
import { formatCurrency } from '@/lib/utils'
import InvoiceCard from './InvoiceCard'

export function StepConfirm({
  landlord,
  amount,
  narration,
  paymentType = 'Rent Payment',
  propertyAddress = '',
  onConfirm,
  onEditAmount,
  onBack,
  isPriorityRequest,
  lineItems = [],
  requestedAmount = 0,
  totalPaidAlready = 0,
  propertyBalance = null,
  processing = false,
}: {
  landlord: Landlord
  amount: number
  narration: string
  paymentType?: string
  propertyAddress?: string
  onConfirm: () => void
  onEditAmount?: () => void
  onBack: () => void
  isPriorityRequest?: boolean
  lineItems?: Array<{ label: string; amount: number }>
  requestedAmount?: number
  totalPaidAlready?: number
  propertyBalance?: {
    totalOwed: number
    amountPaid: number
    remainingBalance: number
    currency: string
    dueDate?: string
  } | null
  processing?: boolean
}) {
  void paymentType
  void propertyAddress
  void onEditAmount
  void onBack

  const remainingRequested = Math.max(0, requestedAmount - totalPaidAlready)
  const excess = requestedAmount > 0 ? Math.max(0, amount - remainingRequested) : 0
  const appliedToBill = requestedAmount > 0 ? Math.min(amount, remainingRequested) : amount

  return (
    <div>
      <div className="pay-flow__confirm-header">
        <div className="pay-flow__confirm-name-row">
          <LandlordAvatar letter={landlord.avatar} size={48} />
          <h3 className="pay-flow__confirm-name">{landlord.name}</h3>
        </div>

        {landlord.address && (
          <div className="pay-flow__confirm-address">
            <MapPin size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {landlord.address}
            </span>
          </div>
        )}

        {landlord.accountNumber && (
          <div className="pay-flow__settlement">
            <div className="pay-flow__settlement-label">
              <Wallet size={12} />
              Settlement Account
            </div>
            <div className="pay-flow__settlement-name">{landlord.accountName}</div>
            <div className="pay-flow__settlement-meta">
              {landlord.bankName || 'Verified Bank'} • {landlord.accountNumber}
            </div>
          </div>
        )}
      </div>

      {propertyBalance && (
        <div className="pay-flow__balance">
          <div className="pay-flow__balance-top">
            <div>
              <div className="pay-flow__balance-label">Total Rent</div>
              <div className="pay-flow__balance-value">{formatCurrency(propertyBalance.totalOwed)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="pay-flow__balance-label pay-flow__balance-label--accent">Remaining</div>
              <div className="pay-flow__balance-value pay-flow__balance-value--accent">
                {formatCurrency(propertyBalance.remainingBalance)}
              </div>
            </div>
          </div>
          <div className="pay-flow__balance-grid">
            <div>
              <div className="pay-flow__balance-grid-label">Amount Paid</div>
              <div className="pay-flow__balance-grid-value">{formatCurrency(propertyBalance.amountPaid)}</div>
            </div>
            <div className="pay-flow__balance-grid-right">
              <div className="pay-flow__balance-grid-label">Next Due Date</div>
              <div className="pay-flow__balance-grid-value">
                {propertyBalance.dueDate ? new Date(propertyBalance.dueDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {excess > 0 && (
        <div className="pay-flow__overpay">
          <div className="pay-flow__overpay-row">
            <span className="pay-flow__overpay-label">Applied to Current Cycle</span>
            <span className="pay-flow__overpay-value">{formatCurrency(appliedToBill)}</span>
          </div>
          <div className="pay-flow__overpay-row">
            <span className="pay-flow__overpay-label">
              Future Credit (Overpayment)
              <span
                style={{ color: 'var(--skin-primary, #c2501f)', cursor: 'help' }}
                title="This excess will be tracked and visible in your transactions for future use."
              >
                <Info size={14} />
              </span>
            </span>
            <span className="pay-flow__overpay-value pay-flow__overpay-value--accent">{formatCurrency(excess)}</span>
          </div>
        </div>
      )}

      {lineItems && lineItems.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <InvoiceCard
            title="Payment Summary"
            notes={narration}
            lineItems={lineItems}
            totalAmount={amount}
            isPriority={!!isPriorityRequest}
          />
        </div>
      )}

      <div className="pay-flow__grand-total">
        <span className="pay-flow__grand-total-label">Total To Pay</span>
        <span className="pay-flow__grand-total-value">{formatCurrency(amount)}</span>
      </div>

      <div className="pay-flow__cta-wrap">
        <PayFlowPrimaryButton onClick={onConfirm} disabled={processing} loading={processing}>
          {processing ? 'Processing...' : 'Confirm & Pay'}
        </PayFlowPrimaryButton>
      </div>

      <p className="pay-flow__secure">🔒 Secured by Upward</p>
    </div>
  )
}
