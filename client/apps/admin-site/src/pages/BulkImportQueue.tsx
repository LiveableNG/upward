import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { PreviewGridPhase } from '../components/data-import-grid/PreviewGridPhase'
import { FULL_COLUMNS, UNIT_COLUMNS } from '../components/data-import-grid/types'
import { validateCell } from '../components/data-import-grid/utils'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'

interface BulkImportQueueProps {
  token: string
}

export const BulkImportQueue: React.FC<BulkImportQueueProps> = ({ token }) => {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'logs'>('queue')

  // Grid State
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)

  const columns = selectedJob?.mode === 'units' ? UNIT_COLUMNS : FULL_COLUMNS

  useEffect(() => {
    if (selectedJob && selectedJob.stagedRowsJson) {
      try {
        const parsed =
          typeof selectedJob.stagedRowsJson === 'string'
            ? JSON.parse(selectedJob.stagedRowsJson)
            : selectedJob.stagedRowsJson
        setPreviewRows(parsed)
        // Optionally revalidate here, but it requires the function to be defined or hoisted.
        // We can just rely on the manual revalidation logic when they upload/edit.
      } catch (e) {
        setPreviewRows([])
      }
    } else {
      setPreviewRows([])
    }
  }, [selectedJob])

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

  const handleClaim = async (jobId: number) => {
    try {
      await apiService.post(`/admin/bulk-imports/${jobId}/claim`, {}, token || undefined)
      showToast('Task claimed successfully!')
      fetchJobs()
    } catch (e) {
      console.error(e)
      showToast('Failed to claim task', true)
    }
  }

  const handleLogDownload = async (job: any) => {
    try {
      await apiService.post(`/admin/bulk-imports/${job.id}/log-download`, {}, token || undefined)
    } catch (e) {}

    // For file downloads, we can't easily use apiService since it expects JSON.
    // We'll use the BASE_URL from import.meta.env manually or just rely on relative path if proxy is working.
    // However, since it opens in a new tab, it MUST be the full backend URL if proxy isn't used in Vite.
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
    window.open(`${backendUrl}/public/documents/relays/${job.uuid}/download`, '_blank')
  }

  const handleSaveStagedRows = async () => {
    try {
      await apiService.post(
        `/admin/bulk-imports/${selectedJob.id}/stage`,
        {
          stagedRowsJson: JSON.stringify(previewRows),
        },
        token || undefined,
      )

      showToast('Data successfully staged for PM review!')
      setSelectedJob(null)
      setPreviewRows([])
      fetchJobs()
    } catch (e) {
      console.error(e)
      showToast('Error saving staged data', true)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        // Convert array of objects to row format
        const rows = data.map((d: any, i: number) => {
          const row: any = { id: `row-${Date.now()}-${i}` }
          columns.forEach((col) => {
            row[col.key] = d[col.key] || d[col.label] || ''
          })
          return row
        })

        setPreviewRows(rows)
        revalidateDuplicates(rows)
      } catch (err) {
        console.error(err)
        showToast('Error parsing Excel file', true)
      }
    }
    reader.readAsBinaryString(file)
  }

  const revalidateDuplicates = (rows: any[]) => {
    const errors: Record<string, string> = {}

    rows.forEach((row) => {
      // Basic empty validation
      columns.forEach((col) => {
        validateCell(
          row.id,
          col.key,
          row[col.key],
          col,
          columns,
          row,
          rows,
          setValidationErrors,
          true,
        )
      })
    })

    setValidationErrors(errors)
  }

  const updateRowField = (rowId: string, field: string, value: any) => {
    setPreviewRows((prev) => {
      const updated = prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
      validateCell(
        rowId,
        field,
        value,
        undefined,
        columns,
        updated.find((r) => r.id === rowId),
        updated,
        setValidationErrors,
      )
      return updated
    })
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
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {isPending && (
              <button
                onClick={() => handleClaim(job.id)}
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', gap: '6px' }}
              >
                <UserCheck size={14} /> Claim Task
              </button>
            )}
            {(isInProgress || isStaged) && (
              <button
                onClick={() => setSelectedJob(job)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', gap: '6px' }}
              >
                <Upload size={14} /> Upload/Edit Staged JSON Data
              </button>
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

      {/* JSON Data Staging Drawer / Modal */}
      {selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: 'white',
              width: '90vw',
              maxWidth: 1200,
              maxHeight: '90vh',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Stage Data for {selectedJob.originalFileName}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, marginTop: 4 }}>
                  Upload the formatted Excel sheet. Review the structured data below, make any
                  edits, and save it for the PM.
                </p>
              </div>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#0f172a',
                }}
              >
                <Upload size={16} /> Upload Excel Sheet
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {previewRows.length > 0 ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 400,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
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
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 8,
                  background: '#f8fafc',
                }}
              >
                <p style={{ color: '#94a3b8', fontSize: 14 }}>
                  Upload an Excel file to see the data grid preview.
                </p>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                onClick={() => {
                  setSelectedJob(null)
                  setPreviewRows([])
                }}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStagedRows}
                disabled={previewRows.length === 0}
                style={{
                  padding: '8px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  opacity: previewRows.length === 0 ? 0.5 : 1,
                }}
              >
                Save & Stage for PM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
