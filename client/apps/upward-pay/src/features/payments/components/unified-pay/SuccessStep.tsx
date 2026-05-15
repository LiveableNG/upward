'use client'

import React from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SuccessStepProps {
  finalAmount: number
  currency: string
  companyName: string
  onDone: () => void
}

export function SuccessStep({
  finalAmount,
  currency,
  companyName,
  onDone
}: SuccessStepProps) {
  return (
    <div className="pay-success-view">
      <div className="pay-success-card">
        <div className="pay-success-icon">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="pay-success-title">Payment Success!</h1>
        <p className="pay-success-text">
          Your payment to <strong>{companyName}</strong> has been successfully processed and recorded.
        </p>

        <div className="pay-receipt">
          <div className="pay-receipt-row is-total">
            <span className="pay-receipt-label">Amount paid</span>
            <span className="pay-receipt-value">{formatCurrency(finalAmount, currency)}</span>
          </div>
        </div>

        <button className="pay-done-btn" onClick={onDone}>
          <span>Go to Dashboard</span>
          <ChevronRight size={18} />
        </button>
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
      `}</style>
    </div>
  )
}
