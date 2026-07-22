import React, { useState, useEffect } from 'react'
import { FileSpreadsheet, Download, Upload, UserCheck, Clock, CheckCircle2, History, AlertCircle, RefreshCcw } from 'lucide-react'
import * as XLSX from 'xlsx'
import { PreviewGridPhase } from '../components/data-import-grid/PreviewGridPhase'
import { FULL_COLUMNS, UNIT_COLUMNS, type ColumnDef } from '../components/data-import-grid/types'
import { validateCell } from '../components/data-import-grid/utils'
import { apiService } from '../services/api.service'

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
  const [editingCell, setEditingCell] = useState<{ rowId: string, field: string } | null>(null)
  
  const columns = selectedJob?.mode === 'units' ? UNIT_COLUMNS : FULL_COLUMNS

  useEffect(() => {
    if (selectedJob && selectedJob.stagedRowsJson) {
      try {
        const parsed = typeof selectedJob.stagedRowsJson === 'string' 
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
      alert('Task claimed successfully!')
      fetchJobs()
    } catch (e) {
      console.error(e)
      alert('Failed to claim task')
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
      await apiService.post(`/admin/bulk-imports/${selectedJob.id}/stage`, { 
        stagedRowsJson: JSON.stringify(previewRows) 
      }, token || undefined)

      alert('Data successfully staged for PM review!')
      setSelectedJob(null)
      setPreviewRows([])
      fetchJobs()
    } catch (e) {
      console.error(e)
      alert('Error saving staged data')
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
          columns.forEach(col => {
            row[col.key] = d[col.key] || d[col.label] || ''
          })
          return row
        })
        
        setPreviewRows(rows)
        revalidateDuplicates(rows)
      } catch (err) {
        console.error(err)
        alert('Error parsing Excel file')
      }
    }
    reader.readAsBinaryString(file)
  }

  const revalidateDuplicates = (rows: any[]) => {
    const errors: Record<string, string> = {}
    
    rows.forEach((row, i) => {
      // Basic empty validation
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

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={28} color="#2563eb" /> Bulk Import Processing Queue
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Assist Property Managers with non-spreadsheet PDF/Image lease onboarding.
          </p>
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
          
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #cbd5e1' }}>
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
              gap: 6
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
              gap: 6
            }}
          >
            <History size={14} /> Audit Logs
          </button>
        </div>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '14px 18px' }}>Property Manager</th>
                <th style={{ padding: '14px 18px' }}>Document File</th>
                <th style={{ padding: '14px 18px' }}>Mode</th>
                <th style={{ padding: '14px 18px' }}>Assigned Agent</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const isPending = job.status === 'PENDING_ASSIGNMENT'
                const isInProgress = job.status === 'IN_PROGRESS'
                const isStaged = job.status === 'STAGED_FOR_REVIEW'

                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.pm?.businessName || `${job.pm?.firstName} ${job.pm?.lastName}`}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{job.pm?.email}</div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#e2e8f0', fontSize: 11, fontWeight: 700 }}>{job.fileType?.toUpperCase()}</span>
                        <a onClick={() => handleLogDownload(job)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                          <Download size={14} /> {job.originalFileName}
                        </a>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 600 }}>
                        {job.mode === 'full' ? 'Full Portfolio' : 'Units'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {job.assignedAdminName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0f172a' }}>
                          <UserCheck size={14} color="#10b981" /> {job.assignedAdminName}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {isPending && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}><AlertCircle size={14} /> Pending Claim</span>}
                      {isInProgress && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}><Clock size={14} /> In Progress</span>}
                      {isStaged && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}><CheckCircle2 size={14} /> Staged for PM</span>}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {isPending && (
                          <button onClick={() => handleClaim(job.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                            <UserCheck size={14} /> Claim Task
                          </button>
                        )}
                        {(isInProgress || isStaged) && (
                          <button
                            onClick={() => setSelectedJob(job)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                          >
                            <Upload size={14} /> Upload/Edit Staged JSON Data
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>System Action Audit Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs.flatMap(j => (j.logs || []).map((l: any) => ({ ...l, fileName: j.originalFileName }))).map((log: any, idx: number) => (
              <div key={idx} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <div>
                  <strong>{log.adminEmail || 'System Agent'}</strong> executed <code>{log.action}</code> on <em>{log.fileName}</em>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{log.details}</div>
                </div>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON Data Staging Drawer / Modal */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', width: '90vw', maxWidth: 1200, maxHeight: '90vh', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Stage Data for {selectedJob.originalFileName}</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, marginTop: 4 }}>
                  Upload the formatted Excel sheet. Review the structured data below, make any edits, and save it for the PM.
                </p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                <Upload size={16} /> Upload Excel Sheet
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {previewRows.length > 0 ? (
              <div style={{ flex: 1, minHeight: 400, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
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
              <div style={{ flex: 1, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc' }}>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>Upload an Excel file to see the data grid preview.</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => { setSelectedJob(null); setPreviewRows([]); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSaveStagedRows} disabled={previewRows.length === 0} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, opacity: previewRows.length === 0 ? 0.5 : 1 }}>
                Save & Stage for PM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
