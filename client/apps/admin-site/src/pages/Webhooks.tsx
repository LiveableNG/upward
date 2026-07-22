import React, { useState, useEffect } from 'react'
import {
  Webhook,
  Search,
  Clock,
  ArrowLeft,
  ArrowRight,
  Filter,
  RefreshCcw,
  ChevronDown,
  Eye,
  Send,
  AlertCircle,
  CheckCircle2,
  Timer,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { Modal } from '../components/common/modal/Modal'

interface WebhookLog {
  id: string
  platformId: number
  event: string
  url: string
  payload: any
  status: string
  responseCode: number | null
  errorMessage: string | null
  retries: number
  lastTriedAt: string | null
  createdAt: string
  platform?: {
    name: string
  }
}

interface WebhooksProps {
  token: string
}

const Webhooks: React.FC<WebhooksProps> = ({ token }) => {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchLogs = async (pageNum = page) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...(search ? { search } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      })
      const response = await apiService.get(`/admin/webhooks?${query.toString()}`, token)
      if (response) {
        setLogs(response.data)
        setTotalPages(response.meta.totalPages)
        setTotal(response.meta.total)
      }
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(page)
  }, [page, statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs(1)
  }

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await apiService.post(`/admin/webhooks/${id}/retry`, {}, token)
      // Refresh logs after a short delay to see the updated status
      setTimeout(() => fetchLogs(), 1000)
    } catch (error) {
      console.error('Failed to retry webhook:', error)
      alert('Failed to retry webhook delivery.')
    } finally {
      setRetrying(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return '#10b981' // Green
      case 'FAILED':
        return '#ef4444' // Red
      case 'PENDING':
        return '#f59e0b' // Amber
      default:
        return 'var(--text-muted)'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle2 size={14} />
      case 'FAILED':
        return <AlertCircle size={14} />
      case 'PENDING':
        return <Timer size={14} />
      default:
        return null
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

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
            <Webhook size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Webhook Logs
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track and manage event notifications sent to external platforms.
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
        <form
          onSubmit={handleSearch}
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
              placeholder="Search by event or URL..."
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
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
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
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
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

          <button type="submit" style={{ display: 'none' }}></button>
        </form>
      </div>

      <div className="table-container card" style={{ padding: 0, overflowX: 'auto' }}>
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
                  Event / Platform
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
                  Target URL
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
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Retries
                </th>
                <th
                  style={{
                    padding: '16px 24px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    textAlign: 'right',
                  }}
                >
                  Actions
                </th>
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
                    No webhook logs found.
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
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                        {log.event}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.platform?.name || 'Unknown Platform'}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={log.url}
                      >
                        {log.url}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: `${getStatusColor(log.status)}15`,
                            color: getStatusColor(log.status),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                        {log.responseCode !== null && log.responseCode !== undefined && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ({log.responseCode === 0 ? 'Err' : log.responseCode})
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '13px' }}>{log.retries}</div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn-icon"
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                          }}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleRetry(log.id)}
                          className="btn-icon"
                          disabled={retrying === log.id}
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--accent)',
                            opacity: retrying === log.id ? 0.5 : 1,
                          }}
                          title="Retry Delivery"
                        >
                          <Send size={18} className={retrying === log.id ? 'pulse' : ''} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="show-mobile">
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No webhook logs found.
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                        {log.event}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.platform?.name || 'Unknown Platform'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: `${getStatusColor(log.status)}15`,
                        color: getStatusColor(log.status),
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {getStatusIcon(log.status)}
                      {log.status}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {log.url}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleDateString()} ·{' '}
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                        }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleRetry(log.id)}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                          color: 'var(--accent)',
                        }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
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
              }}
            >
              Page {page} of {totalPages} ({total} logs)
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
                className="btn-pagination"
              >
                <ArrowLeft size={16} /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-pagination"
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Webhook Details"
        maxWidth="700px"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Event
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLog.event}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: getStatusColor(selectedLog.status),
                  }}
                >
                  {getStatusIcon(selectedLog.status)} {selectedLog.status}
                  {selectedLog.responseCode !== null && (
                    <span style={{ fontWeight: 400, opacity: 0.8 }}>
                      ({selectedLog.responseCode === 0 ? 'Network Error' : selectedLog.responseCode}
                      )
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Platform
                </div>
                <div style={{ fontSize: '14px' }}>{selectedLog.platform?.name || 'N/A'}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Last Attempt
                </div>
                <div style={{ fontSize: '14px' }}>
                  {selectedLog.lastTriedAt
                    ? new Date(selectedLog.lastTriedAt).toLocaleString()
                    : 'Never'}
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                URL
              </div>
              <div
                style={{
                  fontSize: '13px',
                  background: 'var(--surface)',
                  padding: '10px',
                  borderRadius: '8px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}
              >
                {selectedLog.url}
              </div>
            </div>

            {selectedLog.errorMessage && (
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Error Message
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    background: '#fef2f2',
                    color: '#991b1b',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2',
                  }}
                >
                  {selectedLog.errorMessage}
                </div>
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Payload</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedLog.payload, null, 2))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  COPY JSON
                </button>
              </div>
              <pre
                style={{
                  fontSize: '12px',
                  background: 'var(--dark)',
                  color: '#a5f3fc',
                  padding: '16px',
                  borderRadius: '12px',
                  overflowX: 'auto',
                  margin: 0,
                  maxHeight: '300px',
                }}
              >
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}
            >
              <button onClick={() => setSelectedLog(null)} className="btn btn-outline">
                Close
              </button>
              <button
                onClick={() => {
                  handleRetry(selectedLog.id)
                  setSelectedLog(null)
                }}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                <Send size={16} /> Retry Now
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

        .btn-pagination {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            backgroundColor: var(--white);
            border: 1px solid var(--border);
            borderRadius: 10px;
            fontSize: 14px;
            fontWeight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-pagination:disabled { opacity: 0.5; cursor: default; }
        .btn-pagination:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }

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

export default Webhooks
