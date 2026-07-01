import React from 'react'
import { Search, Trash2, Download } from 'lucide-react'

interface FilterToolbarProps {
  activeTab: 'waitlist' | 'signedUp' | 'invited' | 'pms' | 'revenue'
  search: string
  setSearch: (s: string) => void
  dateRange: 'all' | 'today' | '7days' | '30days' | 'custom'
  setDateRange: (r: 'all' | 'today' | '7days' | '30days' | 'custom') => void
  startDate: string
  setStartDate: (s: string) => void
  endDate: string
  setEndDate: (e: string) => void
  selectedWaitlistIds: Set<string>
  triggerBulkDelete: () => void
  handleExportExcel: () => void
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  activeTab,
  search,
  setSearch,
  dateRange,
  setDateRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedWaitlistIds,
  triggerBulkDelete,
  handleExportExcel,
}) => {
  return (
    <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={`Search inside ${activeTab} directory...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '38px', height: '40px' }}
            />
          </div>

          {/* Date Preset Selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} className="date-chips">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'today', label: 'Today' },
                { key: '7days', label: '7 Days' },
                { key: '30days', label: '30 Days' },
                { key: 'custom', label: 'Custom' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                className={`date-chip${dateRange === key ? ' active' : ''}`}
                onClick={() => setDateRange(key)}
                style={{ height: '34px' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom Dates Inputs */}
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                style={{ height: '36px', width: '130px', padding: '0 8px' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
                style={{ height: '36px', width: '130px', padding: '0 8px' }}
              />
            </div>
          )}

        </div>

        {/* Action Tools */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'waitlist' && selectedWaitlistIds.size > 0 && (
            <button
              onClick={triggerBulkDelete}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', height: '40px' }}
            >
              <Trash2 size={16} /> Delete Selected ({selectedWaitlistIds.size})
            </button>
          )}
          
          <button
            onClick={handleExportExcel}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
          >
            <Download size={16} /> Export Active Table
          </button>
        </div>

      </div>
    </div>
  )
}
