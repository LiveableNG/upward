import React, { useState, useEffect, useMemo } from 'react'
import {
  Smartphone,
  RefreshCcw,
  Activity,
  Eye,
  CreditCard,
  UserPlus,
  LogIn,
  LogOut,
  Trash2,
  PlusCircle,
  Settings,
  Search,
  X,
  Globe,
  TrendingUp,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import PreviewDrawer, { type DrawerEntity } from '../features/dashboard/components/PreviewDrawer'
import { AppActivityLogViewerModal } from '../features/activity/components/AppActivityLogViewerModal'
import { DataTable, type ColumnDef } from '../components/common/table/DataTable'


const AppleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.07.64-2.73 1.41-.57.65-1.07 1.71-1.02 2.76 1.05.08 2.13-.55 2.74-1.3z" />
  </svg>
)

const AndroidIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.73 4.29 5.56 5.96 5.51 7.9h12.98c-.05-1.94-1.22-3.61-2.96-4.74zM9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
  </svg>
)

interface AppActivityLog {
  id: number
  uuid: string
  app: string
  userId: number | null
  pmId: number | null
  userRole: string | null
  userEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  description: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  platform?: 'ios' | 'android' | 'web'
  deviceSummary?: string
  user?: any
  pm?: any
  userPathway?: string | null
  readableText?: string
}

interface ActivityStats {
  totalInstalls: number
  totalSignups: number
  totalLogins: number
  platforms: { ios: number; android: number; web: number; other: number }
  signupsByPlatform: { ios: number; android: number; web: number }
  loginsByPlatform: { ios: number; android: number; web: number }
  activeUsersByApp: Array<{ app: string; _count: number }>
  recentActivityCount: number
  todayStats: {
    uniqueUsersIosCount: number
    uniqueUsersAndroidCount: number
    uniqueUsersWebCount: number
    uniqueUsersMobileCount: number
    uniqueUsersTotalCount: number
  }
  dailyTrends: Array<{
    date: string
    ios: number
    android: number
    web: number
    installs: number
    signups: number
    logins: number
    total: number
  }>
  cumulativeTrends: Array<{
    date: string
    ios: number
    android: number
    web: number
    total: number
    installs: number
    signups: number
  }>
}

function getActivityBadge(action: string, entityType?: string | null) {
  let bg = 'rgba(100, 116, 139, 0.1)'
  let color = 'var(--text-muted)'
  let icon = <Activity size={12} />

  if (action === 'SIGNUP') {
    bg = 'rgba(139, 92, 246, 0.12)'
    color = '#8b5cf6'
    icon = <UserPlus size={12} />
  } else if (action === 'LOGIN') {
    bg = 'rgba(16, 185, 129, 0.12)'
    color = '#10b981'
    icon = <LogIn size={12} />
  } else if (action === 'LOGOUT') {
    bg = 'rgba(100, 116, 139, 0.12)'
    color = 'var(--text-muted)'
    icon = <LogOut size={12} />
  } else if (action === 'APP_INSTALL') {
    bg = 'rgba(217, 119, 87, 0.14)'
    color = 'var(--accent)'
    icon = <Smartphone size={12} />
  } else if (entityType === 'PAYMENT' || entityType === 'RENT') {
    bg = 'rgba(16, 185, 129, 0.12)'
    color = '#10b981'
    icon = <CreditCard size={12} />
  } else if (entityType === 'UNIT' || action === 'CREATE') {
    bg = 'rgba(59, 130, 246, 0.12)'
    color = '#3b82f6'
    icon = <PlusCircle size={12} />
  } else if (action === 'DELETE') {
    bg = 'rgba(239, 68, 68, 0.12)'
    color = 'var(--danger)'
    icon = <Trash2 size={12} />
  } else if (action === 'UPDATE') {
    bg = 'rgba(245, 158, 11, 0.12)'
    color = 'var(--warning)'
    icon = <Settings size={12} />
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: bg,
        color,
        letterSpacing: '0.02em',
      }}
    >
      {icon}
      {action}
    </span>
  )
}

function getPlatformBadge(platform?: string) {
  const p = (platform || '').toLowerCase()

  if (p.includes('ios') || p.includes('apple')) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(15, 23, 42, 0.08)',
          color: 'var(--text)',
        }}
      >
        <AppleIcon size={13} color="var(--text)" /> iOS
      </span>
    )
  }

  if (p.includes('android')) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
        }}
      >
        <AndroidIcon size={13} color="#059669" /> Android
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        background: 'rgba(59, 130, 246, 0.08)',
        color: '#2563eb',
      }}
    >
      <Globe size={13} /> Web
    </span>
  )
}

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

