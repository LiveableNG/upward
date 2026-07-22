import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type SortDir = 'asc' | 'desc'

export interface SortHeaderProps {
  label: string | React.ReactNode
  sortKey: string
  currentSortKey?: string
  currentSortDir?: SortDir
  onSort?: (key: string) => void
  align?: 'left' | 'center' | 'right'
  width?: string
}

const thStyle: React.CSSProperties = {
  padding: '13px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}

export const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  align = 'left',
  width,
}) => {
  const isSortable = !!onSort
  const isActive = currentSortKey === sortKey

  return (
    <th
      style={{
        ...thStyle,
        textAlign: align,
        width: width,
        cursor: isSortable ? 'pointer' : 'default',
      }}
      onClick={() => isSortable && onSort(sortKey)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          gap: '4px',
        }}
      >
        {label}
        {isSortable &&
          (isActive ? (
            currentSortDir === 'asc' ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )
          ) : (
            <ChevronDown size={12} style={{ opacity: 0.25 }} />
          ))}
      </div>
    </th>
  )
}
