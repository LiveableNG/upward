import React from 'react'

export function ListSkeleton() {
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="skeleton-header-row">
        <div>
          <div className="skeleton-base skeleton-text skeleton-text--title"></div>
          <div className="skeleton-base skeleton-text skeleton-text--short"></div>
        </div>
      </div>

      <div className="skeleton-card" style={{ marginTop: '24px' }}>
        {[1, 2, 3, 4, 5].map((i, idx) => (
          <div key={i} className="skeleton-list-item" style={{ borderBottom: idx === 4 ? 'none' : '1px solid var(--border)' }}>
            <div className="skeleton-base skeleton-avatar"></div>
            <div style={{ flex: 1 }}>
              <div className="skeleton-base skeleton-text" style={{ width: '40%' }}></div>
              <div className="skeleton-base skeleton-text" style={{ width: '60%', height: '12px' }}></div>
            </div>
            <div className="skeleton-base skeleton-text" style={{ width: '80px', margin: 0 }}></div>
          </div>
        ))}
      </div>
    </div>
  )
}
