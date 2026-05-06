'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AllocationBreakdownProps {
  showBreakdown: boolean
  setShowBreakdown: (val: boolean | ((prev: boolean) => boolean)) => void
  effectiveAllocs: any[]
  currency: string
  lineItems: any[]
  canPayPartial?: boolean
  onAllocationChange?: (id: number, amount: number) => void
}

export function AllocationBreakdown({
  showBreakdown,
  setShowBreakdown,
  effectiveAllocs,
  currency,
  lineItems,
  canPayPartial,
  onAllocationChange
}: AllocationBreakdownProps) {
  return (
    <div className="pay-breakdown">
      <div 
        className="pay-breakdown__header"
        onClick={() => {
          if (window.innerWidth < 1024) {
            setShowBreakdown(v => !v)
          }
        }}
      >
        <div className="pay-breakdown__header-left">
           <span className="pay-breakdown__label">Invoice Breakdown</span>
           {canPayPartial && (
             <span className="pay-breakdown__tip">Edit items to adjust payment</span>
           )}
        </div>
        <ChevronDown size={14} className={`pay-breakdown__chevron ${showBreakdown ? 'is-open' : ''}`} />
      </div>

      <div className={`pay-breakdown__content ${showBreakdown ? 'is-open' : ''}`}>
        <div className="pay-breakdown__list">
          {effectiveAllocs.map(alloc => {
            const isPaid = lineItems.find(i => i.id === alloc.id)?.status === 'PAID'
            const pct = alloc.remaining > 0 ? Math.min(100, ((alloc.amountPaid + alloc.allocated) / alloc.totalAmount) * 100) : 100

            return (
              <div key={alloc.id} className={`pay-breakdown-item ${isPaid ? 'is-settled' : ''}`}>
                <div className="pay-breakdown-item__row">
                  <div className="pay-breakdown-item__info">
                    <span className="pay-breakdown-item__name">{alloc.name}</span>
                    <span className="pay-break
                    down-item__stats">
                      {isPaid ? 'Settled' : alloc.allocated >= alloc.remaining ? 'Full Settlement' : 'Partial Payment'}
                    </span>
                  </div>
                  {!isPaid && canPayPartial && onAllocationChange && alloc.name !== 'Upward Processing Fee' ? (
                    <div className="pay-breakdown-item__action">
                      <div className="pay-breakdown-item__amount-container">
                        <span className="pay-breakdown-item__currency-small">{currency}</span>
                        <input
                          type="number"
                          className="pay-breakdown-item__amount-input"
                          value={alloc.allocated || ''}
                          onChange={(e) => onAllocationChange(alloc.id, parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          max={alloc.remaining}
                          min={0}
                        />
                      </div>
                      <span className="pay-breakdown-item__limit">
                        Max {formatCurrency(alloc.remaining, currency)}
                      </span>
                    </div>
                  ) : (
                    <div className="pay-breakdown-item__final">
                      <span className={`pay-breakdown-item__amount ${isPaid ? 'is-paid' : ''}`}>
                        {isPaid ? formatCurrency(alloc.totalAmount, currency) : alloc.allocated > 0 ? formatCurrency(alloc.allocated, currency) : '—'}
                      </span>
                      {isPaid && <div className="pay-breakdown-item__check">✓</div>}
                    </div>
                  )}
                </div>
                <div className="pay-breakdown-item__progress">
                  <div className={`pay-breakdown-item__bar ${isPaid ? 'is-paid' : ''}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}

        </div>
      </div>

      <style jsx>{`
        .pay-breakdown {
          margin-top: 24px;
        }
        .pay-breakdown__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          margin-bottom: 16px;
          cursor: pointer;
          user-select: none;
        }
        .pay-breakdown__header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pay-breakdown__label {
          font-size: 11px;
          font-weight: 900;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pay-breakdown__tip {
          font-size: 9px;
          font-weight: 700;
          color: var(--clay);
          background: var(--clay-faint);
          padding: 2px 10px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .pay-breakdown__chevron {
          color: var(--text-muted);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pay-breakdown__chevron.is-open {
          transform: rotate(180deg);
          color: var(--text);
        }

        .pay-breakdown__content {
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.03);
          display: none;
        }
        .pay-breakdown__content.is-open {
          display: block;
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (min-width: 1024px) {
          .pay-breakdown__header {
            cursor: default;
          }
          .pay-breakdown__chevron {
            display: none;
          }
          .pay-breakdown__content {
            display: block !important;
            border: none;
            background: var(--surface);
            box-shadow: none;
            border-radius: 20px;
          }
          .pay-breakdown-item:hover {
            background: rgba(0,0,0,0.02);
          }
          .pay-breakdown-item {
            border-bottom: 1px solid rgba(0,0,0,0.05);
          }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pay-breakdown__list {
          display: flex;
          flex-direction: column;
        }
        .pay-breakdown-item {
          padding: 16px;
          border-bottom: 1px solid var(--border-solid);
          transition: background 0.2s;
        }
        .pay-breakdown-item:last-child { border-bottom: none; }
        .pay-breakdown-item:hover { background: var(--surface); }
        .pay-breakdown-item.is-credit { background: var(--clay-faint); }

        .pay-breakdown-item__row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
        }
        .pay-breakdown-item__info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .pay-breakdown-item__name {
          font-size: 14px;
          font-weight: 800;
          color: var(--text);
        }
        .pay-breakdown-item__stats {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .pay-breakdown-item__amount {
          font-size: 14px;
          font-weight: 950;
          color: var(--text);
        }
        .pay-breakdown-item__amount.is-highlight { color: var(--clay); }

        .pay-breakdown-item__progress {
          height: 4px;
          background: var(--surface);
          border-radius: 100px;
          overflow: hidden;
        }
        .pay-breakdown-item__bar {
          height: 100%;
          background: var(--clay);
          border-radius: 100px;
          transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0.6;
        }

        .pay-breakdown-item.is-settled {
          background: rgba(0,0,0,0.01);
          opacity: 0.7;
        }
        .pay-breakdown-item.is-settled:hover {
          background: rgba(0,0,0,0.02);
        }
        .pay-breakdown-item__final {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pay-breakdown-item__check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--clay);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 4px 12px var(--clay-glow);
        }
        .pay-breakdown-item__amount.is-paid {
          color: var(--clay);
          font-weight: 900;
        }
        .pay-breakdown-item__bar.is-paid {
          opacity: 1;
          background: var(--clay);
        }
        .pay-breakdown-item__action {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .pay-breakdown-item__limit {
          font-size: 10px;
          font-weight: 700;
          color: var(--clay);
          opacity: 0.8;
          letter-spacing: 0.02em;
        }
        .pay-breakdown-item__amount-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pay-breakdown-item__currency-small {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }
        .pay-breakdown-item__amount-input {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 14px;
          font-weight: 950;
          color: var(--text);
          text-align: right;
          width: 100px;
          outline: none;
          transition: all 0.2s;
        }
        .pay-breakdown-item__amount-input:focus {
          border-color: var(--clay);
          background: var(--bg);
          box-shadow: 0 0 0 2px var(--clay-glow);
        }
        .pay-breakdown-item__label-input {
          background: none;
          border: none;
          padding: 0;
          font-size: 14px;
          font-weight: 800;
          color: var(--clay);
          outline: none;
          width: 100%;
        }
        .pay-breakdown-item__label-input::placeholder { color: rgba(217, 119, 87, 0.3); }
      `}</style>
    </div>
  )
}
