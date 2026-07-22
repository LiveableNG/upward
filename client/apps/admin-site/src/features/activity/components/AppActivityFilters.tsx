import React from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'

interface AppActivityFiltersProps {
  search: string
  setSearch: (val: string) => void
  appFilter: string
  setAppFilter: (val: string) => void
  actionFilter: string
  setActionFilter: (val: string) => void
  platformFilter: string
  setPlatformFilter: (val: string) => void
  dateFilter: string
  setDateFilter: (val: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  setPage: (val: number) => void
}

export const AppActivityFilters: React.FC<AppActivityFiltersProps> = ({
  search,
  setSearch,
  appFilter,
  setAppFilter,
  actionFilter,
  setActionFilter,
  platformFilter,
  setPlatformFilter,
  dateFilter,
  setDateFilter,
  onSearchSubmit,
  setPage,
}) => {
  return (
    <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
      <form
        onSubmit={onSearchSubmit}
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search by email, entity, or description (Press Enter)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 42px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '14px',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '0 1 auto',
          }}
        >
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '11px 12px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '14px',
              height: '42px',
            }}
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('')
                setPage(1)
              }}
              className="btn btn-secondary"
              style={{ height: '42px', padding: '0 12px', fontSize: '13px' }}
            >
              Clear Date
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: '0 1 auto',
            minWidth: '150px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Filter
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <select
              value={appFilter}
              onChange={(e) => {
                setAppFilter(e.target.value)
                setPage(1)
              }}
              style={{
                width: '100%',
                padding: '11px 32px 11px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Apps</option>
              <option value="upward-pay">upward-pay (Tenant)</option>
              <option value="upward-pm">upward-pm (Manager)</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: '0 1 auto',
            minWidth: '150px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Filter
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value)
                setPage(1)
              }}
              style={{
                width: '100%',
                padding: '11px 32px 11px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Platforms</option>
              <option value="web">Web Browser</option>
              <option value="mobile">Mobile App</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: '0 1 auto',
            minWidth: '150px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Filter
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              style={{
                width: '100%',
                padding: '11px 32px 11px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="SIGNUP">SIGNUP</option>
              <option value="APP_INSTALL">APP_INSTALL</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
