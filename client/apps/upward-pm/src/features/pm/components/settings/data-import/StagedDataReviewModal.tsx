import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import type { ImportJob } from './ActiveImportJobsList'
import type { ColumnDef } from './types'
import { CheckCircle2, User, Mail, AlertCircle, Save } from 'lucide-react'
import { PreviewGridPhase } from './PreviewGridPhase'
import { validateCell } from './utils'
import { useQueryClient } from '@tanstack/react-query'

interface StagedDataReviewModalProps {
  isOpen: boolean
  job: ImportJob | null
  columns: ColumnDef[]
  onClose: () => void
  onConfirm: (stagedRows: any[]) => void
  isSubmitting?: boolean
}

export const StagedDataReviewModal: React.FC<StagedDataReviewModalProps> = ({
  isOpen,
  job,
  columns,
  onClose,
  onConfirm,
  isSubmitting = false
}) => {
  const queryClient = useQueryClient()
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [editingCell, setEditingCell] = useState<{ rowId: string, field: string } | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  useEffect(() => {
    if (isOpen && job?.stagedRowsJson) {
      try {
        const rows = typeof job.stagedRowsJson === 'string' ? JSON.parse(job.stagedRowsJson) : job.stagedRowsJson
        setPreviewRows(rows)
        revalidateDuplicates(rows)
      } catch (e) {
        console.error('Error parsing staged rows', e)
      }
    } else if (!isOpen) {
      setPreviewRows([])
      setValidationErrors({})
      setEditingCell(null)
    }
  }, [isOpen, job])

  if (!job) return null

  const revalidateDuplicates = (rows: any[]) => {
    const errors: Record<string, string> = {}
    rows.forEach((row) => {
      columns.forEach(col => {
        validateCell(row.id, col.key, row[col.key], col, columns, row, rows, setValidationErrors, true)
      })
    })
    setValidationErrors(errors)
  }

  const updateRowField = (rowId: string, field: string, value: any) => {
    setPreviewRows(prev => {
      const updated = prev.map(r => r.id === rowId ? { ...r, [field]: value } : r)
      validateCell(rowId, field, value, undefined, columns, updated.find(r => r.id === rowId), updated, setValidationErrors)
      return updated
    })
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    try {
      const res = await fetch(`/api/pm/bulk-imports/${job.id}/staged-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagedRowsJson: JSON.stringify(previewRows) })
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['pmImportJobs'] })
        alert('Draft saved! The support agent can now see your changes.')
      } else {
        alert('Failed to save draft.')
      }
    } catch (e) {
      alert('Error saving draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Prepared Data"
      subtitle="Review and edit structured data transcribed by Upward Support"
      icon={CheckCircle2}
      maxWidth={1200}
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ flex: 1, height: 44, borderRadius: 10 }}
            onClick={onClose}
            disabled={isSubmitting || isSavingDraft}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ flex: 1, height: 44, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f8fafc', border: '1px solid #cbd5e1' }}
            onClick={handleSaveDraft}
            disabled={isSubmitting || isSavingDraft || previewRows.length === 0}
          >
            <Save size={16} /> {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ flex: 1, height: 44, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => onConfirm(previewRows)}
            disabled={isSubmitting || isSavingDraft || previewRows.length === 0}
          >
            {isSubmitting ? 'Confirming Import...' : 'Approve & Finalize Import'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Support Agent Info Card */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 16, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Transcribed By Upward Support Agent
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <User size={16} style={{ color: 'var(--clay)' }} /> {job.assignedAdminName || 'Customer Support Agent'}
              </span>
              {job.assignedAdminEmail && (
                <button 
                  onClick={() => window.open(`mailto:${job.assignedAdminEmail}?subject=Re: Data Import (${job.originalFileName})`)}
                  style={{ fontSize: 13, color: 'var(--clay)', fontWeight: 600, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}
                >
                  <Mail size={14} /> Message Support
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div style={{ minHeight: 400, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <PreviewGridPhase
            columns={columns}
            previewRows={previewRows}
            validationErrors={validationErrors}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            updateRowField={updateRowField}
            setPreviewRows={setPreviewRows}
            setValidationErrors={setValidationErrors}
            revalidateDuplicates={revalidateDuplicates}
          />
        </div>
      </div>
    </Modal>
  )
}
