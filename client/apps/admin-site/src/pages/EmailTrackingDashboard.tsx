import React, { useState, useEffect, useMemo } from 'react'
import { Mail, Search, RefreshCcw, Eye, MousePointer, ExternalLink, Calendar, CheckCircle2, XCircle, Activity, Globe } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable, type ColumnDef, type ActionItem } from '../components/common/table/DataTable'
import { Modal } from '../components/common/modal/Modal'
import { EmailLogViewerModal } from '../features/emails/components/EmailLogViewerModal'

interface EmailTrackingDashboardProps {
  token: string
}

export interface LinkClickEvent {
  id: string
  clickedAt: string
  ipAddress?: string
  userAgent?: string
}

export interface TrackedLinkDetail {
  id: string
  originalUrl: string
  clickCount: number
  firstClickedAt?: string
  lastClickedAt?: string
  clicks: LinkClickEvent[]
}

export interface EmailTrackingLog {
  id: string
  email: string
  recipient: string
  subject: string
  type: string
  status: string
  body?: string | null
  createdAt?: string
  sentAt: string
  isOpened: boolean
  openedAt?: string
  openCount: number
  userAgent?: string
  isClicked: boolean
  firstClickedAt?: string
  lastClickedAt?: string
  clickCount: number
  links: TrackedLinkDetail[]
}

export interface TrackingStats {
  totalSent: number
  totalOpened: number
  openRate: string
  clickThroughRate: string
  totalClicks: number
}

