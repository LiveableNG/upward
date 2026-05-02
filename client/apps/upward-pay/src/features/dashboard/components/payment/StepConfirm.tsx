import React from 'react'
import { MapPin, Wallet } from 'lucide-react'
import { type Landlord } from './types'
import { LandlordAvatar } from './LandlordAvatar'
import { formatCurrency } from '@/lib/utils'
import { Info } from 'lucide-react'
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
  const remainingRequested = Math.max(0, requestedAmount - totalPaidAlready)
  const excess = requestedAmount > 0 ? Math.max(0, amount - remainingRequested) : 0
  const appliedToBill = requestedAmount > 0 ? Math.min(amount, remainingRequested) : amount

  return (
    <div style={{ padding: '0 20px 40px' }}>
      <div style={{ padding: '20px 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LandlordAvatar letter={landlord.avatar} size={48} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {landlord.name}
            </h3>
          </div>
        </div>
        {landlord.address && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <MapPin size={14} color="var(--text-muted)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {landlord.address}
            </span>
          </div>
        )}
      </div>


      {propertyBalance && (
        <div style={{ padding: '20px', background: 'var(--surface2)', border: '1px solid var(--border-solid)', borderRadius: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Total Rent</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{formatCurrency(propertyBalance.totalOwed)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--clay)', textTransform: 'uppercase', marginBottom: 4 }}>Remaining</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--clay)' }}>{formatCurrency(propertyBalance.remainingBalance)}</div>
            </div>
          </div>
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-solid)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
             <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Amount Paid</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{formatCurrency(propertyBalance.amountPaid)}</div>
             </div>
             <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Next Due Date</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--clay)' }}>
                  {propertyBalance.dueDate ? new Date(propertyBalance.dueDate).toLocaleDateString() : 'N/A'}
                </div>
             </div>
          </div>
        </div>
      )}

      {excess > 0 && (
        <div style={{
          padding: '16px',
          background: 'var(--surface2)',
          borderLeft: '4px solid var(--clay)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Applied to Current Cycle</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(appliedToBill)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Future Credit (Overpayment)
              <div style={{ color: 'var(--clay)', cursor: 'help' }} title="This excess will be tracked and visible in your transactions for future use.">
                <Info size={14} />
              </div>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clay)' }}>{formatCurrency(excess)}</span>
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
      <div style={{ padding: '0 4px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total To Pay</span>
          <span style={{ fontSize: 24, fontWeight: 801, color: 'var(--text)' }}>
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      <button
        disabled={processing}
        onClick={onConfirm}
        className="btn btn--primary btn--full"
        style={{ 
          height: 56, 
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: processing ? 0.7 : 1
        }}
      >
        {processing && <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />}
        {processing ? 'Processing...' : 'Confirm & Pay'}
      </button>
    </div>
  )
}
