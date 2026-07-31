'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Download, Upload } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useBulkCreateUnits, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { downloadBlob } from '@/lib/download-helper'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { api } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'

import { ImportMode, FULL_COLUMNS, UNIT_COLUMNS } from './data-import/types'
import { useDataImport } from './data-import/useDataImport'
import { parseDateString } from './data-import/utils'
import { ImportOverlay } from './data-import/ImportOverlay'
import { RelayConfirmationModal } from './data-import/RelayConfirmationModal'
import { ActiveImportJobsList } from './data-import/ActiveImportJobsList'
import { Modal } from '@/components/ui/Modal/Modal'
import { AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'


export const DataImportTab: React.FC = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as ImportMode) || 'full'
  
  const [mode, setMode] = useState<ImportMode>(initialMode)
  
  useEffect(() => {
    const m = searchParams.get('mode')
    if (m === 'full' || m === 'units') {
      setMode(m as ImportMode)
    }
  }, [searchParams])
  
  const { success, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkCreateUnitsMutation = useBulkCreateUnits()
  const bulkFullImportMutation = useBulkFullImport()

  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const columns = useMemo(() => mode === 'full' ? FULL_COLUMNS : UNIT_COLUMNS, [mode])

  const importState = useDataImport(columns, mode, properties, targetPropertyUuid)

  const propertyOptions = useMemo(() => {
    return properties.map((p: any) => ({
      label: p.name,
      value: p.uuid
    }))
  }, [properties])

  const handleDownloadTemplate = () => {
    const exportColumns = columns.filter(c => 
      c.key !== 'unitRentDueDate' && 
      c.key !== 'rentDueDate'
    );
    const headers = exportColumns.map(c => c.label)
    
    const rows = mode === 'full' ?[
        ['Maple Residences', '18 Freedom Way, Lekki Phase 1', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Michael', 'Adebayo', 'michael.adebayo@landlord.com', '+2348012345678', '', 'Daniel', 'Okafor', 'daniel.okafor@email.com', '+2348031112233', 'Flat B3', '4200000', '4200000', 'Annually', '', 'NGN', '2025-01-15', '420000', '3-bedroom apartment', 'Flat / Apartment'],
        ['The Oak Apartments', '7 Prince Ade Odedina Street, Victoria Island', 'Residential', 'Nigeria', 'Lagos', 'Victoria Island', 'Grace', 'Johnson', 'grace.johnson@landlord.com', '+2348023456789', '', 'Sarah', 'Williams', 'sarah.williams@email.com', '+2348056677889', 'Unit 5C', '650000', '650000', 'Monthly', '', 'NGN', '2025-02-01', '65000', 'Luxury serviced apartment', 'Flat / Apartment'],
        ['Atlantic Business Hub', '22 Adeola Odeku Street, Victoria Island', 'Commercial', 'Nigeria', 'Lagos', 'Victoria Island', 'David', 'Ogunleye', 'david.ogunleye@landlord.com', '+2348034567890', 'TechNova Solutions Ltd', '', '', 'admin@technova.com', '+2348078899001', 'Office 401', '24000000', '24000000', 'Lease', '5', 'NGN', '2025-03-01', '2400000', '5-year commercial office lease', 'Office Space']
      ] : [
      ['101', '', 'John', 'Doe', 'john@example.com', '+2348012345678', '2400000', '2400000', '2024-01-01', 'Annually', '', '240000', 'NGN', 'Annual tenant', 'Flat / Apartment'],
      ['102', '', 'Jane', 'Smith', 'jane@example.com', '+2348012345679', '200000', '200000', '2024-02-01', 'Monthly', '', '20000', 'NGN', 'Monthly tenant', 'Flat / Apartment'],
      ['103', 'XYZ Biz', '', '', 'contact@xyz.com', '+2348012345680', '5000000', '5000000', '2024-03-01', 'Lease', '5', '500000', 'NGN', '5-year lease', 'Office Space']
    ]

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `upward_${mode}_import_template.csv`).then(() => {
      success('Template downloaded successfully!')
    }).catch((err: any) => console.error(err))
  }

  const parseBackendError = (message: string): string => {
    if (!message) return 'Failed to import data'
    
    // Parse nested class-validator messages like "rows.0.unitRentAmountPaid must be a number"
    if (message.includes('rows.')) {
      const parts = message.split(',').map(p => p.trim())
      const formattedParts = parts.slice(0, 3).map(part => {
        const match = part.match(/rows\.(\d+)\.([a-zA-Z0-9_]+)\s+(.+)/)
        if (match) {
          const rowNum = parseInt(match[1], 10) + 1
          const fieldKey = match[2]
          const restOfError = match[3]
          const colLabel = columns.find(c => c.key === fieldKey)?.label || fieldKey
          return `Row ${rowNum}: ${colLabel} ${restOfError}`
        }
        return part
      })

      const extraCount = parts.length > 3 ? parts.length - 3 : 0
      return formattedParts.join('\n') + (extraCount > 0 ? `\n...and ${extraCount} more issue(s)` : '')
    }
    return message
  }

  const handleConfirmImport = () => {
    if (importState.previewRows.length === 0) return error("No data to import")
    if (Object.keys(importState.validationErrors).length > 0) {
      const firstErrorKey = Object.keys(importState.validationErrors)[0]
      const [rowId, field] = firstErrorKey.split('-')
      const rowIndex = importState.previewRows.findIndex(r => r.id === rowId)
      const colLabel = columns.find(c => c.key === field)?.label || field
      return error(`Error at Row ${rowIndex + 1}, Column "${colLabel}": ${importState.validationErrors[firstErrorKey]}`)
    }

    const sanitizeRow = (row: any) => {
      const clean: any = {}
      columns.forEach(col => {
        const val = row[col.key]
        if (val !== undefined && val !== '') {
          if (col.type === 'number') {
            const parsed = parseFloat(val)
            clean[col.key] = isNaN(parsed) ? val : parsed
          } else {
            clean[col.key] = val
          }
        }
      })
      return clean
    }

    if (mode === 'full') {
      const rowsToSend = importState.previewRows.map(sanitizeRow)
      bulkFullImportMutation.mutate({ rows: rowsToSend }, {
        onSuccess: (res) => {
          success(`Imported ${res.unitsCreated} units across ${res.propertiesCreated} properties!`)
          importState.setIsOverlayOpen(false)
          router.push('/properties')
        },
        onError: (err: any) => error(parseBackendError(err?.message || 'Failed to import data'))
      })
    } else {
      const unitsToSend = importState.previewRows.map(sanitizeRow)
      bulkCreateUnitsMutation.mutate({ propertyUuid: targetPropertyUuid, units: unitsToSend } as any, {
        onSuccess: () => {
          success('Units imported successfully!')
          importState.setIsOverlayOpen(false)
          router.push('/properties')
        },
        onError: (err: any) => error(parseBackendError(err?.message || 'Failed to import units'))
      })
    }
  }
  const [pendingRelayFile, setPendingRelayFile] = useState<File | null>(null)
  const [showRelayModal, setShowRelayModal] = useState(false)
  const [isRelaying, setIsRelaying] = useState(false)
  
  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [reviewJob, setReviewJob] = useState<any | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [hasDirtyEdits, setHasDirtyEdits] = useState(false)

  const socket = useSocket()

  const fetchJobs = async () => {
    try {
      const jobs = await api.get('/pm/bulk-imports')
      setActiveJobs(jobs)
    } catch (err) {
      console.error('Failed to fetch bulk import jobs:', err)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleJobUpdated = () => {
      fetchJobs()
    }

    socket.on('bulk_import_updated', handleJobUpdated)
    return () => {
      socket.off('bulk_import_updated', handleJobUpdated)
    }
  }, [socket])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (
      ext === 'csv' ||
      ext === 'xlsx' ||
      ext === 'xls' ||
      ext === 'xlsm' ||
      ext === 'xlsb' ||
      ext === 'xltx' ||
      ext === 'xltm'
    ) {
      importState.handleFileUpload(e, fileInputRef)
    } else {
      setPendingRelayFile(file)
      setShowRelayModal(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmRelay = async () => {
    if (!pendingRelayFile) return
    setIsRelaying(true)
    const ext = pendingRelayFile.name.split('.').pop()?.toLowerCase() || 'doc'

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const base64Data = (e.target?.result as string).split(',')[1]

        const { fileKey } = await api.post('/pm/bulk-imports/relay-upload', {
          fileName: pendingRelayFile.name,
          contentType: pendingRelayFile.type || 'application/octet-stream',
          base64Data,
        })

        const newJob = await api.post('/pm/bulk-imports/relay', {
          targetPropertyUuid,
          mode,
          originalFileName: pendingRelayFile.name,
          fileUrl: fileKey,
          fileType: ext,
        })

      setActiveJobs(prev => [newJob, ...prev])
      setShowRelayModal(false)
      setPendingRelayFile(null)
        success('Document sent to Customer Support team! We will notify you once processed (~48hrs).')
      } catch (err) {
        error('Failed to submit document relay request.')
      } finally {
        setIsRelaying(false)
      }
    }
    reader.onerror = () => {
      error('Failed to read file.')
      setIsRelaying(false)
    }
    reader.readAsDataURL(pendingRelayFile)
  }

  const handleSaveDraft = async () => {
    if (!reviewJob) return
    setIsSavingDraft(true)
    try {
      await api.patch(`/pm/bulk-imports/${reviewJob.uuid}/staged-data`, {
        stagedRowsJson: JSON.stringify(importState.previewRows)
      })
      queryClient.invalidateQueries({ queryKey: ['pmImportJobs'] })
      setHasDirtyEdits(false)
      success('Draft saved! The support agent can now see your changes.')
    } catch (e: any) {
      console.error(e)
      error(e?.message || 'Failed to save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleOpenReviewModal = (job: any) => {
    setReviewJob(job)
    try {
      const rows = typeof job.stagedRowsJson === 'string' ? JSON.parse(job.stagedRowsJson) : job.stagedRowsJson
      
      const cleanRows = rows.map((r: any) => {
        if (r.tenantPhone && typeof r.tenantPhone === 'string' && r.tenantPhone.startsWith('+234234')) {
          r.tenantPhone = r.tenantPhone.replace('+234234', '+234')
        }
        if (r.landlordPhone && typeof r.landlordPhone === 'string' && r.landlordPhone.startsWith('+234234')) {
          r.landlordPhone = r.landlordPhone.replace('+234234', '+234')
        }
        columns.forEach(col => {
          if (col.type === 'date' && r[col.key]) {
            r[col.key] = parseDateString(r[col.key])
          }
        })
        return r
      })

      importState.setPreviewRows(cleanRows)
      importState.setPhase('preview')
      importState.setIsOverlayOpen(true)
      setHasDirtyEdits(false)
    } catch (e) {
      console.error(e)
    }
  }

  const [jobToDelete, setJobToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteJob = (jobUuid: string) => {
    setJobToDelete(jobUuid)
  }

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return
    setIsDeleting(true)
    try {
      await api.delete(`/pm/bulk-imports/${jobToDelete}`)
      setActiveJobs(prev => prev.filter(j => j.uuid !== jobToDelete))
      success('Job deleted successfully')
      setJobToDelete(null)
    } catch (err) {
      error('Failed to delete job')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleApproveStagedImport = (stagedRows: any[]) => {
    if (!stagedRows || stagedRows.length === 0) return error("No rows to import")

    const sanitizeRow = (row: any) => {
      const clean: any = {}
      columns.forEach(col => {
        const val = row[col.key]
        if (val !== undefined && val !== '') {
          if (col.type === 'number') {
            const parsed = parseFloat(val)
            clean[col.key] = isNaN(parsed) ? val : parsed
          } else {
            clean[col.key] = val
          }
        }
      })
      return clean
    }
    const sanitizedRows = stagedRows.map(sanitizeRow)

    if (mode === 'full') {
      bulkFullImportMutation.mutate({ rows: sanitizedRows }, {
        onSuccess: async (res) => {
          if (reviewJob?.uuid) {
            await api.patch(`/pm/bulk-imports/${reviewJob.uuid}/complete`, { unitsCreated: res.unitsCreated || sanitizedRows.length }).catch(console.error)
            const jobUuid = reviewJob.uuid
            setTimeout(() => {
              setActiveJobs(prev => prev.filter(j => j.uuid !== jobUuid))
            }, 3000)
          }
          success(`Imported ${res.unitsCreated || stagedRows.length} units across properties!`)
          importState.closeOverlay()
          setReviewJob(null)
          router.push('/properties')
        },
        onError: (err: any) => error(err?.message || 'Failed to complete import')
      })
    } else {
      bulkCreateUnitsMutation.mutate({ propertyUuid: targetPropertyUuid, units: sanitizedRows } as any, {
        onSuccess: async () => {
          if (reviewJob?.uuid) {
            await api.patch(`/pm/bulk-imports/${reviewJob.uuid}/complete`, { unitsCreated: sanitizedRows.length }).catch(console.error)
            const jobUuid = reviewJob.uuid
            setTimeout(() => {
              setActiveJobs(prev => prev.filter(j => j.uuid !== jobUuid))
            }, 3000)
          }
          success('Successfully imported units!')
          importState.closeOverlay()
          setReviewJob(null)
          queryClient.invalidateQueries({ queryKey: ['property', targetPropertyUuid] })
          router.push('/properties')
        },
        onError: (err: any) => error(err?.message || 'Failed to complete import')
      })
    }
  }

  return (
    <div className="import-tab animate-fade-in" style={{ padding: '16px 0', maxWidth: 900, margin: '0 auto' }}>
      
      <div className="import-tab__header">
        <div className="import-tab__header-text">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
            Bulk Data Import
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Import your properties, landlords, or units via CSV, Excel, PDF, or image documents.
          </p>
        </div>

        <div className="import-tab__mode-toggle">
          <button
            onClick={() => setMode('full')}
            className={cn('import-tab__mode-btn', mode === 'full' && 'import-tab__mode-btn--active')}
          >
            Full Portfolio
          </button>
          <button
            onClick={() => setMode('units')}
            className={cn('import-tab__mode-btn', mode === 'units' && 'import-tab__mode-btn--active')}
          >
            Units & Leases
          </button>
        </div>
      </div>

      {mode === 'units' && (
        <div style={{ marginBottom: 20, background: 'white', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--dark)', display: 'block', marginBottom: 8 }}>
            Select Target Property <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <FormSelect
            value={targetPropertyUuid}
            onChange={val => setTargetPropertyUuid(val)}
            options={propertyOptions}
            placeholder="-- Choose property to add units into --"
            triggerStyle={{ height: 44, borderRadius: 10 }}
            searchable
          />
        </div>
      )}

      <ActiveImportJobsList
        jobs={activeJobs}
        onOpenReviewModal={handleOpenReviewModal}
        onDeleteJob={handleDeleteJob}
      />
      
      <div style={{ marginBottom: 32 }} />

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
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--border)' }}>
          <FileSpreadsheet size={28} style={{ color: 'var(--clay)' }} />
        </div>
        
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
          Upload your document or spreadsheet
        </h3>
        
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.5 }}>
          Drag and drop your file here or click to browse. Supports Excel (.xlsx, .xls, .xlsm, .xlsb, .xltx, .xltm, .csv) for direct import, or PDF/Images for assisted support onboarding.
        </p>

        <div className="import-tab__actions">
          <label className={cn('btn btn--primary import-tab__action-btn', (mode === 'units' && !targetPropertyUuid) && 'btn--disabled')}>
            <Upload size={18} style={{ marginRight: 8 }} /> Select File
            <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb,.xltx,.xltm,.pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} disabled={mode === 'units' && !targetPropertyUuid} ref={fileInputRef}/>
          </label>
          
          <button className="btn btn--secondary import-tab__action-btn" onClick={handleDownloadTemplate}>
            <Download size={18} style={{ marginRight: 8 }} /> Download Template
          </button>
        </div>
      </div>

      {/* Relay Prompt Modal */}
      <RelayConfirmationModal
        isOpen={showRelayModal}
        file={pendingRelayFile}
        onClose={() => {
          setShowRelayModal(false)
          setPendingRelayFile(null)
        }}
        onConfirm={handleConfirmRelay}
        isSubmitting={isRelaying}
      />

      {importState.isOverlayOpen && (
        <ImportOverlay 
          {...importState}
          mode={mode}
          columns={columns}
          isPending={bulkFullImportMutation.isPending || bulkCreateUnitsMutation.isPending}
          handleConfirmImport={(rows) => handleApproveStagedImport(rows || importState.previewRows)}
          reviewJob={reviewJob}
          handleSaveDraft={handleSaveDraft}
          isSavingDraft={isSavingDraft}
          hasDirtyEdits={hasDirtyEdits}
          setHasDirtyEdits={setHasDirtyEdits}
          updateRowField={(rowId, field, value) => {
            setHasDirtyEdits(true)
            importState.updateRowField(rowId, field, value)
          }}
          closeOverlay={() => {
            importState.closeOverlay()
            setReviewJob(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={jobToDelete !== null}
        onClose={() => setJobToDelete(null)}
        title="Delete Upload Request"
        icon={AlertTriangle}
        maxWidth={400}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setJobToDelete(null)} disabled={isDeleting}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={confirmDeleteJob} disabled={isDeleting} style={{ background: '#dc2626', borderColor: '#dc2626' }}>
              {isDeleting ? 'Deleting...' : 'Delete Request'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          Are you sure you want to permanently delete this assisted upload request? This action cannot be undone.
        </p>
      </Modal>

      <style jsx>{`
        .import-tab__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
        }

        .import-tab__mode-toggle {
          display: flex;
          background: var(--bg);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }

        .import-tab__mode-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .import-tab__mode-btn--active {
          background: white;
          color: var(--dark);
          box-shadow: var(--shadow-sm);
        }

        .import-tab__actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
        }

        .import-tab__action-btn {
          border-radius: 12px;
          padding: 12px 24px;
          height: 44px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .import-tab__header {
            flex-direction: column;
            align-items: stretch;
            text-align: left;
          }

          .import-tab__header-text h2 {
            font-size: 18px !important;
          }

          .import-tab__header-text p {
            margin-bottom: 16px;
          }

          .import-tab__mode-toggle {
            width: 100%;
          }

          .import-tab__mode-btn {
            flex: 1;
            text-align: center;
          }

          .import-tab__actions {
            flex-direction: column;
            width: 100%;
          }

          .import-tab__action-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

