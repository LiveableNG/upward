import React from 'react'
import { Search } from 'lucide-react'

export interface FilterBarProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (val: string) => void
  actions?: React.ReactNode
  filters?: React.ReactNode
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  actions,
  filters,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}
      >
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: '38px',
              width: '100%',
              background: 'var(--white)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          />
        </div>
        {filters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{filters}</div>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{actions}</div>
      )}
    </div>
  )
}