interface AppActivityProps {
  token: string
}

export const AppActivity: React.FC<AppActivityProps> = ({ token }) => {
  const [logs, setLogs] = useState<AppActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [appFilter, setAppFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [platformFilter, setPlatformFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')

  // Chart configuration
  const [chartView, setChartView] = useState<'cumulative' | 'daily'>('cumulative')
  const [chartMetric, setChartMetric] = useState<'all' | 'installs' | 'signups' | 'logins'>('all')

  // Modals & Drawers
  const [selectedLog, setSelectedLog] = useState<AppActivityLog | null>(null)
  const [drawerEntity, setDrawerEntity] = useState<DrawerEntity | null>(null)

  const openDrawerForUser = (item: any) => {
    setDrawerEntity({
      kind: 'user',
      uuid: item.uuid,
      name: item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : item.name || 'Tenant Profile',
      email: item.email,
      phone: item.phone || '',
      status: item.totalPaid > 0 ? 'TENANT' : 'PENDING_TENANT',
      type: item.totalPaid > 0 ? 'TENANT' : 'PENDING_TENANT',
      invitedAt: item.invitedAt || item.rawRecord?.invitedAt || null,
      joinedAt: item.joinedAt !== undefined ? item.joinedAt : item.rawRecord?.joinedAt || null,
      createdAt: item.createdAt || item.rawRecord?.createdAt,
      totalPaid: item.totalPaid || 0,
    })
  }

  const openDrawerForPm = (pm: any) => {
    setDrawerEntity({
      kind: 'pm',
      uuid: pm.uuid,
      name: pm.businessName || 'Property Manager',
      email: pm.email,
      phone: pm.phone || '',
      status: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      type: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      joinedAt: pm.createdAt,
      totalPaid: pm.totalGenerated || 0,
      propertyCount: pm.propertiesCount || 0,
    })
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const res = await apiService.get('/admin/app-activity/stats', token)
      if (res) {
        setStats(res)
      }
    } catch (err) {
      console.error('Failed to fetch app activity stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchLogs = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/app-activity?page=${pageNum}&limit=50`
      if (appFilter !== 'ALL') url += `&app=${appFilter}`
      if (actionFilter !== 'ALL') url += `&action=${actionFilter}`
      if (platformFilter !== 'ALL') url += `&platform=${platformFilter}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      if (dateFilter) url += `&date=${dateFilter}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setLogs(response.data)
        setTotalPages(response.meta.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch app activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [token])

  useEffect(() => {
    fetchLogs(page)
  }, [page, appFilter, actionFilter, platformFilter, dateFilter])

  const handleRefresh = () => {
    fetchStats()
    fetchLogs(1)
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setAppFilter('ALL')
    setActionFilter('ALL')
    setPlatformFilter('ALL')
    setDateFilter('')
    setPage(1)
  }

  // ─────────────────────────────────────────────────────────────
  // SVG Chart Calculation
  // ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!stats) return null
    const sourceData = chartView === 'cumulative' ? stats.cumulativeTrends : stats.dailyTrends
    if (!sourceData || sourceData.length === 0) return null

    const width = 800
    const height = 180
    const pad = 24

    const values = sourceData.map((d: any) => {
      if (chartMetric === 'installs') return d.installs
      if (chartMetric === 'signups') return d.signups
      if (chartMetric === 'logins') return d.logins || 0
      return d.total
    })

    const maxVal = Math.max(...values, 10)
    const points = sourceData.map((d: any, idx: number) => {
      const x = pad + (idx / (sourceData.length - 1)) * (width - pad * 2)
      let val = d.total
      if (chartMetric === 'installs') val = d.installs
      else if (chartMetric === 'signups') val = d.signups
      else if (chartMetric === 'logins') val = d.logins || 0
      const y = height - pad - (val / maxVal) * (height - pad * 2)
      return { x, y, val, date: d.date, ios: d.ios, android: d.android, web: d.web }
    })

    const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ')
    const polygonStr = `${points[0].x},${height - pad} ${polylineStr} ${points[points.length - 1].x},${height - pad}`

    return {
      points,
      polylineStr,
      polygonStr,
      maxVal,
      width,
      height,
      pad,
      startLabel: sourceData[0]?.date,
      endLabel: sourceData[sourceData.length - 1]?.date,
    }
  }, [stats, chartView, chartMetric])

  // ─────────────────────────────────────────────────────────────
  // Table Columns
  // ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<AppActivityLog>[] = [
    {
      key: 'action',
      label: 'Event & Action',
      width: '190px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>{getActivityBadge(row.action, row.entityType)}</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.3 }}>
            {row.app}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User / Actor',
      width: '260px',
      render: (row) => {
        const u = row.user
        const pm = row.pm
        const email = u?.email || pm?.email || row.userEmail
        const name = u
          ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
          : pm?.businessName || (pm ? `${pm.firstName || ''} ${pm.lastName || ''}`.trim() : '')

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {email ? (
                <button
                  type="button"
                  onClick={() => (pm ? openDrawerForPm(pm) : openDrawerForUser(u || { email, uuid: row.entityId }))}
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
                  {email}
                </button>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Guest / New Install
                </span>
              )}

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

            {name && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {name} ({row.userRole || 'TENANT'})
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'description',
      label: 'Activity Details',
      render: (row) => (
        <div style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--text)' }}>
          {row.readableText || row.description}
        </div>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      width: '120px',
      render: (row) => getPlatformBadge(row.platform || row.metadata?.clientPlatform || row.metadata?.platform),
    },
    {
      key: 'device',
      label: 'Device & IP',
      width: '180px',
      render: (row) => {
        const dev = row.deviceSummary || row.metadata?.device || 'Unknown Device'
        const ip = row.ipAddress

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
              {dev}
            </span>
            {ip && (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {ip}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {timeAgo(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedLog(row)}
          title="Inspect Full Session Metadata"
          style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Eye size={15} />
        </button>
      ),
    },
  ]

  return (
    <div className="page-container fade-in">
      {/* ────────────────────────────────────────────────────────── */}
      {/* Page Header */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
              App Telemetry & Activity
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '3px 0 0 0' }}>
              Monitor mobile app installs, signups by OS, active sessions, and live platform operations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={loading || loadingStats}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <RefreshCcw size={15} className={loading || loadingStats ? 'spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Key Metric Overview Cards */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: App Installs */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              App Installs
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(217, 119, 87, 0.1)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Smartphone size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {stats ? (stats.platforms?.ios || 0) + (stats.platforms?.android || 0) : '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total mobile installations tracked
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(15, 23, 42, 0.06)',
                color: 'var(--text)',
              }}
            >
              <AppleIcon size={12} /> {stats?.platforms?.ios || 0} iOS
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
              }}
            >
              <AndroidIcon size={12} /> {stats?.platforms?.android || 0} Android
            </span>
          </div>
        </div>

        {/* Card 2: Total Signups by Platform */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              User Signups
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {stats?.totalSignups ?? '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total registered tenant & PM accounts
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.06)' }}>
              <AppleIcon size={11} /> {stats?.signupsByPlatform?.ios || 0} iOS
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <AndroidIcon size={11} /> {stats?.signupsByPlatform?.android || 0} Android
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb' }}>
              <Globe size={11} /> {stats?.signupsByPlatform?.web || 0} Web
            </span>
          </div>
        </div>

        {/* Card 3: Active Users & Sessions Today */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Sessions Today
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogIn size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {stats?.todayStats?.uniqueUsersTotalCount ?? '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Unique individuals active today
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(217, 119, 87, 0.1)', color: 'var(--accent)' }}>
              <Smartphone size={11} /> {stats?.todayStats?.uniqueUsersMobileCount || 0} Mobile
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb' }}>
              <Globe size={11} /> {stats?.todayStats?.uniqueUsersWebCount || 0} Web
            </span>
          </div>
        </div>

        {/* Card 4: 30-Day Total Platform Activity */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              30-Day Activity
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {stats?.recentActivityCount ?? '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Telemetry events logged past 30 days
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>
              <strong>{stats?.activeUsersByApp?.find((a) => a.app === 'upward-pay')?._count || 0}</strong> pay events
            </span>
            <span>•</span>
            <span>
              <strong>{stats?.activeUsersByApp?.find((a) => a.app === 'upward-pm')?._count || 0}</strong> pm events
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Interactive Trends Graph (Cumulative & Daily) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          borderRadius: '14px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
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
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Growth & Activity Trends (30 Days)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '3px 0 0 0' }}>
              {chartView === 'cumulative' ? 'Cumulative progression' : 'Daily volume'} across iOS, Android, and Web platforms
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Metric Selector */}
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-hover)',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px',
              }}
            >
              {(['all', 'installs', 'signups', 'logins'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setChartMetric(m)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    background: chartMetric === m ? 'var(--white)' : 'transparent',
                    color: chartMetric === m ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: chartMetric === m ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
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
                onClick={() => setChartView('cumulative')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: chartView === 'cumulative' ? 'var(--accent)' : 'transparent',
                  color: chartView === 'cumulative' ? 'var(--white)' : 'var(--text-muted)',
                }}
              >
                Cumulative
              </button>
              <button
                type="button"
                onClick={() => setChartView('daily')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: chartView === 'daily' ? 'var(--accent)' : 'transparent',
                  color: chartView === 'daily' ? 'var(--white)' : 'var(--text-muted)',
                }}
              >
                Daily
              </button>
            </div>
          </div>
        </div>

        {/* Chart SVG */}
        {chartData ? (
          <div style={{ position: 'relative', width: '100%', marginTop: '6px' }}>
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              style={{ width: '100%', height: 'auto', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chart-clay-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={chartData.pad}
                y1={chartData.height - chartData.pad}
                x2={chartData.width - chartData.pad}
                y2={chartData.height - chartData.pad}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <line
                x1={chartData.pad}
                y1={chartData.height / 2}
                x2={chartData.width - chartData.pad}
                y2={chartData.height / 2}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1={chartData.pad}
                y1={chartData.pad}
                x2={chartData.width - chartData.pad}
                y2={chartData.pad}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Area Fill */}
              <polygon points={chartData.polygonStr} fill="url(#chart-clay-gradient)" />

              {/* Primary Polyline */}
              <polyline
                points={chartData.polylineStr}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Circles on Points */}
              {chartData.points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={idx === chartData.points.length - 1 ? 4 : 2}
                  fill="var(--accent)"
                >
                  <title>{`${pt.date}: ${pt.val} (iOS: ${pt.ios}, Android: ${pt.android}, Web: ${pt.web})`}</title>
                </circle>
              ))}
            </svg>

            {/* Date Range Labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginTop: '6px',
              }}
            >
              <span>{chartData.startLabel}</span>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                Peak: {chartData.maxVal.toLocaleString()}
              </span>
              <span>{chartData.endLabel}</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading trend metrics...
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Filtering & Search Bar */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
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
              placeholder="Search by user email, device, action, or IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '13px',
              }}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Clear Filters Button */}
          {(search || appFilter !== 'ALL' || actionFilter !== 'ALL' || platformFilter !== 'ALL' || dateFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Platform Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Platform:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'ios', 'android', 'web'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPlatformFilter(p)
                    setPage(1)
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: platformFilter === p ? 'var(--text)' : 'var(--surface-hover)',
                    color: platformFilter === p ? 'var(--white)' : 'var(--text-secondary)',
                  }}
                >
                  {p === 'ALL' ? 'All Platforms' : p === 'ios' ? 'iOS' : p === 'android' ? 'Android' : 'Web'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Event:
            </span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'All Events' },
                { key: 'SIGNUP', label: 'Signups' },
                { key: 'LOGIN', label: 'Logins' },
                { key: 'APP_INSTALL', label: 'Installs' },
                { key: 'PAYMENT', label: 'Payments' },
                { key: 'CREATE', label: 'Creations' },
              ].map((act) => (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => {
                    setActionFilter(act.key)
                    setPage(1)
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: actionFilter === act.key ? 'var(--accent)' : 'var(--surface-hover)',
                    color: actionFilter === act.key ? 'var(--white)' : 'var(--text-secondary)',
                  }}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* App Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              App:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'upward-pay', 'upward-pm'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAppFilter(a)
                    setPage(1)
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: appFilter === a ? 'var(--surface-hover)' : 'transparent',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    borderColor: appFilter === a ? 'var(--text)' : 'transparent',
                    color: 'var(--text)',
                  }}
                >
                  {a === 'ALL' ? 'All' : a === 'upward-pay' ? 'Upward Pay' : 'Upward PM'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DataTable<AppActivityLog>
        data={logs}
        columns={columns}
        keyExtractor={(item) => item.uuid || String(item.id)}
        isLoading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        emptyTitle="No activity logs found"
        emptyDescription="Try adjusting your platform, action, or date filters."
      />

      {/* ────────────────────────────────────────────────────────── */}
      {/* Modals & Profile Drawers */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedLog && (
        <AppActivityLogViewerModal
          selectedLog={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}

      {drawerEntity && (
        <PreviewDrawer
          entity={drawerEntity}
          onClose={() => setDrawerEntity(null)}
        />
      )}
    </div>
  )
}

export default AppActivity
