'use client'

import React from 'react'
import { Check, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SuccessStepProps {
  finalAmount: number
  currency: string
  companyName: string
  isPendingRefund?: boolean
  isManualReview?: boolean
  onDone: () => void
}

export function SuccessStep({
  finalAmount,
  currency,
  companyName,
  isPendingRefund,
  isManualReview,
  onDone
}: SuccessStepProps) {
  React.useEffect(() => {
    if (!isPendingRefund && !isManualReview) {
      const timer = setTimeout(() => {
        onDone()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isPendingRefund, isManualReview, onDone])

  return (
    <div className={`pay-success-view ${isPendingRefund ? 'is-warning' : ''}`}>
      <div className="pay-success-card">
        {isPendingRefund ? (
          <>
            <div className="pay-success-icon is-warning animate-pulse">
              <AlertTriangle size={36} strokeWidth={2.5} />
            </div>
            <h1 className="pay-success-title is-warning">Review Pending</h1>
            <p className="pay-success-text">
              We detected a payment to <strong>{companyName}</strong>, but it is below the required invoice amount. Since this invoice requires full payment, your Property Manager will decide whether to accept this amount or issue a refund.
            </p>
          </>
        ) : isManualReview ? (
          <>
            <div className="pay-success-icon is-info">
              <Check size={40} strokeWidth={3} />
            </div>
            <h1 className="pay-success-title is-info">Proof Submitted</h1>
            <p className="pay-success-text">
              Your payment proof for <strong>{companyName}</strong> has been uploaded successfully. It is currently under review by your Property Manager.
            </p>
          </>
        ) : (
          <>
            <div className="pay-success-icon">
              <Check size={40} strokeWidth={3} />
            </div>
            <h1 className="pay-success-title">Payment Success!</h1>
            <p className="pay-success-text">
              Your payment to <strong>{companyName}</strong> has been successfully processed and recorded.
            </p>
          </>
        )}

        <div className="pay-receipt">
          <div className="pay-receipt-row is-total">
            <span className="pay-receipt-label">
              {isPendingRefund ? 'Amount Detected' : isManualReview ? 'Amount Declared' : 'Amount paid'}
            </span>
            <span className="pay-receipt-value">{formatCurrency(finalAmount, currency)}</span>
          </div>
        </div>

        <button className={`pay-done-btn ${isPendingRefund ? 'is-warning' : ''}`} onClick={onDone}>
          <span>Go to Dashboard</span>
          <ChevronRight size={18} />
        </button>

        {!isPendingRefund && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
            Redirecting to dashboard automatically...
          </p>
        )}
      </div>


      <style jsx>{`
        .pay-success-view {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg);
        }
        .pay-success-card {
          width: 100%;
          max-width: 440px;
          background: var(--surface);
          border-radius: 40px;
          padding: 56px 40px;
          text-align: center;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-solid);
          animation: cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cardAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pay-success-icon {
          width: 88px;
          height: 88px;
          background: var(--clay);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          box-shadow: 0 12px 32px var(--clay-glow);
          animation: iconPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes iconPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .pay-success-title {
          font-size: 28px;
          font-weight: 950;
          color: var(--clay);
          margin-bottom: 12px;
          letter-spacing: -0.04em;
        }
        .pay-success-text {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .pay-receipt {
          background: var(--surface2);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 8px 0;
          margin-bottom: 40px;
        }
        .pay-receipt-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          font-size: 14px;
          border-bottom: 1px dashed var(--border-solid);
        }
        .pay-receipt-row:last-child { border-bottom: none; }
        .pay-receipt-label {
          color: var(--text-muted);
          font-weight: 600;
        }
        .pay-receipt-value {
          color: var(--text);
          font-weight: 850;
        }
        .pay-receipt-row.is-credit {
          background: rgba(217, 119, 87, 0.04);
        }
        .pay-receipt-row.is-credit .pay-receipt-label,
        .pay-receipt-row.is-credit .pay-receipt-value {
          color: var(--clay);
        }
        .pay-receipt-row.is-total {
          padding-top: 20px;
          margin-top: 4px;
          border-top: 1px solid var(--border-solid);
        }
        .pay-receipt-row.is-total .pay-receipt-label {
          color: var(--text);
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.1em;
        }
        .pay-receipt-row.is-total .pay-receipt-value {
          font-size: 20px;
          font-weight: 950;
          color: var(--text);
        }

        .pay-done-btn {
          width: 100%;
          height: 64px;
          border-radius: 100px;
          background: var(--clay);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--shadow-clay);
        }
        .pay-done-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 48px var(--clay-glow);
          filter: brightness(1.1);
        }
        .pay-done-btn:active {
          transform: scale(0.98);
        }

        /* Warning Overrides */
        .pay-success-icon.is-warning {
          background: #d97706;
          box-shadow: 0 12px 32px rgba(217, 119, 87, 0.25);
        }
        .pay-success-title.is-warning {
          color: #d97706;
        }
        .pay-done-btn.is-warning {
          background: #d97706;
          box-shadow: 0 12px 28px rgba(217, 119, 87, 0.2);
        }
        .pay-done-btn.is-warning:hover {
          box-shadow: 0 20px 48px rgba(217, 119, 87, 0.35);
        }

        /* Info Overrides (Manual Review) */
        .pay-success-icon.is-info {
          background: #0ea5e9;
          box-shadow: 0 12px 32px rgba(14, 165, 233, 0.25);
        }
        .pay-success-title.is-info {
          color: #0ea5e9;
        }
        .pay-done-btn.is-info {
          background: #0ea5e9;
          box-shadow: 0 12px 28px rgba(14, 165, 233, 0.2);
        }
        .pay-done-btn.is-info:hover {
          box-shadow: 0 20px 48px rgba(14, 165, 233, 0.35);
        }
      `}</style>
    </div>
  )
}
