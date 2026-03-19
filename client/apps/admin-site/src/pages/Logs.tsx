import React, { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Clock,
  Smartphone,
  Globe,
  ArrowLeft,
  ArrowRight,
  Filter,
  RefreshCcw,
} from 'lucide-react'
import { apiService } from '../services/api.service'

interface AdminLog {
  id: string
  adminId: string
  action: string
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  admin: {
    email: string
    role: string
  }
}

interface LogsProps {
  token: string
}

const Logs: React.FC<LogsProps> = ({ token }) => {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  const fetchLogs = async (pageNum = page) => {
    setLoading(true)
    try {
      const response = await apiService.get(`/admin/logs?page=${pageNum}&limit=50`, token)
      if (response.data) {
        setLogs(response.data.data)
        setTotalPages(response.data.meta.totalPages)
        setTotal(response.data.meta.total)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(page)
  }, [page])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return '#10b981' // Green
      case 'LOGOUT':
        return '#6b7280' // Gray
      case 'DELETE_USER':
      case 'DELETE_ADMIN':
        return '#ef4444' // Red
      case 'ADD_ADMIN':
        return '#3b82f6' // Blue
      case 'EXPORT_CSV':
        return '#f59e0b' // Amber
      case 'SEND_EMAIL':
        return '#8b5cf6' // Violet
      case 'DEMOTE_ADMIN':
      case 'PROMOTE_ADMIN':
        return '#ec4899' // Pink
      default:
        return 'var(--text-muted)'
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.admin.email.toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'ALL' || log.action === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{ background: 'var(--accent-faint)', color: 'var(--accent)' }}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>System Logs</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Monitor all administrative activities across the platform
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => fetchLogs()}
            className="btn btn-outline"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCcw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters/Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
            <Search
              size={18}
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
              placeholder="Search by email or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                minWidth: '160px',
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN">Logins</option>
              <option value="LOGOUT">Logouts</option>
              <option value="EXPORT_CSV">Exports</option>
              <option value="SEND_EMAIL">Emails</option>
              <option value="ADD_ADMIN">Admin Added</option>
              <option value="DELETE_ADMIN">Admin Deleted</option>
              <option value="DELETE_USER">User Deleted</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Desktop View Table */}
        <div className="hide-mobile">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <th
                  style={{
                    padding: '16px 24px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Time
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Admin
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Action
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Details
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{log.admin.email}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.admin.role}
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
                        {log.details || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {log.ipAddress && (
                          <div
                            style={{
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <Globe size={10} /> {log.ipAddress}
                          </div>
                        )}
                        {log.userAgent && (
                          <div
                            title={log.userAgent}
                            style={{
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--text-muted)',
                              maxWidth: '150px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            <Smartphone size={10} /> {log.userAgent.split(')')[0] + ')'}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="show-mobile" style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No logs found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: `${getActionColor(log.action)}15`,
                        color: getActionColor(log.action),
                      }}
                    >
                      {log.action}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                    {log.admin.email}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text)' }}>
                    {log.details || '—'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} /> {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    {log.ipAddress && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.ipAddress}
                      </div>
                    )}
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
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Showing {logs.length} of {total} events
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline"
                style={{ padding: '8px 12px' }}
              >
                <ArrowLeft size={16} />
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-outline"
                style={{ padding: '8px 12px' }}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

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

export default Logs
