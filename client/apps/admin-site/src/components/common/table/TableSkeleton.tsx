import React from 'react'

export interface TableSkeletonProps {
  columns: number
  rows?: number
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns, rows = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} style={{ borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '14px 16px' }}>
              <div
                className="animate-pulse"
                style={{
                  height: '16px',
                  backgroundColor: 'var(--surface-hover)',
                  borderRadius: '4px',
                  width: cIdx === 0 ? '70%' : '100%',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
