'use client'

import React from 'react'

export function TransactionSkeleton() {
  return (
    <div className="transactions-list-page dashboard--nav-offset animate-pulse">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <div className="skeleton-circle" style={{ width: 40, height: 40 }} />
          <div className="skeleton-text" style={{ width: 120, height: 24 }} />
        </div>
        <div className="dashboard__header-right">
          <div className="skeleton-text" style={{ width: 80, height: 34, borderRadius: 100 }} />
        </div>
      </header>

      <div className="transaction-search">
        <div className="skeleton-text" style={{ width: '100%', height: 48, borderRadius: 12 }} />
      </div>

      <div className="dashboard__transactions-list">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="dashboard__transaction-group">
            <div className="skeleton-text" style={{ width: 100, height: 14, marginBottom: 12 }} />
            <div className="dashboard__transaction-items">
              {[1, 2].map((j) => (
                <div key={j} className="transaction-item" style={{ marginBottom: 12, opacity: 0.6 }}>
                  <div className="transaction-item__icon-wrap" style={{ background: 'var(--surface2)' }} />
                  <div className="transaction-item__info">
                    <div className="skeleton-text" style={{ width: '60%', height: 16 }} />
                    <div className="skeleton-text" style={{ width: '40%', height: 12, marginTop: 4 }} />
                  </div>
                  <div className="transaction-item__right">
                    <div className="skeleton-text" style={{ width: 80, height: 18 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .skeleton-text {
          background: var(--surface2);
          border-radius: 4px;
        }
        .skeleton-circle {
          background: var(--surface2);
          border-radius: 50%;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }

        /* Essential Layout Parity with TransactionList */
        @media (min-width: 1024px) {
          .transactions-list-page {
            max-width: 800px;
            margin: 20px auto;
            background: var(--bg);
            border-radius: 24px;
            border: 1px solid var(--border-solid);
            box-shadow: var(--shadow-md);
            padding: 32px 40px;
          }

          .dashboard__header {
            border-bottom: none;
            padding: 0;
            margin-bottom: 24px;
          }

          .transaction-item {
            padding: 20px 24px;
            border-radius: 16px;
            background: var(--surface);
            border: 1px solid var(--border-solid);
          }
        }
      `}</style>
    </div>
  )
}
