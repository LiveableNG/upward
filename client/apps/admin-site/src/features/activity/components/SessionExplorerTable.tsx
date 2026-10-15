import React, { useState, useEffect } from 'react'
import {
  Search,
  RefreshCcw,
  Eye,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'
import { DataTable, type ColumnDef } from '../../../components/common/table/DataTable'

interface SessionItem {
  id: number
  sessionId: string
  anonymousId?: string
  userId?: number | null
  userEmail?: string | null
  userRole?: string | null
  app: string
  platform: 'ios' | 'android' | 'web'
  clientType?: string
  deviceModel?: string
  osVersion?: string
  ipAddress?: string
  city?: string
  countryCode?: string
  entryScreen?: string
  exitScreen?: string
  lastAction?: string
  dropOffStage?: string
  durationSeconds?: number
  hasError?: boolean
  eventCount?: number
  startedAt: string
  endedAt?: string
  lastActivityAt: string
}

interface SessionExplorerTableProps {
  token?: string
  onInspectSession: (sessionId: string) => void
  initialDropOffFilter?: string
  onOpenUserDrawer?: (user: { email: string; id?: number }) => void
}

export const SessionExplorerTable: React.FC<SessionExplorerTableProps> = ({
  token,
  onInspectSession,
  initialDropOffFilter,
  onOpenUserDrawer,
}) => {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('ALL')
  const [dropOffStage, setDropOffStage] = useState(initialDropOffFilter || 'ALL')
  const [onlyErrors, setOnlyErrors] = useState(false)

  // Sync initialDropOffFilter when passed from Funnel clicks
  useEffect(() => {
    if (initialDropOffFilter) {
      setDropOffStage(initialDropOffFilter)
      setPage(1)
    }
  }, [initialDropOffFilter])

  const fetchSessions = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/app-activity/sessions?page=${pageNum}&limit=30`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      if (platform !== 'ALL') url += `&platform=${platform}`
      if (dropOffStage !== 'ALL') url += `&dropOffStage=${encodeURIComponent(dropOffStage)}`
      if (onlyErrors) url += `&hasError=true`

      const res = await apiService.get(url, token)
      if (res && res.data) {
        setSessions(res.data)
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1)
        }
      }
    } catch (err) {
      console.error('Failed to fetch user sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions(page)
  }, [page, platform, dropOffStage, onlyErrors, token])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSessions(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setPlatform('ALL')
    setDropOffStage('ALL')
    setOnlyErrors(false)
    setPage(1)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const columns: ColumnDef<SessionItem>[] = [
    {
      key: 'user',
      label: 'User / Identity',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {row.userEmail ? (
            <button
              type="button"
              onClick={() => onOpenUserDrawer && onOpenUserDrawer({ email: row.userEmail!, id: row.userId || undefined })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                textDecoration: 'underline',
              }}
            >
              {row.userEmail}
            </button>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Guest ({row.anonymousId ? row.anonymousId.slice(0, 10) + '...' : 'Anonymous'})
            </span>
          )}
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {row.sessionId}
          </span>
        </div>
      ),
    },
    {
      key: 'platform',
      label: 'Device & Platform',
      width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: '4px',
                background:
                  row.platform === 'ios'
                    ? 'rgba(0, 0, 0, 0.08)'
                    : row.platform === 'android'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(59, 130, 246, 0.12)',
                color:
                  row.platform === 'ios'
                    ? 'var(--text)'
                    : row.platform === 'android'
                    ? '#16a34a'
                    : '#2563eb',
              }}
            >
              {row.platform}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {row.clientType === 'native_app' ? 'Native App' : 'Browser'}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {row.deviceModel || row.osVersion || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location & IP',
      width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
            {row.city ? `${row.city}, ` : ''}{row.countryCode || '—'}
          </span>
          {row.ipAddress && (
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              {row.ipAddress}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      label: 'Duration / Steps',
      width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>
            {formatDuration(row.durationSeconds)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {row.eventCount || 0} events tracked
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Drop-off / Outcome',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {row.hasError && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
              }}
            >
              Error Encountered
            </span>
          )}

          {row.dropOffStage ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#b45309',
              }}
            >
              Dropped: {row.dropOffStage}
            </span>
          ) : (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
              }}
            >
              Normal Exit
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'startedAt',
      label: 'Session Time',
      width: '150px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            {new Date(row.startedAt).toLocaleDateString()}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(row.startedAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Playback',
      width: '110px',
      render: (row) => (
        <button
          type="button"
          onClick={() => onInspectSession(row.sessionId)}
          className="btn btn-secondary"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Inspect Complete Event Journey"
        >
          <Eye size={13} />
          Journey
        </button>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search and Filters */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={15}
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
              placeholder="Search by user email, session ID, or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Platform Filter */}
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Platforms</option>
            <option value="ios">iOS (Apple)</option>
            <option value="android">Android</option>
            <option value="web">Web Browser</option>
          </select>

          {/* Drop-off Stage Filter */}
          <select
            value={dropOffStage}
            onChange={(e) => {
              setDropOffStage(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="DEPOSIT_CANCELLED">Deposit Cancelled</option>
            <option value="PAYSTACK_CANCELLED">Paystack Closed Unpaid</option>
            <option value="PAYSTACK_ERROR">Paystack Error</option>
            <option value="DEPOSIT_ERROR">Deposit Error</option>
            <option value="CHECKOUT_MODAL">Checkout Modal Abandon</option>
          </select>

          {/* Error Only Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyErrors}
              onChange={(e) => {
                setOnlyErrors(e.target.checked)
                setPage(1)
              }}
            />
            Has Error
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}
          >
            Search
          </button>

          {(search || platform !== 'ALL' || dropOffStage !== 'ALL' || onlyErrors) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ padding: '9px 14px', borderRadius: '10px', fontSize: '13px' }}
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchSessions(page)}
            className="btn btn-secondary"
            disabled={loading}
            style={{ padding: '9px 12px', borderRadius: '10px' }}
            title="Refresh sessions list"
          >
            <RefreshCcw size={14} className={loading ? 'spin' : ''} />
          </button>
        </form>
      </div>

      {/* Sessions Data Table */}
      <DataTable<SessionItem>
        data={sessions}
        columns={columns}
        keyExtractor={(item) => item.sessionId || String(item.id)}
        isLoading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(newPage: number) => setPage(newPage)}
        emptyTitle="No user sessions found"
        emptyDescription="Try adjusting your platform, drop-off, or search filters."
      />
    </div>
  )
}
