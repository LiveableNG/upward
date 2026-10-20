import React, { useState, useEffect } from 'react'
import {
  Search,
  RefreshCcw,
  Eye,
  Users,
  Activity,
  Globe,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'
import { DataTable, type ColumnDef } from '../../../components/common/table/DataTable'
import { UserSessionsModal } from './UserSessionsModal'

const AppleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.07.64-2.73 1.41-.57.65-1.07 1.71-1.02 2.76 1.05.08 2.13-.55 2.74-1.3z" />
  </svg>
)

const AndroidIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 13,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.73 4.29 5.56 5.96 5.51 7.9h12.98c-.05-1.94-1.22-3.61-2.96-4.74zM9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
  </svg>
)

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface UniqueUserItem {
  userId: number | null
  uuid?: string
  email: string
  name?: string
  userPathway?: string
  userRole?: string
  platforms: string[]
  devices: Array<{
    platform: string
    deviceModel: string
    osVersion?: string
    sessionCount: number
    lastSeenAt: string
  }>
  totalSessions: number
  firstSeenAt: string
  lastActiveAt: string
  lastDropOffStage?: string
  lastAction?: string
  hasError: boolean
}

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
  const [viewMode, setViewMode] = useState<'users' | 'sessions'>('users')
  const [users, setUsers] = useState<UniqueUserItem[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('ALL')
  const [dropOffStage, setDropOffStage] = useState(initialDropOffFilter || 'ALL')
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<{
    email: string
    name?: string
  } | null>(null)

  // Sync initialDropOffFilter when passed from Funnel clicks
  useEffect(() => {
    if (initialDropOffFilter) {
      setDropOffStage(initialDropOffFilter)
      setViewMode('sessions')
      setPage(1)
    }
  }, [initialDropOffFilter])

  const fetchData = async (pageNum = page) => {
    setLoading(true)
    try {
      if (viewMode === 'users') {
        let url = `/admin/app-activity/unique-users?page=${pageNum}&limit=20`
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
        if (platform !== 'ALL') url += `&platform=${platform}`

        const res = await apiService.get(url, token)
        if (res && res.data) {
          setUsers(res.data)
          if (res.meta) {
            setTotalPages(res.meta.totalPages || 1)
          }
        }
      } else {
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
      }
    } catch (err) {
      console.error('Failed to fetch activity data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(page)
  }, [page, viewMode, platform, dropOffStage, onlyErrors, token])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData(1)
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

  // ─────────────────────────────────────────────────────────────
  // Unique Users Columns
  // ─────────────────────────────────────────────────────────────
  const userColumns: ColumnDef<UniqueUserItem>[] = [
    {
      key: 'user',
      label: 'Tenant / Identity',
      width: '260px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                onOpenUserDrawer &&
                onOpenUserDrawer({ email: row.email, id: row.userId || undefined })
              }
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
              {row.email}
            </button>

            {row.userPathway && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor:
                    row.userPathway === 'INVITE'
                      ? 'rgba(139, 92, 246, 0.12)'
                      : row.userPathway === 'WAITLIST'
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(16, 185, 129, 0.12)',
                  color:
                    row.userPathway === 'INVITE'
                      ? '#8b5cf6'
                      : row.userPathway === 'WAITLIST'
                        ? '#d97706'
                        : '#059669',
                }}
              >
                {row.userPathway}
              </span>
            )}
          </div>

          {row.name && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'devices',
      label: 'Platforms & Devices',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {row.devices.map((d, idx) => {
            const p = (d.platform || '').toLowerCase()
            return (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: p.includes('ios')
                    ? 'rgba(15, 23, 42, 0.06)'
                    : p.includes('android')
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(59, 130, 246, 0.08)',
                  color: p.includes('ios')
                    ? 'var(--text)'
                    : p.includes('android')
                      ? '#059669'
                      : '#2563eb',
                }}
              >
                {p.includes('ios') ? (
                  <AppleIcon size={12} />
                ) : p.includes('android') ? (
                  <AndroidIcon size={12} color="#059669" />
                ) : (
                  <Globe size={12} />
                )}
                <strong>{d.deviceModel}</strong> ({d.sessionCount})
              </span>
            )
          })}
        </div>
      ),
    },
    {
      key: 'totalSessions',
      label: 'Sessions',
      width: '130px',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedUserForSessions({ email: row.email, name: row.name })}
          title="Click to view all sessions for this user"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 9px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <Activity size={13} color="var(--accent)" />
          {row.totalSessions} {row.totalSessions === 1 ? 'session' : 'sessions'}
        </button>
      ),
    },
    {
      key: 'activity',
      label: 'Activity Window',
      width: '180px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
            Last: {timeAgo(row.lastActiveAt)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            First seen{' '}
            {new Date(row.firstSeenAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (row) =>
        row.hasError ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
            }}
          >
            <AlertCircle size={12} /> Errors
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
            }}
          >
            <CheckCircle2 size={12} /> Active
          </span>
        ),
    },
    {
      key: 'actions',
      label: '',
      width: '130px',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedUserForSessions({ email: row.email, name: row.name })}
          className="btn btn-secondary"
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Eye size={13} />
          View History
        </button>
      ),
    },
  ]

  // ─────────────────────────────────────────────────────────────
  // Raw Chronological Sessions Columns
  // ─────────────────────────────────────────────────────────────
  const sessionColumns: ColumnDef<SessionItem>[] = [
    {
      key: 'user',
      label: 'User / Identity',
      width: '240px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {row.userEmail ? (
            <button
              type="button"
              onClick={() =>
                onOpenUserDrawer &&
                onOpenUserDrawer({ email: row.userEmail!, id: row.userId || undefined })
              }
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
      label: 'Platform & Device',
      width: '190px',
      render: (row) => {
        const p = (row.platform || '').toLowerCase()
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: p.includes('ios')
                    ? 'rgba(15, 23, 42, 0.06)'
                    : p.includes('android')
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(59, 130, 246, 0.08)',
                  color: p.includes('ios')
                    ? 'var(--text)'
                    : p.includes('android')
                      ? '#059669'
                      : '#2563eb',
                }}
              >
                {p.includes('ios') ? (
                  <AppleIcon size={11} />
                ) : p.includes('android') ? (
                  <AndroidIcon size={11} color="#059669" />
                ) : (
                  <Globe size={11} />
                )}
                {p.toUpperCase()}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                {row.deviceModel || 'Client'}
              </span>
            </div>
            {row.osVersion && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.osVersion}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'duration',
      label: 'Duration & Steps',
      width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>
            {formatDuration(row.durationSeconds)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {row.eventCount || 0} events logged
          </span>
        </div>
      ),
    },
    {
      key: 'exitScreen',
      label: 'Last Action / Drop-off',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
            {row.lastAction || row.exitScreen || '—'}
          </span>
          {row.dropOffStage && row.dropOffStage !== 'COMPLETED' && row.dropOffStage !== 'ACTIVE' ? (
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--danger)' }}>
              Dropped: {row.dropOffStage}
            </span>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>Normal</span>
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
            {new Date(row.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
            • {timeAgo(row.startedAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '110px',
      align: 'right',
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
            display: 'inline-flex',
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
      {/* Top Filter & View Mode Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* View Mode Toggle Pill */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-hover)',
              padding: '3px',
              borderRadius: '8px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewMode('users')
                setPage(1)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'users' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'users' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={14} />
              Unique Users (Grouped)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('sessions')
                setPage(1)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'sessions' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'sessions' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <Activity size={14} />
              Raw Timeline Sessions
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchData(page)}
            className="btn btn-secondary"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <RefreshCcw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search & Platform Filters */}
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}
        >
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
              placeholder={
                viewMode === 'users'
                  ? 'Search users by email or device...'
                  : 'Search by email, session ID, or device...'
              }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {(['ALL', 'ios', 'android', 'web'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPlatform(p)
                  setPage(1)
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: platform === p ? 'var(--text)' : 'var(--surface-hover)',
                  color: platform === p ? 'var(--white)' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {(search ||
            platform !== 'ALL' ||
            (viewMode === 'sessions' && (dropOffStage !== 'ALL' || onlyErrors))) && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Table */}
      {viewMode === 'users' ? (
        <DataTable<UniqueUserItem>
          data={users}
          columns={userColumns}
          keyExtractor={(item) => item.email}
          isLoading={loading}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(newPage) => setPage(newPage)}
          emptyTitle="No unique user records found"
          emptyDescription="Adjust your platform or search filter to see more users."
        />
      ) : (
        <DataTable<SessionItem>
          data={sessions}
          columns={sessionColumns}
          keyExtractor={(item) => item.sessionId}
          isLoading={loading}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(newPage) => setPage(newPage)}
          emptyTitle="No session records found"
          emptyDescription="Adjust your platform or search filter to see more sessions."
        />
      )}

      {/* User Sessions Drill-Down Modal */}
      {selectedUserForSessions && (
        <UserSessionsModal
          isOpen={Boolean(selectedUserForSessions)}
          userEmail={selectedUserForSessions.email}
          userName={selectedUserForSessions.name}
          token={token}
          onClose={() => setSelectedUserForSessions(null)}
          onInspectSession={onInspectSession}
        />
      )}
    </div>
  )
}
