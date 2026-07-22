import React from 'react'

export interface TableBulkBarProps {
  selectedCount: number
  actions: React.ReactNode
}

export const TableBulkBar: React.FC<TableBulkBarProps> = ({ selectedCount, actions }) => {
  if (selectedCount === 0) return null

  return (
    <div
      style={{
        background: 'var(--accent-faint)',
        border: '1px solid var(--accent-muted)',
        borderRadius: '10px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '8px',
        fontSize: '13px',
      }}
    >
      <strong style={{ color: 'var(--accent)' }}>{selectedCount} selected</strong>
      {actions}
    </div>
  )
}
