import React from 'react'
import { Clock, CheckCircle2, FileText, Mail, User, Eye, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImportJob {
  id: number
  uuid: string
  originalFileName: string
  fileType: string
  status: 'PENDING_ASSIGNMENT' | 'IN_PROGRESS' | 'STAGED_FOR_REVIEW' | 'COMPLETED' | 'CANCELLED'
  assignedAdminName?: string
  assignedAdminEmail?: string
  stagedRowsJson?: string
  createdAt: string
  mode: string
}

interface ActiveImportJobsListProps {
  jobs: ImportJob[]
  onOpenReviewModal: (job: ImportJob) => void
  onDeleteJob?: (jobUuid: string) => void
}

export const ActiveImportJobsList: React.FC<ActiveImportJobsListProps> = ({ jobs, onOpenReviewModal, onDeleteJob }) => {
  if (!jobs || jobs.length === 0) return null

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={18} style={{ color: 'var(--clay)' }} /> Assisted Upload Requests ({jobs.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {jobs.map(job => {
          const isPending = job.status === 'PENDING_ASSIGNMENT' || job.status === 'IN_PROGRESS'
          const isReady = job.status === 'STAGED_FOR_REVIEW'
          const isCompleted = job.status === 'COMPLETED'

          let borderLeftColor = '4px solid var(--clay)'
          if (isReady) borderLeftColor = '4px solid var(--forest)'
          else if (isPending) borderLeftColor = '4px solid #f59e0b'

          return (
            <div
              key={job.id}
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                borderLeft: borderLeftColor
              }}
            >

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)', fontWeight: 700, fontSize: 12 }}>
                  {job.fileType?.toUpperCase() || 'FILE'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>{job.originalFileName}</span>
                    
                    {isPending && (
                      <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Processing (~48hrs)
                      </span>
                    )}

                    {isReady && (
                      <span style={{ background: 'var(--forest-faint, #dcfce7)', color: 'var(--forest, #15803d)', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> Ready for Review
                      </span>
                    )}

                    {isCompleted && (
                      <span style={{ background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Imported
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span>Uploaded {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isReady && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onOpenReviewModal(job)}
                    style={{ borderRadius: 10, padding: '8px 18px', height: 38, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={15} /> Preview Prepared Data
                  </button>
                )}

                {isPending && (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Support team transcribing...
                  </span>
                )}
                
                {onDeleteJob && (
                  <button
                    type="button"
                    onClick={() => onDeleteJob(job.uuid)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Delete Job"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
