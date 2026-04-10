'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AllocationBreakdownProps {
  showBreakdown: boolean
  setShowBreakdown: (val: boolean | ((prev: boolean) => boolean)) => void
  manualMode: boolean
  setManualMode: (val: boolean) => void
  effectiveAllocs: any[]
  currency: string
  lineItems: any[]
  overpayConfirmed: boolean
  futureCreditAmount: number
  futureCreditLabel: string
  setFutureCreditLabel: (val: string) => void
  manualAllocs: Record<number, number>
  setManualAllocs: (val: any) => void
  onEnterManualMode: () => void
}

export function AllocationBreakdown({
  showBreakdown,
  setShowBreakdown,
  manualMode,
  setManualMode,
  effectiveAllocs,
  currency,
  lineItems,
  overpayConfirmed,
  futureCreditAmount,
  futureCreditLabel,
  setFutureCreditLabel,
  manualAllocs,
  setManualAllocs,
  onEnterManualMode
}: AllocationBreakdownProps) {
  return (
    <div className="pay-breakdown">
      <div 
        className="pay-breakdown__header"
        onClick={() => setShowBreakdown(v => !v)}
      >
        <div className="pay-breakdown__header-left">
           <span className="pay-breakdown__label">Payment Allocation</span>
           <div className={`pay-breakdown__badge ${manualMode ? 'is-manual' : 'is-auto'}`}>
              {manualMode ? 'Manual' : 'Auto'}
           </div>
        </div>
        <ChevronDown size={14} className={`pay-breakdown__chevron ${showBreakdown ? 'is-open' : ''}`} />
      </div>

      {showBreakdown && (
        <div className="pay-breakdown__content">
          <div className="pay-breakdown__list">
            {effectiveAllocs.map(alloc => {
              const isPaid = lineItems.find(i => i.id === alloc.id)?.status === 'PAID'
              if (isPaid) return null
              const pct = alloc.remaining > 0 ? Math.min(100, ((alloc.amountPaid + alloc.allocated) / alloc.totalAmount) * 100) : 100

              return (
                <div key={alloc.id} className="pay-breakdown-item">
                  <div className="pay-breakdown-item__row">
                    <div className="pay-breakdown-item__info">
                      <span className="pay-breakdown-item__name">{alloc.label}</span>
                      <span className="pay-breakdown-item__stats">
                        {formatCurrency(alloc.amountPaid, currency)} of {formatCurrency(alloc.totalAmount, currency)} paid
                      </span>
                    </div>
                    {manualMode ? (
                      <div className="pay-breakdown-item__input-wrapper">
                        <span className="pay-breakdown-item__currency">{currency}</span>
                        <input
                          type="number"
                          value={manualAllocs[alloc.id] ?? alloc.allocated}
                          onChange={e => setManualAllocs((prev: any) => ({ ...prev, [alloc.id]: parseFloat(e.target.value) || 0 }))}
                          className="pay-breakdown-item__input"
                        />
                      </div>
                    ) : (
                      <span className="pay-breakdown-item__amount">
                        {alloc.allocated > 0 ? formatCurrency(alloc.allocated, currency) : '—'}
                      </span>
                    )}
                  </div>
                  <div className="pay-breakdown-item__progress">
                    <div className="pay-breakdown-item__bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}

            {overpayConfirmed && futureCreditAmount > 0 && (
              <div className="pay-breakdown-item is-credit">
                <div className="pay-breakdown-item__row">
                  <div className="pay-breakdown-item__info">
                    <input
                      className="pay-breakdown-item__label-input"
                      value={futureCreditLabel}
                      onChange={e => setFutureCreditLabel(e.target.value)}
                      placeholder="Name this credit..."
                    />
                    <span className="pay-breakdown-item__stats">Balance stored as future credit</span>
                  </div>
                  <span className="pay-breakdown-item__amount is-highlight">
                    {formatCurrency(futureCreditAmount, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pay-breakdown__actions">
            {!manualMode ? (
              <button 
                className="pay-breakdown__mode-btn"
                onClick={onEnterManualMode}
              >
                Customize Amounts
              </button>
            ) : (
              <button 
                className="pay-breakdown__mode-btn is-active"
                onClick={() => setManualMode(false)}
              >
                Reset to Automatic
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .pay-breakdown {
          margin-top: 32px;
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
        .pay-breakdown__badge {
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 3px 10px;
          border-radius: 100px;
        }
        .pay-breakdown__badge.is-auto {
          background: var(--success-bg);
          color: var(--success);
          border: 1px solid rgba(34, 197, 94, 0.15);
        }
        .pay-breakdown__badge.is-manual {
          background: var(--clay-faint);
          color: var(--clay);
          border: 1px solid rgba(217, 119, 87, 0.15);
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
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
          padding: 20px;
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

        .pay-breakdown-item__input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: 10px;
          padding: 0 12px;
          height: 36px;
          transition: border-color 0.2s;
        }
        .pay-breakdown-item__input-wrapper:focus-within { border-color: var(--clay); }
        .pay-breakdown-item__currency {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .pay-breakdown-item__input {
          width: 72px;
          border: none;
          background: none;
          text-align: right;
          font-size: 13px;
          font-weight: 850;
          color: var(--text);
          outline: none;
          padding: 0;
        }

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

        .pay-breakdown__actions {
          padding: 16px;
          background: var(--surface);
          display: flex;
          justify-content: center;
        }
        .pay-breakdown__mode-btn {
          padding: 8px 18px;
          border-radius: 100px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .pay-breakdown__mode-btn:hover {
          background: var(--surface);
          color: var(--text);
          border-color: var(--text-muted);
        }
        .pay-breakdown__mode-btn.is-active {
          background: var(--clay);
          color: #fff;
          border-color: var(--clay);
          box-shadow: 0 4px 12px var(--clay-glow);
        }
      `}</style>
    </div>
  )
}
