import React from 'react'
import { Check, Star, Receipt } from 'lucide-react'
import { type Landlord } from './types'
import { formatCurrency } from '@/lib/utils'

export function StepSuccess({
  landlord,
  amount,
  transactionId,
  onDone,
  router,
}: {
  landlord: Landlord
  amount: number
  transactionId?: string
  onDone: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--success) 0%, #16a34a 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
          marginBottom: 24,
          animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        <Check size={32} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
        Payment sent!
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 28,
          maxWidth: 300,
        }}
      >
        Your rent of <strong style={{ color: 'var(--text)' }}>{formatCurrency(amount)}</strong> has
        been sent to <strong style={{ color: 'var(--text)' }}>{landlord.accountName}</strong>.
      </p>
      <div
        style={{
          width: '100%',
          padding: '20px',
          background: 'linear-gradient(135deg, var(--clay-faint) 0%, transparent 100%)',
          border: '1px solid rgba(217,119,87,0.12)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Star size={14} fill="currentColor" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            Rent credit recorded
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          This payment contributes to your rent credit score.
        </p>
      </div>
      <button onClick={onDone} className="btn btn--primary btn--full" style={{ marginBottom: 10 }}>
        Back to dashboard
      </button>
      <button
        onClick={() => router.push(`/dashboard/receipts?id=${transactionId}`)}
        className="btn btn--secondary btn--full"
        disabled={!transactionId}
      >
        <Receipt size={20} /> View / Download receipt
      </button>
    </div>
  )
}
