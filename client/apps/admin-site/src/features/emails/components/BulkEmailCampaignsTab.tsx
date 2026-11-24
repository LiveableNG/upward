import React, { useState, useEffect, useCallback } from 'react'
import {
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  Eye,
  RefreshCcw,
  Users,
  Search,
  X,
} from 'lucide-react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'

export interface BulkCampaignSummary {
  id: string
  subject: string
  targetGroup: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  retryableFailedCount: number
  permanentFailedCount: number
  pendingCount: number
  skippedCount: number
  openedCount: number
  openRate: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface CampaignRecipientRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  friendlyError: string | null
  sentAt: string | null
}

interface BulkEmailCampaignsTabProps {
  token: string
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  QUEUED: { label: 'Queued', color: '#d97706', bg: '#fef3c7' },
  SENDING: { label: 'Sending…', color: '#2563eb', bg: '#dbeafe' },
  PAUSED: { label: 'Paused', color: '#6b7280', bg: '#f3f4f6' },
  COMPLETED: { label: 'Completed', color: '#059669', bg: '#d1fae5' },
  COMPLETED_WITH_ERRORS: { label: 'Completed with Errors', color: '#d97706', bg: '#fef3c7' },
  CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
  FAILED: { label: 'Failed', color: '#dc2626', bg: '#fee2e2' },
}

