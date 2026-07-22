import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Upload, ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { FULL_COLUMNS, UNIT_COLUMNS } from '../components/data-import-grid/types'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { useDataImport } from '../components/data-import-grid/useDataImport'
import { ImportOverlay } from '../components/data-import-grid/ImportOverlay'

interface BulkImportDetailProps {
  token: string
}

export const BulkImportDetail: React.FC<BulkImportDetailProps> = ({ token }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { uuid } = useParams()
  
  const [selectedJob, setSelectedJob] = useState<any | null>(location.state?.job || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const mode = selectedJob?.mode === 'units' ? 'units' : 'full'
  const columns = mode === 'units' ? UNIT_COLUMNS : FULL_COLUMNS

  const importState = useDataImport(columns, mode, [], '')

  const forceUpload = location.state?.forceUpload
  const forceEdit = location.state?.forceEdit

  useEffect(() => {
    if (!selectedJob) {
      navigate('/bulk-imports')
      return
    }

    // If 'Edit Staged Data' was clicked or job already has staged data and not forcing a re-upload
    if (selectedJob.stagedRowsJson && !forceUpload) {
      try {
        const existingRows = typeof selectedJob.stagedRowsJson === 'string'
          ? JSON.parse(selectedJob.stagedRowsJson)
          : selectedJob.stagedRowsJson

        if (Array.isArray(existingRows) && existingRows.length > 0) {
          importState.setPreviewRows(existingRows)
          importState.revalidateDuplicates(existingRows)
          importState.setPhase('preview')
          importState.setIsOverlayOpen(true)
        }
      } catch (e) {
        console.error('Failed to parse existing staged rows:', e)
      }
    }
  }, [selectedJob, navigate, forceUpload])

  const handleConfirmImport = async () => {
    if (!selectedJob) return
    try {
      await apiService.post(
        `/admin/bulk-imports/${selectedJob.uuid}/stage`,
        {
          stagedRowsJson: JSON.stringify(importState.previewRows),
        },
        token || undefined,
      )

      showToast('Data successfully staged for PM review!')
      importState.setIsOverlayOpen(false)
      navigate('/bulk-imports')
    } catch (e) {
      console.error(e)
      showToast('Error saving staged data', true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      importState.handleFileUpload(e, fileInputRef)
    } else {
      showToast('Only CSV and Excel files are supported.', true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!selectedJob) return null

  return (
    <div className="page-container fade-in" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/bulk-imports')}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 6, 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-muted)', 
          cursor: 'pointer', 
          fontSize: 13,
          fontWeight: 600,
          padding: 0,
          marginBottom: 24,
          alignSelf: 'flex-start'
        }}
      >
        <ArrowLeft size={14} /> Back to Queue
      </button>

      <div style={{ marginBottom: 32 }}>
        <h1 className="section-title" style={{ margin: 0, fontSize: 24 }}>
          Stage Data for {selectedJob.originalFileName}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, marginTop: 4 }}>
          Upload the formatted Excel sheet. Review the structured data below, make any edits, and save it for the PM.
        </p>
      </div>

      {/* Clean Dropzone Upload Box */}
      <div 
        style={{ 
          border: '2px dashed var(--border)', 
          borderRadius: 20, 
          padding: '60px 32px', 
          textAlign: 'center', 
          background: 'white',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--border)' }}>
          <FileSpreadsheet size={28} style={{ color: '#2563eb' }} />
        </div>
        
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
          Upload document or spreadsheet
        </h3>
        
        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.5 }}>
          Drag and drop the file here or click to browse. Supports Excel (.xlsx, .csv) for direct import.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <label className="btn btn-primary" style={{ borderRadius: 12, padding: '12px 28px', height: 44, cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} /> Select File
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileSelect} ref={fileInputRef}/>
          </label>
        </div>
      </div>

      {importState.isOverlayOpen && (
        <ImportOverlay 
          {...importState}
          closeOverlay={() => {
            importState.closeOverlay()
            navigate('/bulk-imports')
          }}
          mode={mode}
          columns={columns}
          isPending={false}
          isEditMode={!!forceEdit || (!forceUpload && !!selectedJob?.stagedRowsJson)}
          handleConfirmImport={handleConfirmImport}
        />
      )}
    </div>
  )
}
