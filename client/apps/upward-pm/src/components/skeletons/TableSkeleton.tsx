'use client'

import React from 'react'
import { DataTable } from '../common/DataTable'

export function TableSkeleton({ columns = 5 }: { columns?: number }) {
  const dummyColumns = Array.from({ length: columns }).map(() => ({
    header: '',
    render: () => null
  }))

  return (
    <div style={{ padding: '24px' }}>
      <div className="skeleton-header-row">
        <div>
          <div className="skeleton-base skeleton-text skeleton-text--title" style={{ width: '200px' }}></div>
          <div className="skeleton-base skeleton-text skeleton-text--short" style={{ width: '300px' }}></div>
        </div>
        <div className="skeleton-base skeleton-text" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
      </div>

      <div className="skeleton-table" style={{ background: 'transparent', padding: 0 }}>
        <div className="skeleton-table-controls" style={{ marginBottom: '24px' }}>
          <div className="skeleton-base skeleton-text" style={{ width: '240px', height: '32px', margin: 0 }}></div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton-base skeleton-text" style={{ width: '100px', height: '32px', margin: 0 }}></div>
            <div className="skeleton-base skeleton-text" style={{ width: '100px', height: '32px', margin: 0 }}></div>
          </div>
        </div>
        
        <DataTable columns={dummyColumns as any} data={[]} isLoading={true} />
      </div>
    </div>
  )
}
