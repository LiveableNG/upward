'use client'

import React from 'react'

export function PayRentSkeleton() {
  return (
    <div className="pay-rent-layout dashboard--nav-offset animate-pulse">
      <div className="pay-rent-container">
        <header className="dashboard__header" style={{ marginBottom: 20 }}>
          <div className="dashboard__header-left">
            <div className="skeleton-circle" style={{ width: 40, height: 40 }} />
            <div className="skeleton-text" style={{ width: 120, height: 24, marginLeft: 12 }} />
          </div>
        </header>

        <div className="step-select">
          <div className="skeleton-text" style={{ width: '100%', height: 100, borderRadius: 20, marginBottom: 24 }} />
          
          <div className="skeleton-text" style={{ width: 150, height: 14, marginBottom: 16 }} />
          
          {[1, 2, 3].map((i) => (
            <div key={i} className="recipient-item" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--surface2)', borderRadius: 16, opacity: 0.6 }}>
              <div className="skeleton-circle" style={{ width: 40, height: 40 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-text" style={{ width: '60%', height: 16 }} />
                <div className="skeleton-text" style={{ width: '40%', height: 12, marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
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
        .pay-rent-container {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 20px;
        }
        @media (min-width: 1024px) {
           .pay-rent-container {
              background: var(--bg);
              border-radius: 32px;
              border: 1px solid var(--border-solid);
              padding: 40px;
              margin-top: 40px;
           }
        }
      `}</style>
    </div>
  )
}
