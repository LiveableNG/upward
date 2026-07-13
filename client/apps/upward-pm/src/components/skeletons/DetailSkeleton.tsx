import React from 'react'

export function DetailSkeleton() {
  return (
    <div className="skeleton-detail-layout">
      <div className="skeleton-header-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="skeleton-base skeleton-avatar" style={{ width: '48px', height: '48px', borderRadius: '8px' }}></div>
          <div>
            <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '250px', marginBottom: '8px' }}></div>
            <div className="skeleton-base skeleton-text skeleton-text--short" style={{ width: '150px' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="skeleton-base skeleton-text" style={{ width: '100px', height: '36px', borderRadius: '8px', margin: 0 }}></div>
          <div className="skeleton-base skeleton-text" style={{ width: '100px', height: '36px', borderRadius: '8px', margin: 0 }}></div>
        </div>
      </div>

      <div className="skeleton-grid-2" style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="skeleton-card">
            <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '120px' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <div className="skeleton-base skeleton-text" style={{ width: '40%', height: '12px', marginBottom: '8px' }}></div>
                  <div className="skeleton-base skeleton-text" style={{ width: '70%' }}></div>
                </div>
              ))}
            </div>
          </div>
          <div className="skeleton-card" style={{ height: '300px' }}>
             <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '150px' }}></div>
             <div className="skeleton-base skeleton-text" style={{ width: '100%', height: '40px', marginTop: '16px' }}></div>
             <div className="skeleton-base skeleton-text" style={{ width: '100%', height: '40px', marginTop: '8px' }}></div>
             <div className="skeleton-base skeleton-text" style={{ width: '100%', height: '40px', marginTop: '8px' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="skeleton-card">
            <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '120px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="skeleton-base skeleton-text" style={{ width: '100%', height: '48px', borderRadius: '8px' }}></div>
              <div className="skeleton-base skeleton-text" style={{ width: '100%', height: '48px', borderRadius: '8px' }}></div>
            </div>
          </div>
          <div className="skeleton-card" style={{ height: '200px' }}>
            <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '100px' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
