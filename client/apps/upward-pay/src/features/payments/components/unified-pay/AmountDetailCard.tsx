'use client'

import React from 'react'
import { Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AmountDetailCardProps {
  totalOwed: number
  currency: string
  dueDate: string
  parsedAmount: number
  progressPct: number
  label?: string
}

export function AmountDetailCard({
  totalOwed,
  currency,
  dueDate,
  parsedAmount,
  progressPct,
  label = 'Amount Outstanding'
}: AmountDetailCardProps) {
  return (
    <div className="pay-amount-card">
      <div className="pay-amount-card__main">
        <span className="pay-amount-card__label">{label}</span>
        <div className="pay-amount-card__value">{formatCurrency(totalOwed, currency)}</div>
        {dueDate && !isNaN(new Date(dueDate).getTime()) && (
          <div className="pay-amount-card__due">
            <Calendar size={12} />
            <span>Due by {new Date(dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>



      <style jsx>{`
        .pay-amount-card {
          background: var(--bg);
          border: 1px solid var(--border-solid);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 16px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.04);
          position: relative;
          overflow: hidden;
        }
        .pay-amount-card__main {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pay-amount-card__label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 850;
          letter-spacing: 0.15em;
          margin-bottom: 12px;
        }
        .pay-amount-card__value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 12px;
          letter-spacing: -0.05em;
          line-height: 1;
        }
        .pay-amount-card__due {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 750;
          color: var(--text-secondary);
          background: var(--surface);
          padding: 8px 18px;
          border-radius: 100px;
          border: 1px solid var(--border-solid);
        }
        .pay-amount-card__progress {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-solid);
        }
        .pay-amount-card__progress-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 12px;
        }
        .pay-amount-card__allocation {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .pay-amount-card__allocation-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .pay-amount-card__allocation-value {
          font-size: 14px;
          font-weight: 900;
          color: var(--text);
        }
        .pay-amount-card__percentage {
          font-size: 14px;
          font-weight: 950;
          color: var(--clay);
        }
        .pay-amount-card__track {
          height: 10px;
          background: var(--surface);
          border-radius: 100px;
          overflow: hidden;
          border: 1px solid var(--border-solid);
        }
        .pay-amount-card__bar {
          height: 100%;
          background: var(--clay);
          border-radius: 100px;
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 16px rgba(217, 119, 87, 0.3);
        }
      `}</style>
    </div>
  )
}
