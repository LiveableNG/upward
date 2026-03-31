import React, { useState, useEffect } from 'react'
import {
  Mail,
  Search,
  RefreshCcw,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface EmailLog {
  id: string
  userId: string
  email: string
  subject: string
  type: string
  status: string
  body: string | null
  sentAt: string | null
  createdAt: string
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

interface EmailLogsProps {
  token: string
}

const EmailLogs: React.FC<EmailLogsProps> = ({ token }) => {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewLog, setViewLog] = useState<EmailLog | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  const handleRetry = async (id: string) => {
    if (retrying) return
    setRetrying(id)
    try {
      await apiService.post(`/admin/email/logs/${id}/retry`, {}, token)
      showToast('Retry dispatched! Logic will attempt delivery up to 3 times. ✓')
      fetchLogs()
    } catch (err) {
      console.error('Manual retry failed', err)
      showToast('Manual retry trigger failed', true)
    } finally {
      setRetrying(null)
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const result = await apiService.get(
        `/admin/email/logs?email=${search}&type=${typeFilter}&status=${statusFilter}`,
        token,
      )
      setLogs(result.data)
    } catch (err) {
      console.error('Failed to fetch email logs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, typeFilter, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return '#10b981'
      case 'FAILED':
        return '#ef4444'
      case 'PENDING':
        return '#f59e0b'
      default:
        return 'var(--text-muted)'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CONFIRMATION':
        return 'Signup'
      case 'BULK':
        return 'Bulk'
      case 'CAMPAIGN':
        return 'Drip'
      default:
        return type
    }
  }

  return (
    <div className="page-container fade-in">
      <div
        style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mail size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Email Logs
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track every email sent to users and view their live content.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs()}
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

      {/* Filters */}
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
              placeholder="Filter by user email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flex: '0 1 auto', minWidth: '320px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            >
              <option value="All">All Types</option>
              <option value="CONFIRMATION">Signup Emails</option>
              <option value="BULK">Bulk Emails</option>
              <option value="CAMPAIGN">Drip Campaigns</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            >
              <option value="All">All Status</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
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
                  Sent At
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
                  Recipient
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
                  Subject
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
                  Type
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
                  Status
                </th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
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
                  <td
                    colSpan={6}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {log.sentAt ? new Date(log.sentAt).toLocaleDateString() : '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.sentAt
                          ? new Date(log.sentAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {log.user.firstName
                          ? `${log.user.firstName} ${log.user.lastName || ''}`
                          : log.email || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {log.email || log.user.email}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          maxWidth: '280px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {log.subject}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'var(--surface-hover)',
                          color: 'var(--text)',
                        }}
                      >
                        {getTypeLabel(log.type)}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: getStatusColor(log.status),
                        }}
                      >
                        {log.status === 'SENT' ? (
                          <CheckCircle size={14} />
                        ) : log.status === 'FAILED' ? (
                          <AlertCircle size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                        {log.status}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button
                        onClick={() => setViewLog(log)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Eye size={14} /> View
                      </button>

                      {log.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          disabled={!!retrying}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: retrying === log.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <RotateCcw size={14} className={retrying === log.id ? 'spin' : ''} />
                          {retrying === log.id ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live View Modal */}
      {viewLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setViewLog(null)}
        >
          <div
            style={{
              background: 'var(--body-bg)',
              width: '100%',
              maxWidth: '800px',
              height: '90vh',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '24px',
                background: 'var(--white)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Email Live View</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Sent to <strong>{viewLog.email}</strong> on{' '}
                  {new Date(viewLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setViewLog(null)}
                style={{
                  padding: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {viewLog.status === 'FAILED' && (
              <div
                style={{
                  background: '#fef2f2',
                  borderBottom: '1px solid #fee2e2',
                  padding: '12px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#dc2626',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>This email failed to deliver. You can attempt a manual retry.</span>
                </div>
                <button
                  onClick={() => handleRetry(viewLog.id)}
                  disabled={!!retrying}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: retrying === viewLog.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <RotateCcw size={14} className={retrying === viewLog.id ? 'spin' : ''} />
                  {retrying === viewLog.id ? 'Processing Retry...' : 'Retry Now'}
                </button>
              </div>
            )}

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: '12px',
                  marginBottom: '24px',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Subject:</span>
                <span style={{ fontWeight: 700 }}>{viewLog.subject}</span>

                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
                <span style={{ color: getStatusColor(viewLog.status), fontWeight: 700 }}>
                  {viewLog.status}
                </span>
              </div>

              <div
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  height: 'calc(100% - 100px)',
                  background: '#f3f4f6',
                  overflow: 'hidden',
                }}
              >
                {viewLog.body ? (
                  <iframe
                    srcDoc={viewLog.body}
                    title="Live Email View"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '48px',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertCircle size={32} />
                    <p style={{ width: '100%' }}>
                      Live body content for this record was not logged or is empty.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: 'var(--white)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setViewLog(null)}
                className="btn btn-primary"
                style={{ padding: '10px 24px', borderRadius: '12px' }}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default EmailLogs