export const BulkEmailCampaignsTab: React.FC<BulkEmailCampaignsTabProps> = ({ token }) => {
  const [campaigns, setCampaigns] = useState<BulkCampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Detail modal state
  const [selectedCampaign, setSelectedCampaign] = useState<BulkCampaignSummary | null>(null)
  const [recipients, setRecipients] = useState<CampaignRecipientRow[]>([])
  const [recipientStatus, setRecipientStatus] = useState<'ALL' | 'SENT' | 'FAILED' | 'PENDING'>('ALL')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientPage, setRecipientPage] = useState(1)
  const [recipientTotalPages, setRecipientTotalPages] = useState(1)
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const fetchCampaigns = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await apiService.get(`/admin/email/campaigns?page=${page}&limit=10`, token)
        setCampaigns(res.data || [])
        setTotalPages(res.meta?.totalPages || 1)
      } catch (err) {
        console.error('Failed to fetch bulk email campaigns', err)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [page, token],
  )

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-poll every 3 seconds whenever any campaign is actively QUEUED or SENDING
  const hasActiveCampaign = campaigns.some((c) => c.status === 'QUEUED' || c.status === 'SENDING')
  useEffect(() => {
    if (!hasActiveCampaign) return
    const timer = setInterval(() => {
      fetchCampaigns(true)
    }, 3000)
    return () => clearInterval(timer)
  }, [hasActiveCampaign, fetchCampaigns])

  const fetchCampaignRecipients = useCallback(
    async (campaignId: string, status: string, search: string, pageNum: number) => {
      setLoadingRecipients(true)
      try {
        const res = await apiService.get(
          `/admin/email/campaigns/${campaignId}?status=${status}&search=${encodeURIComponent(search)}&page=${pageNum}&limit=25`,
          token,
        )
        setRecipients(res.recipients || [])
        setRecipientTotalPages(res.meta?.totalPages || 1)
        if (res.campaign) {
          setSelectedCampaign((prev) => (prev ? { ...prev, ...res.campaign } : prev))
        }
      } catch (err) {
        console.error('Failed to fetch campaign recipients', err)
      } finally {
        setLoadingRecipients(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!selectedCampaign) return
    fetchCampaignRecipients(selectedCampaign.id, recipientStatus, recipientSearch, recipientPage)
  }, [selectedCampaign?.id, recipientStatus, recipientSearch, recipientPage, fetchCampaignRecipients])

  const handleControl = async (campaignId: string, action: 'PAUSE' | 'RESUME' | 'CANCEL') => {
    if (action === 'CANCEL' && !window.confirm('Cancel remaining unsent emails in this campaign?')) {
      return
    }
    setBusyId(campaignId)
    try {
      await apiService.post(`/admin/email/campaigns/${campaignId}/control`, { action }, token)
      showToast(`Campaign ${action.toLowerCase()}d successfully.`)
      await fetchCampaigns(true)
    } catch (err: any) {
      showToast(err?.message || `Failed to ${action.toLowerCase()} campaign`, true)
    } finally {
      setBusyId(null)
    }
  }

  const handleRetryFailed = async (campaignId: string) => {
    setBusyId(campaignId)
    try {
      const res = await apiService.post(
        `/admin/email/campaigns/${campaignId}/retry-failed`,
        {},
        token,
      )
      if (res.success) {
        showToast(res.message || 'Retryable failed emails re-queued!')
        await fetchCampaigns(true)
      } else {
        showToast(res.message || 'No retryable failed recipients found.', true)
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to retry campaign failures', true)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Bulk broadcasts are processed safely in the background with automatic rate-limiting and
          zero duplicate sends.
        </div>
        <button
          onClick={() => fetchCampaigns()}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--white)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCcw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading bulk email campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Send size={28} style={{ opacity: 0.4, marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No queued bulk campaigns yet
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            New bulk emails sent from the Email Composer will appear here with live progress and
            failure tracking.
          </div>
        </div>
      ) : (
        campaigns.map((c) => {
          const meta = STATUS_META[c.status] || {
            label: c.status,
            color: '#6b7280',
            bg: '#f3f4f6',
          }
          const processed = c.sentCount + c.failedCount
          const pct = c.totalRecipients > 0 ? Math.min(100, Math.round((processed / c.totalRecipients) * 100)) : 0
          const isActive = c.status === 'QUEUED' || c.status === 'SENDING'

          return (
            <div
              key={c.id}
              className="card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft: `4px solid ${meta.color}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{c.subject}</h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        color: meta.color,
                        background: meta.bg,
                      }}
                    >
                      {meta.label}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--surface)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {c.targetGroup}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Started {new Date(c.createdAt).toLocaleString()}
                    {c.completedAt && ` • Finished ${new Date(c.completedAt).toLocaleTimeString()}`}
                    {c.skippedCount > 0 && ` • ${c.skippedCount} duplicate/invalid skipped`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isActive && (
                    <button
                      onClick={() => handleControl(c.id, 'PAUSE')}
                      disabled={busyId === c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--white)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {c.status === 'PAUSED' && (
                    <button
                      onClick={() => handleControl(c.id, 'RESUME')}
                      disabled={busyId === c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Play size={13} /> Resume
                    </button>
                  )}
                  {(isActive || c.status === 'PAUSED') && (
                    <button
                      onClick={() => handleControl(c.id, 'CANCEL')}
                      disabled={busyId === c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={13} /> Cancel
                    </button>
                  )}
                  {c.retryableFailedCount > 0 && (
                    <button
                      onClick={() => handleRetryFailed(c.id)}
                      disabled={busyId === c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#fee2e2',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={13} /> Retry Failed ({c.retryableFailedCount})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCampaign(c)
                      setRecipientStatus(c.failedCount > 0 ? 'FAILED' : 'ALL')
                      setRecipientSearch('')
                      setRecipientPage(1)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={13} /> View Recipients
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '6px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>
                    Progress: <strong>{processed.toLocaleString()}</strong> /{' '}
                    {c.totalRecipients.toLocaleString()} ({pct}%)
                  </span>
                  {c.pendingCount > 0 && <span>{c.pendingCount.toLocaleString()} remaining in queue</span>}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'var(--surface-hover, #e5e7eb)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: c.failedCount > 0 && !isActive ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Clean Metric Pills */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>
                    <strong>{c.totalRecipients.toLocaleString()}</strong> Total
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                  <CheckCircle size={14} />
                  <span>
                    <strong>{c.sentCount.toLocaleString()}</strong> Sent
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb' }}>
                  <Eye size={14} />
                  <span>
                    <strong>{c.openedCount.toLocaleString()}</strong> Opened ({c.openRate}%)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: c.failedCount > 0 ? '#dc2626' : 'var(--text-muted)',
                  }}
                >
                  <AlertCircle size={14} />
                  <span>
                    <strong>{c.failedCount.toLocaleString()}</strong> Failed
                    {c.permanentFailedCount > 0 && ` (${c.permanentFailedCount} invalid)`}
                  </span>
                </div>
                {c.pendingCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706' }}>
                    <Clock size={14} />
                    <span>
                      <strong>{c.pendingCount.toLocaleString()}</strong> Queued
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--white)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--white)',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Campaign Recipients & Failures Modal */}
      {selectedCampaign && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={() => setSelectedCampaign(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              gap: '16px',
              overflow: 'hidden',
              background: 'var(--white)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>{selectedCampaign.subject}</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedCampaign.sentCount.toLocaleString()} sent •{' '}
                  {selectedCampaign.failedCount.toLocaleString()} failed •{' '}
                  {selectedCampaign.pendingCount.toLocaleString()} pending
                </div>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['ALL', 'FAILED', 'SENT', 'PENDING'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setRecipientStatus(st)
                    setRecipientPage(1)
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: recipientStatus === st ? 'var(--accent)' : 'var(--surface)',
                    color: recipientStatus === st ? '#fff' : 'inherit',
                  }}
                >
                  {st === 'ALL' ? 'All' : st === 'FAILED' ? 'Failed' : st === 'SENT' ? 'Sent' : 'Queued'}
                </button>
              ))}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search recipient email..."
                  value={recipientSearch}
                  onChange={(e) => {
                    setRecipientSearch(e.target.value)
                    setRecipientPage(1)
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border)', borderRadius: '10px' }}>
              {loadingRecipients ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading recipients…
                </div>
              ) : recipients.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recipients match this filter.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Details / Reason</th>
                      <th style={{ padding: '10px 14px' }}>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.email}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background:
                                r.status === 'SENT'
                                  ? '#d1fae5'
                                  : r.status === 'FAILED' || r.status === 'PERMANENT_FAILED'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                              color:
                                r.status === 'SENT'
                                  ? '#059669'
                                  : r.status === 'FAILED' || r.status === 'PERMANENT_FAILED'
                                    ? '#dc2626'
                                    : '#d97706',
                            }}
                          >
                            {r.status === 'PERMANENT_FAILED' ? 'Invalid / Permanent' : r.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {r.friendlyError || (r.status === 'SENT' ? 'Accepted by Mailgun' : 'Waiting in queue')}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {r.sentAt ? new Date(r.sentAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {recipientTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}
                  disabled={recipientPage <= 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    cursor: recipientPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Page {recipientPage} of {recipientTotalPages}
                </span>
                <button
                  onClick={() => setRecipientPage((p) => Math.min(recipientTotalPages, p + 1))}
                  disabled={recipientPage >= recipientTotalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    cursor: recipientPage >= recipientTotalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
