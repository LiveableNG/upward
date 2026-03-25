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
  ChevronDown,
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
      if (response && response.data) {
        setLogs(response.data)
        setTotalPages(response.meta.totalPages)
        setTotal(response.meta.total)
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
            <FileText size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              System Logs
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Monitor administrative activities across the platform.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="btn btn-outline"
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCcw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters/Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div
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
              placeholder="Search by email or details..."
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
              minWidth: '200px',
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
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 36px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                  appearance: 'none',
                  cursor: 'pointer',
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

        <div className="show-mobile" style={{ padding: '0' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No logs found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredLogs.map((log) => (
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--surface-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifySelf: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--accent)',
                        }}
                      >
                        {log.admin.email[0].toUpperCase()}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{log.admin.email}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: `${getActionColor(log.action)}15`,
                        color: getActionColor(log.action),
                        textTransform: 'uppercase',
                      }}
                    >
                      {log.action}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
                    {log.details || 'No details provided'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleDateString()} ·{' '}
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {log.ipAddress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={11} /> {log.ipAddress}
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
                Page {page} of {totalPages}
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
