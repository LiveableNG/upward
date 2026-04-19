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
  propertyAddress,
  propertyBalance,
}: {
  landlord: Landlord
  amount: number
  transactionId?: string
  onDone: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any
  propertyAddress?: string
  propertyBalance?: any
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 20px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
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
        <Check size={40} />
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em' }}>
        Transaction Successful
      </h2>
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 32,
          maxWidth: 340,
        }}
      >
        You've sent <strong style={{ color: 'var(--text)' }}>{formatCurrency(amount)}</strong> to <strong style={{ color: 'var(--text)' }}>{landlord.accountName}</strong> for <strong style={{ color: 'var(--text)' }}>{propertyAddress || 'your property'}</strong>.
      </p>

      <div
        style={{
          width: '100%',
          padding: '24px',
          background: 'var(--surface2)',
          border: '1px solid var(--border-solid)',
          borderRadius: '24px',
          marginBottom: 32,
          textAlign: 'left',
          position: 'relative',
          boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 60, height: 60,
          background: 'var(--clay-faint)', borderRadius: '0 24px 0 60px', pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={16} fill="currentColor" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Credit Score Impact
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 0 }}>
          {propertyBalance?.remainingBalance === 0 
           ? "Full rent settled! This consistent behavior signals high reliability to credit agencies and property managers."
           : "This partial payment has been recorded. Complete the balance on time to maximize your credit score boost."}
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={onDone} className="btn btn--primary btn--full" style={{ height: 56, fontSize: 16 }}>
          Return to Dashboard
        </button>
        <button
          onClick={() => router.push(`/dashboard/receipts?id=${transactionId}`)}
          className="btn btn--secondary btn--full"
          disabled={!transactionId}
          style={{ height: 56, fontSize: 15, gap: 10 }}
        >
          <Receipt size={20} /> View Digital Receipt
        </button>
      </div>
      
      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
        Transaction ID: {transactionId || 'Pending...'}
      </div>
    </div>
  )
}