export const EmailTrackingDashboard: React.FC<EmailTrackingDashboardProps> = ({ token }) => {
  const [logs, setLogs] = useState<EmailTrackingLog[]>([])
  const [stats, setStats] = useState<TrackingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [clickedOnly, setClickedOnly] = useState(false)
  const [openedOnly, setOpenedOnly] = useState(false)
  const [typeFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<EmailTrackingLog | null>(null)
  const [viewContentLog, setViewContentLog] = useState<EmailTrackingLog | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const fetchTrackingData = async (currentPage = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25',
        search: debouncedSearch,
        startDate,
        endDate,
        clickedOnly: clickedOnly ? 'true' : 'false',
        openedOnly: openedOnly ? 'true' : 'false',
        type: typeFilter,
      })

      const response = await apiService.get(`/admin/email-tracking?${params.toString()}`, token)
      if (response && response.success) {
        setLogs(response.logs || [])
        setStats(response.stats || null)
        setTotalPages(response.pagination?.totalPages || 1)
        setTotal(response.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load email tracking data:', err)
      showToast('Failed to load email tracking statistics', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackingData(page)
  }, [page, debouncedSearch, startDate, endDate, clickedOnly, openedOnly, typeFilter])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns: ColumnDef<EmailTrackingLog>[] = useMemo(
    () => [
      {
        key: 'subject',
        label: 'Subject / Type',
        width: '260px',
        render: (row) => (
          <div style={{ maxWidth: '240px' }}>
            <div
              title="Click to view message live content"
              onClick={() => setViewContentLog(row)}
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--clay, #4f46e5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              {row.subject}
            </div>
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: '#4f46e5',
              }}
            >
              {row.type}
            </span>
          </div>
        ),
      },
      {
        key: 'recipient',
        label: 'Recipient',
        width: '180px',
        render: (row) => (
          <div
            title={row.recipient || row.email}
            style={{
              fontSize: '13px',
              color: 'var(--text-muted, #475569)',
              maxWidth: '170px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.recipient || row.email}
          </div>
        ),
      },
      {
        key: 'sentAt',
        label: 'Sent At',
        width: '130px',
        render: (row) => (
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            {formatDate(row.sentAt)}
          </div>
        ),
      },
      {
        key: 'isOpened',
        label: 'Opened',
        width: '120px',
        render: (row) => (
          <div>
            {row.isOpened ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#16a34a',
                }}
              >
                <CheckCircle2 size={13} /> Yes ({row.openCount})
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  color: '#64748b',
                }}
              >
                <XCircle size={13} /> No
              </span>
            )}
            {row.openedAt && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {formatDate(row.openedAt)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'isClicked',
        label: 'Clicked',
        width: '100px',
        render: (row) => (
          <div>
            {row.isClicked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(14, 165, 233, 0.1)',
                  color: '#0284c7',
                }}
              >
                <MousePointer size={13} /> Yes
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  color: '#64748b',
                }}
              >
                No
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'firstClickedAt',
        label: 'First Clicked At',
        width: '130px',
        render: (row) => (
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            {formatDate(row.firstClickedAt)}
          </div>
        ),
      },
      {
        key: 'lastClickedAt',
        label: 'Last Clicked At',
        width: '130px',
        render: (row) => (
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            {formatDate(row.lastClickedAt)}
          </div>
        ),
      },
      {
        key: 'clickCount',
        label: 'Click Count',
        width: '100px',
        render: (row) => (
          <div style={{ fontWeight: 700, fontSize: '14px', color: row.clickCount > 0 ? '#0284c7' : '#94a3b8' }}>
            {row.clickCount}
          </div>
        ),
      },
    ],
    [],
  )

  const actions: ActionItem<EmailTrackingLog>[] = [
    {
      label: 'View Activity',
      icon: <Eye size={15} />,
      onClick: (row) => setSelectedLog(row),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--dark, #0f172a)', margin: 0 }}>
            Email Click Tracking Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted, #64748b)' }}>
            Monitor real-time email opens, link clicks, recipient engagement timelines, and destination targets ({total.toLocaleString()} total records).
          </p>
        </div>
        <button
          onClick={() => fetchTrackingData(page)}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--clay, #4f46e5)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
              <Mail size={16} /> Total Sent
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
              {stats.totalSent.toLocaleString()}
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Total Opened
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
              {stats.totalOpened.toLocaleString()}
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontSize: '13px', fontWeight: 600 }}>
              <Activity size={16} /> Open Rate
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#4f46e5', marginTop: '8px' }}>
              {stats.openRate}
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontSize: '13px', fontWeight: 600 }}>
              <MousePointer size={16} /> Click-Through Rate
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0284c7', marginTop: '8px' }}>
              {stats.clickThroughRate}
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontSize: '13px', fontWeight: 600 }}>
              <Globe size={16} /> Total Link Clicks
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706', marginTop: '8px' }}>
              {stats.totalClicks.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by recipient, subject, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              color: '#334155',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              color: '#334155',
            }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
          <input
            type="checkbox"
            checked={clickedOnly}
            onChange={(e) => setClickedOnly(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
          />
          Clicked Only
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
          <input
            type="checkbox"
            checked={openedOnly}
            onChange={(e) => setOpenedOnly(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
          />
          Opened Only
        </label>

        {(startDate || endDate || search || clickedOnly || openedOnly) && (
          <button
            onClick={() => {
              setSearch('')
              setStartDate('')
              setEndDate('')
              setClickedOnly(false)
              setOpenedOnly(false)
              setPage(1)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        data={logs}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        rowActions={actions}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
      />

      {/* Activity Details Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.subject || 'Email Activity Details'}
        description={selectedLog ? `Recipient: ${selectedLog.recipient || selectedLog.email}` : undefined}
        icon={<Mail size={20} />}
        maxWidth="760px"
        footerActions={
          <button
            onClick={() => setSelectedLog(null)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Close
          </button>
        }
      >
        {selectedLog && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                Type: {selectedLog.type}
              </span>
            </div>

            {/* Email Activity Timeline */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} /> Email Lifecycle Timeline
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Sent At</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{formatDate(selectedLog.sentAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Opened</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: selectedLog.isOpened ? '#16a34a' : '#64748b', marginTop: '2px' }}>
                    {selectedLog.isOpened ? `Yes (${formatDate(selectedLog.openedAt)})` : 'No'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Total Link Clicks</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>
                    {selectedLog.clickCount} Clicks
                  </div>
                </div>
              </div>
            </div>

            {/* Tracked Links Breakdown */}
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExternalLink size={18} /> Tracked Links & Destination URLs ({selectedLog.links.length})
            </h3>

            {selectedLog.links.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                No trackable links detected in this email payload.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedLog.links.map((link) => (
                  <div
                    key={link.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      backgroundColor: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ wordBreak: 'break-all', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Destination URL</span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0284c7', marginTop: '2px' }}>
                          <a href={link.originalUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none' }}>
                            {link.originalUrl}
                          </a>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: link.clickCount > 0 ? '#16a34a' : '#64748b', backgroundColor: link.clickCount > 0 ? 'rgba(34,197,94,0.1)' : '#f1f5f9', padding: '4px 10px', borderRadius: '16px' }}>
                          {link.clickCount} {link.clickCount === 1 ? 'Click' : 'Clicks'}
                        </span>
                      </div>
                    </div>

                    {link.clicks && link.clicks.length > 0 && (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Individual Click History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {link.clicks.map((click) => (
                            <div key={click.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                              <span>{formatDate(click.clickedAt)}</span>
                              <span>{click.ipAddress || 'IP N/A'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Message Live Content Viewer Modal */}
      <EmailLogViewerModal
        viewLog={
          viewContentLog
            ? {
                id: viewContentLog.id,
                userId: '',
                email: viewContentLog.email || viewContentLog.recipient,
                recipient: viewContentLog.recipient || viewContentLog.email,
                subject: viewContentLog.subject,
                type: viewContentLog.type,
                status: viewContentLog.status,
                body: viewContentLog.body ?? null,
                sentAt: viewContentLog.sentAt,
                createdAt: viewContentLog.createdAt || viewContentLog.sentAt,
                isOpened: viewContentLog.isOpened,
                openedAt: viewContentLog.openedAt ?? null,
                openCount: viewContentLog.openCount,
                user: null,
              }
            : null
        }
        onClose={() => setViewContentLog(null)}
        onRetry={() => {}}
        retrying={null}
        getStatusColor={(status) => (status === 'SENT' ? '#16a34a' : '#dc2626')}
      />
    </div>
  )
}
