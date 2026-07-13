import React from 'react'

export function TableSkeleton() {
  return (
    <div style={{ padding: '24px' }}>
      <div className="skeleton-header-row">
        <div>
          <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '200px' }}></div>
          <div className="skeleton-base skeleton-text skeleton-text--short" style={{ width: '300px' }}></div>
        </div>
        <div className="skeleton-base skeleton-text" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
      </div>

      <div className="skeleton-table">
        <div className="skeleton-table-controls">
          <div className="skeleton-base skeleton-text" style={{ width: '240px', height: '32px', margin: 0 }}></div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton-base skeleton-text" style={{ width: '100px', height: '32px', margin: 0 }}></div>
            <div className="skeleton-base skeleton-text" style={{ width: '100px', height: '32px', margin: 0 }}></div>
          </div>
        </div>
        
        <div className="skeleton-table-row" style={{ background: 'var(--ivory-dim)', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton-base skeleton-text" style={{ height: '12px', margin: 0 }}></div>
          <div className="skeleton-base skeleton-text" style={{ height: '12px', margin: 0 }}></div>
          <div className="skeleton-base skeleton-text" style={{ height: '12px', margin: 0 }}></div>
          <div className="skeleton-base skeleton-text" style={{ height: '12px', margin: 0 }}></div>
        </div>

        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="skeleton-table-row">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="skeleton-base skeleton-avatar" style={{ width: '32px', height: '32px' }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-base skeleton-text" style={{ width: '60%', margin: '0 0 4px 0' }}></div>
                <div className="skeleton-base skeleton-text" style={{ width: '40%', height: '12px', margin: 0 }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="skeleton-base skeleton-text" style={{ width: '70%', margin: '0 0 4px 0' }}></div>
              <div className="skeleton-base skeleton-text" style={{ width: '50%', height: '12px', margin: 0 }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="skeleton-base skeleton-text" style={{ width: '60px', borderRadius: '12px', margin: 0 }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="skeleton-base skeleton-text" style={{ width: '80%', margin: 0 }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
