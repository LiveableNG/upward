import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Trash2, Clock, Code, X } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface ErrorLog {
  id: string
  message: string
  stack?: string
  context?: string
  severity: string
  resolved: boolean
  createdAt: string
}

interface ErrorLogsProps {
  token: string
}

const ErrorLogs: React.FC<ErrorLogsProps> = ({ token }) => {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [token])

  const fetchLogs = async () => {
    try {
      const res = await apiService.get('/admin/error-logs', token)
      setLogs(res.data)
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch error logs', true)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id: string) => {
    try {
      await apiService.patch(`/admin/error-logs/${id}/resolve`, {}, token)
      setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, resolved: true } : l)))
      showToast('Error resolved')
    } catch {
      showToast('Failed to resolve error', true)
    }
  }

  const handleClear = async () => {
    if (!window.confirm('Clear all resolved logs?')) return
    try {
      await apiService.delete('/admin/error-logs/clear', token)
      setLogs((prev) => prev.filter((l) => !l.resolved))
      showToast('Resolved logs cleared')
    } catch {
      showToast('Failed to clear logs', true)
    }
  }

  return (
    <div className="page-container fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2
            className="section-title"
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <AlertTriangle size={24} color="#dc2626" />
            System Error Logs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Monitor and resolve API errors and critical failures.
          </p>
        </div>
        <button
          onClick={handleClear}
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--surface-hover)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={18} /> Clear Resolved
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <th
                style={{
                  padding: '16px 24px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Severity
              </th>
              <th
                style={{
                  padding: '16px 24px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Error Details
              </th>
              <th
                style={{
                  padding: '16px 24px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Time
              </th>
              <th
                style={{
                  padding: '16px 24px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  backgroundColor: log.resolved ? 'transparent' : 'rgba(239, 68, 68, 0.02)',
                  opacity: log.resolved ? 0.6 : 1,
                }}
              >
                <td style={{ padding: '20px 24px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: log.severity === 'ERROR' ? '#fee2e2' : '#fef9c3',
                      color: log.severity === 'ERROR' ? '#991b1b' : '#854d0e',
                    }}
                  >
                    {log.severity}
                  </span>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      maxWidth: '500px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {log.message}
                  </div>
                </td>
                <td style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '20px 24px' }}>
                  {log.resolved ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#10b981',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle size={16} /> Resolved
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResolve(log.id)
                      }}
                      style={{
                        padding: '6px 14px',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Mark Resolved
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  No errors logged. Everything looks good!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', padding: '32px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#991b1b' }}>
                  Error Information
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ background: 'var(--surface)', border: 'none' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                  Message
                </p>
                <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#111827' }}>
                  {selectedLog.message}
                </div>
              </div>

              {selectedLog.context && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    <Clock size={14} /> Request Context
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '16px',
                      borderRadius: '12px',
                      background: '#111827',
                      color: '#f3f4f6',
                      fontSize: '12px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(JSON.parse(selectedLog.context), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.stack && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    <Code size={14} /> Stack Trace
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '16px',
                      borderRadius: '12px',
                      background: '#111827',
                      color: '#f3f4f6',
                      fontSize: '11px',
                      overflow: 'auto',
                      maxHeight: '300px',
                    }}
                  >
                    {selectedLog.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ErrorLogs
