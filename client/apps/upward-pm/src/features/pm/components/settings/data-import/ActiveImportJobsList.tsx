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
              className="import-job-card"
              style={{ borderLeft: borderLeftColor }}
            >

              <div className="import-job-card__main">
                <div className="import-job-card__icon">
                  {job.fileType?.toUpperCase() || 'FILE'}
                </div>

                <div className="import-job-card__details">
                  <div className="import-job-card__title-row">
                    <span className="import-job-card__title">{job.originalFileName}</span>
                    
                    {isPending && (
                      <span className="import-job-badge import-job-badge--pending">
                        <Clock size={12} /> Processing (~48hrs)
                      </span>
                    )}

                    {isReady && (
                      <span className="import-job-badge import-job-badge--ready">
                        <AlertCircle size={12} /> Ready for Review
                      </span>
                    )}

                    {isCompleted && (
                      <span className="import-job-badge import-job-badge--completed">
                        <CheckCircle2 size={12} /> Imported
                      </span>
                    )}
                  </div>

                  <div className="import-job-card__meta">
                    <span>Uploaded {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="import-job-card__actions">
                {isReady && (
                  <button
                    type="button"
                    className="btn btn--primary import-job-btn"
                    onClick={() => onOpenReviewModal(job)}
                  >
                    <Eye size={15} /> Preview Prepared Data
                  </button>
                )}

                {isPending && (
                  <span className="import-job-status-text">
                    Support team transcribing...
                  </span>
                )}
                
                {onDeleteJob && (
                  <button
                    type="button"
                    className="import-job-delete-btn"
                    onClick={() => onDeleteJob(job.uuid)}
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
