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
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Smartphone,
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
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP'
  recipient?: string
  body: string | null
  sentAt: string | null
  createdAt: string
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  registeredUser?: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

interface EmailLogsProps {
  token: string
}

const EmailLogs: React.FC<EmailLogsProps> = ({ token }) => {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [acquisitionFilter, setAcquisitionFilter] = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')
  const [viewLog, setViewLog] = useState<EmailLog | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [batchProgress, setBatchProgress] = useState<JobProgress | null>(null)

  interface JobProgress {
    id: string
    total: number
    processed: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    message?: string
  }

  const handleRetry = async (id: string) => {
    if (retrying) return
    setRetrying(id)
    try {
      await apiService.post(`/admin/email/logs/${id}/retry`, {}, token)
      showToast('Retry dispatched! Logic will attempt delivery up to 3 times. ✓')
      fetchLogs(page)
    } catch (err) {
      console.error('Manual retry failed', err)
      showToast('Manual retry trigger failed', true)
    } finally {
      setRetrying(null)
    }
  }

  const handleRetryFilteredFailed = async () => {
    try {
      const response = await apiService.post(
        `/admin/email/logs/retry-batch?email=${search}&type=${typeFilter}&acquisition=${acquisitionFilter}`,
        {},
        token
      )
      if (response && response.success) {
        const jobId = response.jobId
        localStorage.setItem('emailBatchJobId', jobId)
        setBatchProgress({
          id: jobId,
          total: response.total,
          processed: 0,
          status: 'pending',
        })
        showToast(`Batch retry job started! Retrying ${response.total} failed emails in the background.`)
      } else {
        showToast(response?.message || 'No failed logs matching criteria to retry.', true)
      }
    } catch (err: any) {
      console.error('Failed to trigger batch retry', err)
      const errorMsg = err.response?.data?.message || err.message || 'Failed to trigger batch retry'
      showToast(errorMsg, true)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await apiService.get(`/admin/email/logs/jobs/${jobId}/status`, token)
      if (response && response.success) {
        const job: JobProgress = response.job
        setBatchProgress(job)

        if (job.status === 'completed' || job.status === 'failed') {
          fetchLogs(page)
          localStorage.removeItem('emailBatchJobId')
          if (job.status === 'completed') {
            showToast('Batch retry job completed successfully!')
          } else {
            showToast('Batch retry job failed.', true)
          }
        }
      } else {
        setBatchProgress(null)
        localStorage.removeItem('emailBatchJobId')
      }
    } catch (err) {
      console.error('Error polling job status', err)
    }
  }

  const fetchLogs = async (pageNum = page) => {
    setLoading(true)
    try {
      const response = await apiService.get(
        `/admin/email/logs?email=${debouncedSearch}&type=${typeFilter}&status=${statusFilter}&acquisition=${acquisitionFilter}&channel=${channelFilter}&date=${dateFilter}&page=${pageNum}&limit=10`,
        token,
      )
      if (response) {
        setLogs(response.data || [])
        setTotalPages(response.meta?.totalPages || 1)
        setTotal(response.meta?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch email logs', err)
    } finally {
      setLoading(false)
    }
  }

  // Load active job from localstorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem('emailBatchJobId')
    if (savedJobId) {
      setBatchProgress({
        id: savedJobId,
        total: 0,
        processed: 0,
        status: 'pending',
      })
    }
  }, [])

  // Poll for active batch retry job status
  useEffect(() => {
    if (!batchProgress || batchProgress.status === 'completed' || batchProgress.status === 'failed') {
      return
    }

    const interval = setInterval(() => {
      pollJobStatus(batchProgress.id)
    }, 1000)

    return () => clearInterval(interval)
  }, [batchProgress?.id, batchProgress?.status, page])

  // Debounce search text input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch logs when search criteria or page changes
  useEffect(() => {
    fetchLogs(page)
  }, [page, debouncedSearch, typeFilter, statusFilter, acquisitionFilter, channelFilter, dateFilter])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter, statusFilter, acquisitionFilter, channelFilter, dateFilter])

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
    const baseType = type.endsWith('_RETRY') ? type.substring(0, type.length - 6) : type;
    let label = baseType;
    switch (baseType) {
      case 'CONFIRMATION':
        label = 'Signup'
        break
      case 'BULK':
        label = 'Bulk'
        break
      case 'CAMPAIGN':
        label = 'Drip'
        break
      case 'NEW_USER_RECORDS':
        label = 'New Records'
        break
      case 'LANDLORD_WELCOME':
        label = 'Landlord Welcome'
        break
      case 'LANDLORD_NEW_PROPERTY_ASSIGNMENT':
        label = 'Property Assignment'
        break
      case 'RECORD_ADDED':
        label = 'Record Added'
        break
      case 'DATA_DELETION_REQUEST':
        label = 'Data Deletion'
        break
      case 'TEAM_INVITATION':
        label = 'Team Invite'
        break
      case 'PM_SIGNUP':
        label = 'PM Signup'
        break
      case 'PM_LOGIN':
        label = 'PM Login'
        break
      case 'JOIN_REQUEST_REJECTION':
        label = 'Join Decline'
        break
      case 'CREDIBILITY_REQUEST_REJECTION':
        label = 'Record Decline'
        break
      case 'TENANT_INVITE':
        label = 'Tenant Invite'
        break
      case 'PAYMENT_REQUEST':
        label = 'Payment Request'
        break
      case 'CREDIBILITY_REQUEST':
        label = 'Credibility Request'
        break
      case 'ONBOARDING_SEQUENCE_WELCOME':
        label = 'Seq: Welcome'
        break
      case 'ONBOARDING_SEQUENCE_DAY_2':
        label = 'Seq: Day 2'
        break
      case 'ONBOARDING_SEQUENCE_DAY_5':
        label = 'Seq: Day 5'
        break
      case 'ONBOARDING_SEQUENCE_DAY_9':
        label = 'Seq: Day 9'
        break
      case 'ONBOARDING_SEQUENCE_DAY_14':
        label = 'Seq: Day 14'
        break
      default:
        label = baseType
    }
    return type.endsWith('_RETRY') ? `${label} (Retry)` : label;
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
              Communication Logs
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track every email, SMS, and WhatsApp message sent to users. <strong>({total} logs found)</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRetryFilteredFailed}
            disabled={loading || !!(batchProgress && (batchProgress.status !== 'completed' && batchProgress.status !== 'failed'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (loading || (batchProgress && (batchProgress.status !== 'completed' && batchProgress.status !== 'failed'))) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RotateCcw size={16} />
            Retry Filtered Failed
          </button>

          <button
            onClick={() => fetchLogs(page)}
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
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            disabled={loading}
          >
            <RefreshCcw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Progress Bar Card */}
      {batchProgress && (
        <div
          className="card fade-in"
          style={{
            marginBottom: '24px',
            padding: '20px',
            borderLeft: `4px solid ${
              batchProgress.status === 'completed'
                ? 'var(--success)'
                : batchProgress.status === 'failed'
                  ? 'var(--danger)'
                  : 'var(--accent)'
            }`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            background: 'var(--white)',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {batchProgress.status === 'completed' ? (
                  <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                ) : batchProgress.status === 'failed' ? (
                  <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
                ) : (
                  <RefreshCcw size={16} className="spin" style={{ color: 'var(--accent)' }} />
                )}
                {batchProgress.status === 'completed'
                  ? 'Batch Retry Completed'
                  : batchProgress.status === 'failed'
                    ? 'Batch Retry Failed'
                    : `Retrying failed emails: ${batchProgress.processed} of ${batchProgress.total} processed`}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Job: {batchProgress.id.substring(0, 8)}
              </span>
            </div>

            {batchProgress.status !== 'completed' && batchProgress.status !== 'failed' && (
              <div style={{ width: '100%', height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${batchProgress.total > 0 ? Math.round((batchProgress.processed / batchProgress.total) * 100) : 0}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}

            {batchProgress.message && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {batchProgress.message}
              </div>
            )}
          </div>

          {(batchProgress.status === 'completed' || batchProgress.status === 'failed') && (
            <button
              onClick={() => setBatchProgress(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

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
              placeholder="Filter by recipient email or phone..."
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

          <div style={{ display: 'flex', gap: '12px', flex: '0 1 auto', minWidth: '450px', flexWrap: 'wrap' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '120px',
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
              <option value="ONBOARDING_SEQUENCE_WELCOME">Seq: Welcome</option>
              <option value="ONBOARDING_SEQUENCE_DAY_2">Seq: Day 2</option>
              <option value="ONBOARDING_SEQUENCE_DAY_5">Seq: Day 5</option>
              <option value="ONBOARDING_SEQUENCE_DAY_9">Seq: Day 9</option>
              <option value="ONBOARDING_SEQUENCE_DAY_14">Seq: Day 14</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '120px',
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

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            >
              <option value="All">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>

            <select
              value={acquisitionFilter}
              onChange={(e) => setAcquisitionFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            >
              <option value="All">All Sources</option>
              <option value="waitlist_converted">Waitlist Converted</option>
              <option value="invited">Invited</option>
              <option value="self_signup">Self Sign-ups</option>
            </select>
            
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '11px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                color: dateFilter ? 'inherit' : 'var(--text-muted)',
              }}
            />
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
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Channel
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
                        {log.registeredUser?.firstName
                          ? `${log.registeredUser.firstName} ${log.registeredUser.lastName || ''}`
                          : log.user?.firstName
                            ? `${log.user.firstName} ${log.user.lastName || ''}`
                            : log.recipient || log.email || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {log.recipient || log.email || log.registeredUser?.email || log.user?.email}
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
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                        {log.channel === 'SMS' ? (
                          <><Smartphone size={15} style={{ color: 'var(--text-muted)' }}/> SMS</>
                        ) : log.channel === 'WHATSAPP' ? (
                          <><MessageSquare size={15} style={{ color: '#25D366' }}/> WhatsApp</>
                        ) : (
                          <><Mail size={15} style={{ color: 'var(--accent)' }}/> Email</>
                        )}
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
                  transition: 'all 0.2s',
                }}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <div
                style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '14px' }}
                className="desktop-only"
              >
                Page {page} of {totalPages} ({total} logs)
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
                  transition: 'all 0.2s',
                }}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
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
              background: 'var(--white)',
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
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Message Live View</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Sent to <strong>{viewLog.recipient || viewLog.email}</strong> on{' '}
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
                  padding: viewLog.channel !== 'EMAIL' ? '24px' : '0',
                }}
              >
                {viewLog.body ? (
                  viewLog.channel === 'SMS' || viewLog.channel === 'WHATSAPP' ? (
                    <div style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'monospace', 
                      fontSize: '14px', 
                      lineHeight: '1.6',
                      background: 'var(--white)',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      height: '100%',
                      overflowY: 'auto'
                    }}>
                      {viewLog.body}
                    </div>
                  ) : (
                    <iframe
                      srcDoc={viewLog.body}
                      title="Live Email View"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  )
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
