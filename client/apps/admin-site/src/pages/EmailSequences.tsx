import { useState, useEffect } from 'react'
import { RefreshCcw, Eye, Play, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmailSequencesProps {
  token: string
}

interface SequenceUser {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

interface SequenceLog {
  id: number
  userId: number
  email: string
  stage: string
  status: string
  scheduledFor: string
  sentAt: string | null
  errorReason: string | null
  templateName: string
  isOpened?: boolean
  openedAt?: string | null
  openCount?: number
  user?: SequenceUser
}

const STAGES = ['DAY_2', 'DAY_5', 'DAY_9', 'DAY_14']

export default function EmailSequences({ token }: EmailSequencesProps) {
  const [logs, setLogs] = useState<SequenceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [activeStage, setActiveStage] = useState('DAY_2')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [previewName, setPreviewName] = useState('John')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 })

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({
        limit: '200',
        page: page.toString(),
        stage: activeStage,
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && { email: searchQuery }),
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/email-sequences?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch sequence logs')
      const data = await res.json()
      setLogs(data.data || data)
      if (data.stats) setStats(data.stats)
      if (data.meta) setTotalPages(data.meta.totalPages || 1)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreview = async () => {
    if (!showPreview) return;
    setPreviewLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/email-sequences/preview?stage=${activeStage}&name=${previewName}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch preview')
      const data = await res.json()
      setPreviewHtml(data.html)
    } catch (err: any) {
      setPreviewHtml('<p style="color:red;">Failed to load preview.</p>')
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [activeStage, statusFilter, searchQuery])

  useEffect(() => {
    fetchLogs()
    fetchPreview()
  }, [activeStage, statusFilter, searchQuery, page])

  useEffect(() => {
    if (!showPreview) return;
    const handler = setTimeout(() => {
      fetchPreview()
    }, 500)
    return () => clearTimeout(handler)
  }, [previewName, showPreview])

  const handleRetry = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/email-sequences/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Retry failed')
      }
      await fetchLogs()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleBatchRetry = async () => {
    const failedLogs = logs.filter(l => l.status === 'FAILED')
    if (failedLogs.length === 0) return alert('No failed logs to retry in this view.')
    
    if (!confirm(`Are you sure you want to retry ${failedLogs.length} failed emails?`)) return
    
    for (const log of failedLogs) {
      await handleRetry(log.id)
    }
    alert('Batch retry completed.')
  }

  const { total, sent, failed, pending } = stats

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SENT': return <span className="badge badge-success" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><CheckCircle size={12} /> SENT</span>
      case 'FAILED': return <span className="badge badge-danger" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><XCircle size={12} /> FAILED</span>
      default: return <span className="badge badge-warning" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Clock size={12} /> PENDING</span>
    }
  }

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 className="section-title" style={{ margin: '0 0 8px 0' }}>Email Sequences</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage and preview automated email onboarding messages.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 2fr' : '1fr', gap: '24px', marginBottom: '32px', transition: 'var(--transition)' }}>
        {/* Preview Card */}
        {showPreview && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                <Eye size={18} color="var(--text-muted)" /> Template Preview
              </h2>
              <button onClick={() => setShowPreview(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', flex: 1 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: '8px' }}>Inject Recipient Name</label>
              <input 
                type="text" 
                className="input"
                value={previewName}
                onChange={(e) => setPreviewName(e.target.value)}
                style={{ marginBottom: '20px' }}
              />
              
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '400px', position: 'relative' }}>
                {previewLoading ? (
                  <div style={{ color: '#166534', textAlign: 'center', marginTop: '40px' }}><RefreshCcw size={20} className="loader" style={{margin: '0 auto', borderColor: '#e5e7eb', borderTopColor: '#374151'}} /></div>
                ) : (
                  <iframe 
                    srcDoc={previewHtml} 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Email Preview"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Controls: Tabs & Toggle Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STAGES.map(stage => (
                <button
                  key={stage}
                  onClick={() => { setActiveStage(stage); setStatusFilter(''); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '99px',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: activeStage === stage ? 'var(--accent)' : 'var(--border)',
                    background: activeStage === stage ? 'var(--accent)' : 'var(--surface)',
                    color: activeStage === stage ? 'white' : 'var(--text-secondary)',
                    transition: 'var(--transition)'
                  }}
                >
                  {stage.replace('_', ' ')}
                </button>
              ))}
            </div>
            {!showPreview && (
              <button onClick={() => setShowPreview(true)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Eye size={16} /> Show Preview
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div className="section-label" style={{ marginBottom: '4px' }}>Total</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)' }}>{total}</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div className="section-label" style={{ marginBottom: '4px' }}>Sent</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--success)' }}>{sent}</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div className="section-label" style={{ marginBottom: '4px' }}>Failed</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--danger)' }}>{failed}</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div className="section-label" style={{ marginBottom: '4px' }}>Pending</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--warning)' }}>{pending}</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['', 'PENDING', 'APPROVED', 'ON_HOLD', 'SENT', 'FAILED'].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: statusFilter === status ? 'var(--text-secondary)' : 'transparent',
                        background: statusFilter === status ? 'var(--white)' : 'transparent',
                        color: statusFilter === status ? 'var(--text)' : 'var(--text-muted)',
                        transition: 'var(--transition)'
                      }}
                    >
                      {status === '' ? 'All' : status.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipient or email"
                    style={{ minWidth: '220px', width: '320px' }}
                  />
                  {failed > 0 && statusFilter === 'FAILED' && (
                    <button
                      onClick={handleBatchRetry}
                      className="btn"
                      style={{ background: 'var(--danger-faint)', color: 'var(--danger)' }}
                    >
                      <Play size={14} /> Batch Retry ({failed})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && <div style={{ padding: '16px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}

            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
                    <th className="section-label" style={{ padding: '16px 20px' }}>Recipient</th>
                    <th className="section-label" style={{ padding: '16px 20px' }}>Status</th>
                    <th className="section-label" style={{ padding: '16px 20px' }}>Opened</th>
                    <th className="section-label" style={{ padding: '16px 20px' }}>Scheduled</th>
                    <th className="section-label" style={{ padding: '16px 20px' }}>Details</th>
                    <th className="section-label" style={{ padding: '16px 20px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center' }}><div className="loader" style={{margin: '0 auto'}}></div></td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No sequences found for this view.</td></tr>
                  ) : (
                    logs.map(log => {
                      const name = log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : 'Unknown User'
                      const contact = log.email || log.user?.email || '-'
                      
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <Link to={`/admin/users/${log.userId}`} style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '14px', textDecoration: 'none' }}>
                              {name || 'Unknown'}
                            </Link>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{contact}</div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {getStatusBadge(log.status)}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {log.isOpened ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                                <CheckCircle size={14} />
                                {log.openCount && log.openCount > 1 ? `${log.openCount} opens` : 'Opened'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Not opened</span>
                            )}
                            {log.openedAt ? (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {new Date(log.openedAt).toLocaleString()}
                              </div>
                            ) : null}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {new Date(log.scheduledFor).toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                            {log.status === 'FAILED' ? (
                              <span style={{ color: 'var(--danger)' }}>{log.errorReason}</span>
                            ) : log.status === 'SENT' ? (
                              <span>Sent: {new Date(log.sentAt!).toLocaleString()}</span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            {log.status === 'FAILED' && (
                              <button
                                onClick={() => handleRetry(log.id)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination footer */}
            {!loading && totalPages > 1 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px' }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
