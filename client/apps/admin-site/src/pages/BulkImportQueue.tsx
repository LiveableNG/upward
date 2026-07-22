import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileSpreadsheet,
  Download,
  Upload,
  UserCheck,
  Clock,
  CheckCircle2,
  History,
  AlertCircle,
  RefreshCcw,
  MoreVertical,
  Edit3,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'

interface BulkImportQueueProps {
  token: string
}

export const BulkImportQueue: React.FC<BulkImportQueueProps> = ({ token }) => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'queue' | 'logs'>('queue')
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-container')) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const data = await apiService.get('/admin/bulk-imports', token || undefined)
      setJobs(data)
    } catch (e) {
      console.error('Failed to fetch jobs', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [token])

  const handleClaim = async (jobUuid: string) => {
    try {
      await apiService.post(`/admin/bulk-imports/${jobUuid}/claim`, {}, token || undefined)
      showToast('Task claimed successfully!')
      fetchJobs()
    } catch (e) {
      console.error(e)
      showToast('Failed to claim task', true)
    }
  }

  const handleLogDownload = async (job: any) => {
    try {
      const res = await apiService.post(`/admin/bulk-imports/${job.uuid}/log-download`, {}, token || undefined)
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, '_blank')
      } else {
        throw new Error('No download URL returned from server')
      }
    } catch (e) {
      console.error('Failed to get download URL', e)
      showToast('Failed to download document', true)
    }
  }


  const queueColumns: ColumnDef<any>[] = [
    {
      key: 'pm',
      label: 'Property Manager',
      render: (job) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px' }}>
            {job.pm?.businessName || `${job.pm?.firstName} ${job.pm?.lastName}`}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{job.pm?.email}</div>
        </div>
      ),
    },
    {
      key: 'document',
      label: 'Document File',
      render: (job) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--surface-hover)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {job.fileType?.toUpperCase()}
          </span>
          <button
            onClick={() => handleLogDownload(job)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--accent)',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            <Download size={14} /> {job.originalFileName}
          </button>
        </div>
      ),
    },
    {
      key: 'mode',
      label: 'Mode',
      render: (job) => (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'var(--surface-hover)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {job.mode === 'full' ? 'Full Portfolio' : 'Units'}
        </span>
      ),
    },
    {
      key: 'assignedAdmin',
      label: 'Assigned Agent',
      render: (job) =>
        job.assignedAdminName ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <UserCheck size={14} style={{ color: 'var(--success)' }} /> {job.assignedAdminName}
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
            Unassigned
          </span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (job) => {
        const isPending = job.status === 'PENDING_ASSIGNMENT'
        const isInProgress = job.status === 'IN_PROGRESS'
        const isStaged = job.status === 'STAGED_FOR_REVIEW'
        return (
          <>
            {isPending && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <AlertCircle size={14} /> Pending Claim
              </span>
            )}
            {isInProgress && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <Clock size={14} /> In Progress
              </span>
            )}
            {isStaged && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <CheckCircle2 size={14} /> Staged for PM
              </span>
            )}
            {job.status === 'COMPLETED' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--bg)',
                  color: 'var(--text-muted)',
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <CheckCircle2 size={14} /> Completed
              </span>
            )}
            {job.status === 'CANCELLED' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fee2e2',
                  color: '#dc2626',
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <AlertCircle size={14} /> Cancelled
              </span>
            )}
          </>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (job) => {
        const isPending = job.status === 'PENDING_ASSIGNMENT'
        const isInProgress = job.status === 'IN_PROGRESS'
        const isStaged = job.status === 'STAGED_FOR_REVIEW'
        const hasStagedData = !!job.stagedRowsJson
        const isOpen = activeMenuId === job.id

        return (
          <div className="action-menu-container" style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
            {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenuId(isOpen ? null : job.id)
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="More Actions"
                >
                  <MoreVertical size={16} />
                </button>

                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      zIndex: 999,
                      minWidth: '200px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {isPending && (
                      <button
                        onClick={() => {
                          setActiveMenuId(null)
                          handleClaim(job.uuid)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--dark)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <UserCheck size={15} style={{ color: '#2563eb' }} /> Claim Task
                      </button>
                    )}

                    {(isInProgress || isStaged) && (
                      <>
                        <button
                          onClick={() => {
                            setActiveMenuId(null)
                            navigate(`/bulk-imports/${job.uuid}`, { state: { job, forceUpload: true } })
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--dark)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <Upload size={15} style={{ color: '#2563eb' }} /> {hasStagedData ? 'Upload & Overwrite File' : 'Upload Spreadsheet'}
                        </button>

                        {hasStagedData && (
                          <button
                            onClick={() => {
                              setActiveMenuId(null)
                              navigate(`/bulk-imports/${job.uuid}`, { state: { job, forceEdit: true } })
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#15803d',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <Edit3 size={15} /> Edit Staged Data
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )
      },
    },
  ]

  const auditLogs = jobs.flatMap((j) =>
    (j.logs || []).map((l: any) => ({ ...l, fileName: j.originalFileName, jobId: j.id })),
  )

  const logColumns: ColumnDef<any>[] = [
    {
      key: 'agent',
      label: 'Agent',
      render: (log) => <strong>{log.adminEmail || 'System Agent'}</strong>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (log) => (
        <div>
          executed <code>{log.action}</code> on <em>{log.fileName}</em>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{log.details}</div>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (log) => (
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="page-container fade-in">
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
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Bulk Import Processing Queue
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Assist Property Managers with non-spreadsheet PDF/Image lease onboarding.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={fetchJobs}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'white',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Queue'}
          </button>

          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 4,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
            }}
          >
            <button
              onClick={() => setActiveTab('queue')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'queue' ? 'white' : 'transparent',
                color: activeTab === 'queue' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Clock size={14} /> Active Requests ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'logs' ? 'white' : 'transparent',
                color: activeTab === 'logs' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <History size={14} /> Audit Logs
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <DataTable
          data={jobs}
          columns={queueColumns}
          isLoading={loading}
          emptyTitle="No active bulk import requests."
          keyExtractor={(job) => job.id.toString()}
        />
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: 24,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            System Action Audit Logs
          </h3>
          <DataTable
            data={auditLogs}
            columns={logColumns}
            isLoading={loading}
            emptyTitle="No audit logs found."
            keyExtractor={(log) => `${log.jobId}-${log.createdAt}-${Math.random()}`}
          />
        </div>
      )}


    </div>
  )
}

