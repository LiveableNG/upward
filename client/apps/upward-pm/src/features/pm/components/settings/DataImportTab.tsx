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
    const headers = columns.map(c => c.label)
    
    const rows = mode === 'full' ? [
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', '', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Apt 101', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Tenant with 3 units across 3 properties', 'Flat / Apartment'],
      ['Sapphire Heights', '45 Glover Road, Ikoyi', 'Residential', 'Nigeria', 'Lagos', 'Ikoyi', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', '', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Suite 2A', '3500000', '3500000', 'Annually', 'NGN', '2024-02-01', '2025-02-01', '350000', 'Landlord with multiple properties', 'Office Space'],
    ] : [
      ['101', '', 'John', 'Doe', 'john@example.com', '+2348012345678', '2000000', '2000000', '2024-01-01', '2024-05-01', 'Monthly', '200000', 'NGN', 'Tenant Unit 1', 'Flat / Apartment'],
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

    const validKeys = new Set(columns.map(c => c.key))
    const sanitizeRow = (row: any) => {
      const clean: any = {}
      validKeys.forEach(k => {
        if (row[k] !== undefined) clean[k] = row[k]
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
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
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

    const validKeys = new Set(columns.map(c => c.key))
    const sanitizeRow = (row: any) => {
      const clean: any = {}
      validKeys.forEach(k => {
        if (row[k] !== undefined) clean[k] = row[k]
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
            Bulk Data Import
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Import your properties, landlords, or units via CSV, Excel, PDF, or image documents.
          </p>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMode('full')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'full' ? 'white' : 'transparent',
              color: mode === 'full' ? 'var(--dark)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: mode === 'full' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Full Portfolio
          </button>
          <button
            onClick={() => setMode('units')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'units' ? 'white' : 'transparent',
              color: mode === 'units' ? 'var(--dark)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: mode === 'units' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
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
          Drag and drop your file here or click to browse. Supports Excel (.xlsx, .csv) for direct import, or PDF/Images for assisted support onboarding.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <label className={cn('btn btn--primary', (mode === 'units' && !targetPropertyUuid) && 'btn--disabled')} style={{ borderRadius: 12, padding: '12px 28px', height: 44, cursor: 'pointer', fontSize: 14 }}>
            <Upload size={18} style={{ marginRight: 8 }} /> Select File
            <input type="file" accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} disabled={mode === 'units' && !targetPropertyUuid} ref={fileInputRef}/>
          </label>
          
          <button className="btn btn--secondary" onClick={handleDownloadTemplate} style={{ borderRadius: 12, padding: '12px 24px', height: 44, fontSize: 14 }}>
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
    </div>
  )
}

