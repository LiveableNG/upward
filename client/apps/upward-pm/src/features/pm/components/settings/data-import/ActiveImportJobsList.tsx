import React from 'react'
import { Clock, CheckCircle2, FileText, Eye, AlertCircle, Trash2 } from 'lucide-react'
import { DataTable, Column } from '@/components/common/DataTable'

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
  fileUrl?: string
}

interface ActiveImportJobsListProps {
  jobs: ImportJob[]
  onOpenReviewModal: (job: ImportJob) => void
  onDeleteJob?: (jobUuid: string) => void
}

export const ActiveImportJobsList: React.FC<ActiveImportJobsListProps> = ({ jobs, onOpenReviewModal, onDeleteJob }) => {
  if (!jobs || jobs.length === 0) return null

  const columns: Column<ImportJob>[] = [
    {
      header: 'FILE / NAME',
      render: (job) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--dark)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: 'var(--bg)', borderRadius: 4, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {job.fileType?.toUpperCase() || 'FILE'}
          </span>
          {job.originalFileName}
        </div>
      )
    },
    {
      header: 'DATE',
      render: (job) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'STATUS',
      render: (job) => {
        const isSelfDraft = job.fileUrl === 'self_import_draft' || job.fileUrl === 'self_onboarding_draft'
        const isPending = !isSelfDraft && (job.status === 'PENDING_ASSIGNMENT' || job.status === 'IN_PROGRESS')
        const isReady = job.status === 'STAGED_FOR_REVIEW'
        const isCompleted = job.status === 'COMPLETED'

        if (isSelfDraft) {
          return (
            <span style={{ background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              <Clock size={12} /> Saved Draft
            </span>
          )
        }
        if (isPending) {
          return (
            <span style={{ background: '#fef3c7', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              <Clock size={12} /> Processing (~48hrs)
            </span>
          )
        }
        if (isReady) {
          return (
            <span style={{ background: 'var(--forest-faint)', color: 'var(--forest)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              <AlertCircle size={12} /> Ready for Review
            </span>
          )
        }
        if (isCompleted) {
          return (
            <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              <CheckCircle2 size={12} /> Imported
            </span>
          )
        }
        return null
      }
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (job) => {
        const isSelfDraft = job.fileUrl === 'self_import_draft' || job.fileUrl === 'self_onboarding_draft'
        const isPending = !isSelfDraft && (job.status === 'PENDING_ASSIGNMENT' || job.status === 'IN_PROGRESS')
        const isReady = job.status === 'STAGED_FOR_REVIEW'

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }} onClick={e => e.stopPropagation()}>
            {isSelfDraft && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                style={{ height: 30, borderRadius: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => onOpenReviewModal(job)}
              >
                <Eye size={13} /> Resume Import
              </button>
            )}

            {isReady && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                style={{ height: 30, borderRadius: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => onOpenReviewModal(job)}
              >
                <Eye size={13} /> Review Data
              </button>
            )}

            {isPending && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Support team transcribing...
              </span>
            )}

            {onDeleteJob && (
              <button
                type="button"
                onClick={() => onDeleteJob(job.uuid)}
                style={{ background: 'none', border: 'none', padding: 4, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                title="Delete request"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )
      }
    }
  ]

  const renderMobileCard = (job: ImportJob) => {
    const isSelfDraft = job.fileUrl === 'self_import_draft' || job.fileUrl === 'self_onboarding_draft'
    const isPending = !isSelfDraft && (job.status === 'PENDING_ASSIGNMENT' || job.status === 'IN_PROGRESS')
    const isReady = job.status === 'STAGED_FOR_REVIEW'
    const isCompleted = job.status === 'COMPLETED'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', background: 'var(--bg)', borderRadius: 4, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {job.fileType?.toUpperCase() || 'FILE'}
            </span>
            {job.originalFileName}
          </div>
          {onDeleteJob && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDeleteJob(job.uuid) }}
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2 }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
          <span>Uploaded {new Date(job.createdAt).toLocaleDateString()}</span>
          <div>
            {isSelfDraft && (
              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                <Clock size={11} /> Saved Draft
              </span>
            )}
            {isPending && (
              <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                <Clock size={11} /> Processing
              </span>
            )}
            {isReady && (
              <span style={{ background: 'var(--forest-faint)', color: 'var(--forest)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                <AlertCircle size={11} /> Ready
              </span>
            )}
            {isCompleted && (
              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                <CheckCircle2 size={11} /> Imported
              </span>
            )}
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          {isSelfDraft && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              style={{ width: '100%', height: 32, borderRadius: 8, fontSize: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onOpenReviewModal(job)}
            >
              <Eye size={13} /> Resume Import
            </button>
          )}
          {isReady && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              style={{ width: '100%', height: 32, borderRadius: 8, fontSize: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onOpenReviewModal(job)}
            >
              <Eye size={13} /> Review Data
            </button>
          )}
          {isPending && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
              Support team transcribing...
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={16} style={{ color: 'var(--clay)' }} /> Active Imports &amp; Saved Drafts
      </h3>

      <DataTable
        columns={columns}
        data={jobs}
        keyExtractor={(job) => job.uuid}
        renderMobileCard={renderMobileCard}
        pageSize={10}
      />
    </div>
  )
}
