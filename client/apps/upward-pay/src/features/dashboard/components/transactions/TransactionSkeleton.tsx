'use client'

import { TransactionsPageShell } from './TransactionsPageShell'

export function TransactionSkeleton() {
  const noop = () => {}

  return (
    <TransactionsPageShell title="Transactions" onBack={noop}>
      <div className="tx-page--skeleton">
        <div className="tx-page__search">
          <div className="tx-page__skeleton-block" style={{ width: '100%', height: 48, borderRadius: 12 }} />
        </div>

        <div className="tx-page__stats">
          <div className="tx-page__stat">
            <div className="tx-page__skeleton-block" style={{ width: '55%', height: 11 }} />
            <div
              className="tx-page__skeleton-block"
              style={{ width: '75%', height: 22, marginTop: 10 }}
            />
          </div>
          <div className="tx-page__stat">
            <div className="tx-page__skeleton-block" style={{ width: '55%', height: 11 }} />
            <div
              className="tx-page__skeleton-block"
              style={{ width: '60%', height: 22, marginTop: 10 }}
            />
          </div>
        </div>

        <div className="tx-page__month-group">
          <div
            className="tx-page__skeleton-block"
            style={{ width: 100, height: 12, marginBottom: 10 }}
          />
          <div className="dash-home__activity-card">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dash-home__activity-item" style={{ pointerEvents: 'none' }}>
                <div
                  className="tx-page__skeleton-block"
                  style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}
                />
                <div className="dash-home__activity-item-info" style={{ flex: 1 }}>
                  <div
                    className="tx-page__skeleton-block"
                    style={{ width: '62%', height: 14, marginBottom: 6 }}
                  />
                  <div className="tx-page__skeleton-block" style={{ width: '45%', height: 11 }} />
                </div>
                <div
                  className="tx-page__skeleton-block"
                  style={{ width: 72, height: 16, flexShrink: 0 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </TransactionsPageShell>
  )
}
