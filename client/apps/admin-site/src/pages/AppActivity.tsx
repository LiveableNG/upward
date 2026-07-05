import React, { useState, useEffect } from 'react'
import {
  Search,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Filter,
  RefreshCcw,
  ChevronDown,
  Download,
  Activity,
  Users,
  Eye,
  X,
  Copy,
  Check,
  Globe,
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface AppActivityLog {
  id: number
  uuid: string
  app: string
  userId: number | null
  pmId: number | null
  userRole: string
  userEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  description: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface StatsData {
  totalInstalls: number
  platforms: {
    ios: number
    android: number
    web: number
    other: number
  }
  activeUsersByApp: {
    app: string
    _count: number
  }[]
  recentActivityCount: number
  todayStats?: {
    uniqueUsersMobileCount: number
    uniqueUsersWebCount: number
    mobileActionGrouped: { action: string; count: number }[]
    webActionGrouped: { action: string; count: number }[]
  }
}

interface AppActivityProps {
  token: string
}

const AppActivity: React.FC<AppActivityProps> = ({ token }) => {
  const [logs, setLogs] = useState<AppActivityLog[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [search, setSearch] = useState('')
  const [appFilter, setAppFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [platformFilter, setPlatformFilter] = useState('ALL')
  
  // Modal details
  const [selectedLog, setSelectedLog] = useState<AppActivityLog | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const response = await apiService.get('/admin/app-activity/stats', token)
      if (response) {
        setStats(response)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
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

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setLogs(response.data)
        setTotalPages(response.meta.totalPages)
        setTotal(response.meta.total)
      }
    } catch (error) {
      console.error('Failed to fetch app activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchLogs(page)
  }, [page, appFilter, actionFilter, platformFilter])

  // Trigger search on submit or enter key
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs(1)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchLogs(page)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'var(--success)'
      case 'LOGOUT':
        return 'var(--text-muted)'
      case 'SIGNUP':
        return '#8b5cf6' // Violet
      case 'APP_INSTALL':
        return 'var(--accent)'
      case 'DELETE':
        return 'var(--danger)'
      case 'CREATE':
        return '#3b82f6' // Blue
      case 'UPDATE':
        return 'var(--warning)'
      default:
        return 'var(--text-muted)'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Count active users by app from stats
  const getAppActivityCount = (appName: string) => {
    if (!stats) return 0
    const appStat = stats.activeUsersByApp.find((s) => s.app === appName)
    return appStat ? appStat._count : 0
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              App Activity & Telemetry
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track app downloads, active users, and mutations on upward-pay and upward-pm.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={loading || loadingStats}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RefreshCcw size={16} className={loading || loadingStats ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div
        className="stats-grid grid-mobile-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Total Mobile Installs</span>
            <div style={{ color: 'var(--accent)', background: 'var(--accent-faint)', padding: '6px', borderRadius: '8px' }}>
              <Download size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              {loadingStats ? '...' : stats?.totalInstalls || 0}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Total downloads & first-time launches
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Mobile OS Platform</span>
            <div style={{ color: 'var(--success)', background: 'var(--success-faint)', padding: '6px', borderRadius: '8px' }}>
              <Smartphone size={18} />
            </div>
          </div>
          {loadingStats ? (
            <div>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                  <span>iOS</span>
                  <span>{stats?.platforms?.ios || 0}</span>
                </div>
                <div style={{ height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--accent)',
                      width: `${stats?.totalInstalls ? (((stats.platforms?.ios || 0) / stats.totalInstalls) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                  <span>Android</span>
                  <span>{stats?.platforms?.android || 0}</span>
                </div>
                <div style={{ height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--success)',
                      width: `${stats?.totalInstalls ? (((stats.platforms?.android || 0) / stats.totalInstalls) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Tenant App Actions</span>
            <div style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <Activity size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              {loadingStats ? '...' : getAppActivityCount('upward-pay')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Total logged operations in upward-pay
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Manager App Actions</span>
            <div style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <Users size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              {loadingStats ? '...' : getAppActivityCount('upward-pm')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Total logged operations in upward-pm
            </p>
          </div>
        </div>
      </div>

      {/* Today's Closed Testing Telemetry Widget */}
      <div className="card" style={{ marginBottom: '24px', background: 'var(--white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <Activity size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Closed Testing: Today's Check-ins & Interactions</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
              Distinct users who checked in today, grouped by their device source and actions.
            </p>
          </div>
        </div>

        <div className="stats-grid grid-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Mobile App Interactions */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Mobile App (Capacitor)</span>
              </div>
              <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: '16px', fontWeight: 800, padding: '4px 12px', borderRadius: '8px' }}>
                {loadingStats ? '...' : stats?.todayStats?.uniqueUsersMobileCount ?? 0}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>Unique active testers on mobile today</p>
            
            {loadingStats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><div className="loader"></div></div>
            ) : stats?.todayStats?.mobileActionGrouped && stats.todayStats.mobileActionGrouped.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                {stats.todayStats.mobileActionGrouped.map((item) => (
                  <div key={item.action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.action}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                      {item.count} unique {item.count === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginTop: '16px', textAlign: 'center' }}>
                No mobile activity recorded today
              </p>
            )}
          </div>

          {/* Web Interactions */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Web Browser (Standard)</span>
              </div>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '16px', fontWeight: 800, padding: '4px 12px', borderRadius: '8px' }}>
                {loadingStats ? '...' : stats?.todayStats?.uniqueUsersWebCount ?? 0}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>Unique active testers on web today</p>
            
            {loadingStats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><div className="loader"></div></div>
            ) : stats?.todayStats?.webActionGrouped && stats.todayStats.webActionGrouped.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                {stats.todayStats.webActionGrouped.map((item) => (
                  <div key={item.action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.action}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                      {item.count} unique {item.count === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginTop: '16px', textAlign: 'center' }}>
                No web activity recorded today
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filters/Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form
          onSubmit={handleSearchSubmit}
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

      {/* Logs Table */}
      <div className="table-container card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="hide-mobile">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>App</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>User / Role</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: log.app === 'upward-pay' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                            color: log.app === 'upward-pay' ? '#3b82f6' : '#8b5cf6',
                          }}
                        >
                          {log.app}
                        </span>
                        {(() => {
                          const isMobileLog = (log.userAgent && log.userAgent.toLowerCase().includes('capacitor')) || log.action === 'APP_INSTALL';
                          return (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isMobileLog ? 'var(--accent-faint)' : 'var(--surface-hover)',
                                color: isMobileLog ? 'var(--accent)' : 'var(--text-muted)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {isMobileLog ? 'Mobile App' : 'Web Browser'}
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{log.userEmail || 'GUEST'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Role: {log.userRole} {log.userId ? `(UID: ${log.userId})` : log.pmId ? `(PMID: ${log.pmId})` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: `${getActionColor(log.action)}15`,
                          color: getActionColor(log.action),
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          maxWidth: '300px',
                          whiteSpace: 'normal',
                          lineBreak: 'anywhere',
                        }}
                      >
                        {log.description}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          background: 'var(--accent-faint)',
                          color: 'var(--accent)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="show-mobile" style={{ padding: '0' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No activity logs found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '20px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--white)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {(() => {
                      const isMobileLog = (log.userAgent && log.userAgent.toLowerCase().includes('capacitor')) || log.action === 'APP_INSTALL';
                      return (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: log.app === 'upward-pay' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                              color: log.app === 'upward-pay' ? '#3b82f6' : '#8b5cf6',
                            }}
                          >
                            {log.app}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isMobileLog ? 'var(--accent-faint)' : 'var(--surface-hover)',
                              color: isMobileLog ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                          >
                            {isMobileLog ? 'Mobile' : 'Web'}
                          </span>
                        </div>
                      )
                    })()}
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: `${getActionColor(log.action)}15`,
                        color: getActionColor(log.action),
                      }}
                    >
                      {log.action}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{log.description}</div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div>
                      {log.userEmail || 'GUEST'} ({log.userRole})
                    </div>
                    <button
                      onClick={() => setSelectedLog(log)}
                      style={{
                        background: 'transparent',
                        color: 'var(--accent)',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: 'var(--surface)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                flex: '1 0 100%',
                textAlign: 'center',
                marginBottom: '-8px',
                display: 'block',
                order: -1,
              }}
              className="mobile-only"
            >
              Page {page} of {totalPages} ({total} events)
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? 'default' : 'pointer',
                }}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <div
                style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '14px' }}
                className="desktop-only"
              >
                Page {page} of {totalPages} ({total} events)
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: page === totalPages ? 0.5 : 1,
                  cursor: page === totalPages ? 'default' : 'pointer',
                }}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details JSON Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '650px',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <button
              onClick={() => setSelectedLog(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>Log Details</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                UUID: {selectedLog.uuid}
              </p>
            </div>

            <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>App:</span>
                <span>{selectedLog.app}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>IP Address:</span>
                <span>{selectedLog.ipAddress || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>User Agent:</span>
                <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedLog.userAgent || ''}>
                  {selectedLog.userAgent || '—'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="section-label" style={{ fontSize: '12px' }}>Request Payload & Metadata</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedLog.metadata || {}, null, 2))}
                  style={{
                    background: 'transparent',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '300px',
                  margin: 0,
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setSelectedLog(null)} className="btn btn-primary">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .hide-mobile { display: block; }
        .show-mobile { display: none; }
        
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
          .show-mobile { display: block; }
        }
      `}</style>
    </div>
  )
}

export default AppActivity
