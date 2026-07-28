import React, { useState, useEffect, useMemo } from 'react'
import { Mail, Search, RefreshCcw, RotateCcw, MessageSquare, Smartphone, Eye } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable, type ColumnDef, type ActionItem } from '../components/common/table/DataTable'
import {
  EmailBatchProgressBanner,
  type JobProgress,
} from '../features/emails/components/EmailBatchProgressBanner'
import {
  EmailLogViewerModal,
  type EmailLog,
} from '../features/emails/components/EmailLogViewerModal'

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
  const [openFilter, setOpenFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')
  const [viewLog, setViewLog] = useState<EmailLog | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [batchProgress, setBatchProgress] = useState<JobProgress | null>(null)

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
        token,
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
        showToast(
          `Batch retry job started! Retrying ${response.total} failed emails in the background.`,
        )
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
        `/admin/email/logs?email=${debouncedSearch}&type=${typeFilter}&status=${statusFilter}&acquisition=${acquisitionFilter}&channel=${channelFilter}&opened=${openFilter}&date=${dateFilter}&page=${pageNum}&limit=10`,
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

  useEffect(() => {
    if (
      !batchProgress ||
      batchProgress.status === 'completed' ||
      batchProgress.status === 'failed'
    ) {
      return
    }

    const interval = setInterval(() => {
      pollJobStatus(batchProgress.id)
    }, 1000)

    return () => clearInterval(interval)
  }, [batchProgress?.id, batchProgress?.status, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchLogs(page)
  }, [
    page,
    debouncedSearch,
    typeFilter,
    statusFilter,
    acquisitionFilter,
    channelFilter,
    dateFilter,
  ])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter, statusFilter, acquisitionFilter, channelFilter, openFilter, dateFilter])
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
    const baseType = type.endsWith('_RETRY') ? type.substring(0, type.length - 6) : type
    let label = baseType
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
    return type.endsWith('_RETRY') ? `${label} (Retry)` : label
  }

  const columns = useMemo<ColumnDef<EmailLog>[]>(
    () => [
      {
        key: 'sentAt',
        label: 'Sent At',
        render: (log) => (
          <>
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
          </>
        ),
      },
      {
        key: 'recipient',
        label: 'Recipient',
        render: (log) => (
          <>
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
          </>
        ),
      },
      {
        key: 'subject',
        label: 'Subject',
        render: (log) => (
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
        ),
      },
      {
        key: 'type',
        label: 'Type',
        render: (log) => (
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
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (log) => (
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
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(log.status),
              }}
            />
            {log.status}
          </div>
        ),
      },
      {
        key: 'channel',
        label: 'Channel',
        render: (log) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {log.channel === 'SMS' ? (
              <>
                <Smartphone size={15} style={{ color: 'var(--text-muted)' }} /> SMS
              </>
            ) : log.channel === 'WHATSAPP' ? (
              <>
                <MessageSquare size={15} style={{ color: '#25D366' }} /> WhatsApp
              </>
            ) : (
              <>
                <Mail size={15} style={{ color: 'var(--accent)' }} /> Email
              </>
            )}
          </div>
        ),
      },
      {
        key: 'opened',
        label: 'Opened',
        render: (log) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            {log.isOpened ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                {log.openCount && log.openCount > 1 ? `${log.openCount} opens` : 'Opened'}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Not opened</span>
            )}
            {log.openedAt ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                {new Date(log.openedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  )

  const getRowActions = (log: EmailLog): ActionItem<EmailLog>[] => {
    const actions: ActionItem<EmailLog>[] = [
      {
        label: 'View',
        icon: <Eye size={14} />,
        onClick: (item) => setViewLog(item),
      },
    ]

    if (log.status === 'FAILED') {
      actions.push({
        label: retrying === log.id ? 'Retrying...' : 'Retry',
        icon: <RotateCcw size={14} className={retrying === log.id ? 'spin' : ''} />,
        onClick: (item) => handleRetry(item.id),
      })
    }

    return actions
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
              Track every email, SMS, and WhatsApp message sent to users.{' '}
              <strong>({total} logs found)</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRetryFilteredFailed}
            disabled={
              loading ||
              !!(
                batchProgress &&
                batchProgress.status !== 'completed' &&
                batchProgress.status !== 'failed'
              )
            }
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
              cursor:
                loading ||
                (batchProgress &&
                  batchProgress.status !== 'completed' &&
                  batchProgress.status !== 'failed')
                  ? 'not-allowed'
                  : 'pointer',
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

      {batchProgress && (
        <EmailBatchProgressBanner
          batchProgress={batchProgress}
          onDismiss={() => setBatchProgress(null)}
        />
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

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flex: '0 1 auto',
              minWidth: '450px',
              flexWrap: 'wrap',
            }}
          >
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
              value={openFilter}
              onChange={(e) => setOpenFilter(e.target.value)}
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
              <option value="All">All Opens</option>
              <option value="Opened">Opened</option>
              <option value="NotOpened">Not opened</option>
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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable
          data={logs}
          columns={columns}
          keyExtractor={(log) => log.id}
          isLoading={loading}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          rowActions={getRowActions}
        />
      </div>

      <EmailLogViewerModal
        viewLog={viewLog}
        onClose={() => setViewLog(null)}
        onRetry={handleRetry}
        retrying={retrying}
        getStatusColor={getStatusColor}
      />
    </div>
  )
}

export default EmailLogs
