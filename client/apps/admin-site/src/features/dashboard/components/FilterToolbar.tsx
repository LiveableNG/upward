import React from 'react'
import {
  Search,
  Download,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react'

export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom'
export type StatusFilter = 'all' | 'verified' | 'unverified' | 'paid' | 'unpaid' | 'pending' | 'converted'

interface FilterToolbarProps {
  search: string
  onSearchChange: (v: string) => void

  dateFilter?: DateFilter
  onDateFilterChange?: (v: DateFilter) => void

  statusFilter?: StatusFilter
  onStatusFilterChange?: (v: StatusFilter) => void
  showStatusFilter?: boolean

  onExport?: () => void
  onRefresh?: () => void

  /** count of currently displayed records */
  resultCount?: number

  /** current tab label */
  tabLabel?: string

  isSticky?: boolean
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'converted', label: 'Converted' },
  { value: 'pending', label: 'Pending' },
]

const FilterToolbar: React.FC<FilterToolbarProps> = ({
  search,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusFilter = 'all',
  onStatusFilterChange,
  showStatusFilter = false,
  onExport,
  onRefresh,
  resultCount,
  tabLabel,
  isSticky = true,
}) => {
  return (
    <div
      style={{
        background: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(12px)',
        padding: '12px 0',
        position: isSticky ? 'sticky' : 'relative',
        top: isSticky ? 0 : undefined,
        zIndex: isSticky ? 10 : undefined,
        marginBottom: '4px',
      }}
    >
      {/* Row 1: Search + Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '13px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search${tabLabel ? ` ${tabLabel}` : ''}...`}
            className="input"
            style={{ paddingLeft: '38px', paddingRight: search ? '36px' : '14px', height: '38px', fontSize: '13px' }}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date Filter Chips */}
        {dateFilter && onDateFilterChange && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onDateFilterChange(opt.value)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: dateFilter === opt.value ? 'var(--accent)' : 'var(--border)',
                  background: dateFilter === opt.value ? 'var(--accent)' : 'var(--white)',
                  color: dateFilter === opt.value ? '#fff' : 'var(--text-secondary)',
                  transition: 'var(--transition)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Status Filter */}
        {showStatusFilter && onStatusFilterChange && (
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            className="input"
            style={{ height: '38px', width: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: 600 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
          {onRefresh && (
            <button onClick={onRefresh} className="btn btn-secondary" style={{ height: '38px', padding: '0 12px', gap: '6px' }}>
              <RefreshCw size={14} />
              <span className="desktop-only">Refresh</span>
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="btn btn-secondary" style={{ height: '38px', padding: '0 14px', gap: '6px' }}>
              <Download size={14} />
              <span className="desktop-only">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      {resultCount !== undefined && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Showing <strong>{resultCount.toLocaleString()}</strong> {tabLabel ?? 'records'}
          {search && <span> matching "<em>{search}</em>"</span>}
        </div>
      )}
    </div>
  )
}

export default FilterToolbar
