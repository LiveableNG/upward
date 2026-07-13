import React from 'react'

export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-header-row">
        <div>
          <div className="skeleton-base skeleton-text skeleton-text--title"></div>
          <div className="skeleton-base skeleton-text skeleton-text--short"></div>
        </div>
        <div className="skeleton-base skeleton-text" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
      </div>

      <div className="skeleton-base skeleton-block" style={{ height: '160px', borderRadius: '16px' }}></div>

      <div className="skeleton-grid-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card" style={{ height: '120px' }}>
            <div className="skeleton-base skeleton-text skeleton-text--short"></div>
            <div className="skeleton-base skeleton-text" style={{ width: '80%', height: '24px' }}></div>
          </div>
        ))}
      </div>

      <div className="skeleton-grid-2">
        <div className="skeleton-card" style={{ height: '400px' }}>
          <div className="skeleton-base skeleton-text skeleton-text--title"></div>
          <div className="skeleton-base skeleton-text skeleton-text--short" style={{ marginBottom: '24px' }}></div>
          
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-list-item">
              <div className="skeleton-base skeleton-avatar"></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-base skeleton-text" style={{ width: '40%' }}></div>
                <div className="skeleton-base skeleton-text" style={{ width: '70%' }}></div>
              </div>
              <div className="skeleton-base skeleton-text" style={{ width: '60px' }}></div>
            </div>
          ))}
        </div>
        <div className="skeleton-card" style={{ height: '400px' }}>
          <div className="skeleton-base skeleton-text skeleton-text--title"></div>
          
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-list-item">
              <div className="skeleton-base skeleton-avatar" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-base skeleton-text" style={{ width: '60%' }}></div>
                <div className="skeleton-base skeleton-text" style={{ width: '40%' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
