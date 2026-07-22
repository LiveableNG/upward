import React from 'react'

export interface TableEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  colSpan: number
}

export const TableEmptyState: React.FC<TableEmptyStateProps> = ({
  icon,
  title,
  description,
  colSpan,
}) => {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text-muted)',
          }}
        >
          {icon && <div style={{ opacity: 0.3 }}>{icon}</div>}
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)' }}>
            {title}
          </span>
          {description && <span style={{ fontSize: '13px' }}>{description}</span>}
        </div>
      </td>
    </tr>
  )
}
