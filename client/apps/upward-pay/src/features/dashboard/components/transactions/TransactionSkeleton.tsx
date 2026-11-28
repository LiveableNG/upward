'use client'

import { TransactionsPageShell } from './TransactionsPageShell'

export function TransactionSkeleton() {
  const noop = () => {}

  return (
    <TransactionsPageShell title="Transactions" onBack={noop}>
      <div className="tx-page--skeleton">
        <div
          className="tx-page__skeleton-block"
          style={{ width: '100%', height: 112, borderRadius: 18, marginBottom: 16 }}
        />

        <div className="tx-page__controls">
          <div
            className="tx-page__skeleton-block"
            style={{ width: '100%', height: 44, borderRadius: 13 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              className="tx-page__skeleton-block"
              style={{ width: 68, height: 34, borderRadius: 999 }}
            />
            <div
              className="tx-page__skeleton-block"
              style={{ width: 76, height: 34, borderRadius: 999 }}
            />
            <div
              className="tx-page__skeleton-block"
              style={{ width: 88, height: 34, borderRadius: 999 }}
            />
          </div>
        </div>

        <div className="tx-page__month-group">
          <div
            className="tx-page__skeleton-block"
            style={{ width: 108, height: 12, marginBottom: 10 }}
          />
          <div className="tx-page__card">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="tx-page__row" style={{ pointerEvents: 'none' }}>
                <div
                  className="tx-page__skeleton-block"
                  style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }}
                />
                <div className="tx-page__row-info">
                  <div
                    className="tx-page__skeleton-block"
                    style={{ width: '58%', height: 14, marginBottom: 6 }}
                  />
                  <div className="tx-page__skeleton-block" style={{ width: '42%', height: 11 }} />
                </div>
                <div
                  className="tx-page__skeleton-block"
                  style={{ width: 76, height: 16, flexShrink: 0 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </TransactionsPageShell>
  )
}
