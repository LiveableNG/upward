'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, FileSpreadsheet, FileText, Check, Info } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { useProperties, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { api } from '@/lib/api'
import { FULL_COLUMNS } from '@/features/pm/components/settings/data-import/types'
import { useDataImport } from '@/features/pm/components/settings/data-import/useDataImport'
import { ImportOverlay } from '@/features/pm/components/settings/data-import/ImportOverlay'
import { RelayConfirmationModal } from '@/features/pm/components/settings/data-import/RelayConfirmationModal'
import { Modal } from '@/components/ui/Modal/Modal'
import { ActiveImportJobsList } from '@/features/pm/components/settings/data-import/ActiveImportJobsList'
import { useSocket } from '@/hooks/useSocket'
import { parseDateString, serializeWorkbook, deserializeWorkbook } from '@/features/pm/components/settings/data-import/utils'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

// The seven things a sheet must carry. Labels come from FULL_COLUMNS so they
// cannot drift from the mapping screen. Unit and property names are generated
// when the sheet does not have them.
const COMPULSORY_KEYS = [
  'propertyAddress',
  'tenantFirstName',
  'tenantPhone',
  'unitRentAmount',
  'unitRentAmountPaid',
  'unitRentStartDate',
  'unitRentType',
] as const

export default function ImportPage() {
  const router = useRouter()
  const { success, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkFullImportMutation = useBulkFullImport()

  const mode = 'full' as const
  const columns = useMemo(() => FULL_COLUMNS, [])
  const importState = useDataImport(columns, mode, properties, '')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  const [pendingRelayFile, setPendingRelayFile] = useState<File | null>(null)
  const [pendingExcelUpload, setPendingExcelUpload] = useState<{ file: File; event: React.ChangeEvent<HTMLInputElement> } | null>(null)
  const [showRelayModal, setShowRelayModal] = useState(false)
  const [isRelaying, setIsRelaying] = useState(false)

  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [reviewJob, setReviewJob] = useState<any | null>(null)
  const [hasDirtyEdits, setHasDirtyEdits] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const socket = useSocket()
  const queryClient = useQueryClient()

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

  const handleOpenReviewModal = (job: any) => {
    setReviewJob(job)
    try {
      const rawData = typeof job.stagedRowsJson === 'string' ? JSON.parse(job.stagedRowsJson) : job.stagedRowsJson
      let rows: any[] = []
      if (rawData && rawData.__isDraftWithMappings__) {
        rows = rawData.stagedRows || []
        if (rawData.mappings) importState.setMappings(rawData.mappings)
        if (rawData.userColumns) importState.setUserColumns(rawData.userColumns)
        if (rawData.activeSheet) importState.setActiveSheet(rawData.activeSheet)
        if (rawData.splitConfigs) importState.setSplitConfigs(rawData.splitConfigs)
        if (rawData.serializedWb) {
          const wb = deserializeWorkbook(rawData.serializedWb)
          importState.setWorkbook(wb)
        }
      } else {
        rows = Array.isArray(rawData) ? rawData : []
      }

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

  const handleDeleteJob = (jobUuid: string) => {
    setJobToDelete(jobUuid)
  }

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return
    setIsDeleting(true)
    try {
      await api.delete(`/pm/bulk-imports/${jobToDelete}`)
      setActiveJobs(prev => prev.filter(j => j.uuid !== jobToDelete))
      success('Upload request cancelled.')
      setJobToDelete(null)
    } catch (err) {
      error('Could not cancel this request.')
    } finally {
      setIsDeleting(false)
    }
  }

  const compulsory = COMPULSORY_KEYS
    .map(key => columns.find(c => c.key === key))
    .filter((c): c is NonNullable<typeof c> => !!c)

  const optional = columns.filter(c => !COMPULSORY_KEYS.includes(c.key as any))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isSheet = ['csv', 'xlsx', 'xls', 'xlsm', 'xlsb', 'xltx', 'xltm'].includes(ext || '')

    if (isSheet) {
      setPendingExcelUpload({ file, event: e })
    } else {
      setPendingRelayFile(file)
      setShowRelayModal(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const passFile = (file: File) => {
    const transfer = new DataTransfer()
    transfer.items.add(file)
    if (fileInputRef.current) fileInputRef.current.files = transfer.files
    handleFileSelect({ target: { files: transfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) passFile(file)
  }

  const handleConfirmRelay = async () => {
    if (!pendingRelayFile) return
    setIsRelaying(true)
    const ext = pendingRelayFile.name.split('.').pop()?.toLowerCase() || 'doc'
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const base64Data = (ev.target?.result as string).split(',')[1]
        const { fileKey } = await api.post('/pm/bulk-imports/relay-upload', {
          fileName: pendingRelayFile.name,
          contentType: pendingRelayFile.type || 'application/octet-stream',
          base64Data,
        })
        await api.post('/pm/bulk-imports/relay', {
          targetPropertyUuid: '',
          mode,
          originalFileName: pendingRelayFile.name,
          fileUrl: fileKey,
          fileType: ext,
        })
        setShowRelayModal(false)
        setPendingRelayFile(null)
        success('Sent to our team. We will let you know when it is ready, usually within 48 hours.')
        router.push('/dashboard')
      } catch {
        error('We could not send that just now. Please try again.')
      } finally {
        setIsRelaying(false)
      }
    }
    reader.onerror = () => { error('Could not read that file.'); setIsRelaying(false) }
    reader.readAsDataURL(pendingRelayFile)
  }

  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    try {
      let jobUuid = reviewJob?.uuid
      const serializedWb = serializeWorkbook(importState.workbook)
      const draftPayload = {
        __isDraftWithMappings__: true,
        stagedRows: importState.previewRows,
        mappings: importState.mappings,
        userColumns: importState.userColumns,
        activeSheet: importState.activeSheet,
        splitConfigs: importState.splitConfigs,
        serializedWb,
      }
      if (!jobUuid) {
        const newJob = await api.post('/pm/bulk-imports/relay', {
          targetPropertyUuid: '',
          mode,
          originalFileName: 'Onboarding Draft Import',
          fileUrl: 'self_onboarding_draft',
          fileType: 'xlsx',
        })
        jobUuid = newJob.uuid
      }
      await api.patch(`/pm/bulk-imports/${jobUuid}/staged-data`, {
        stagedRowsJson: JSON.stringify(draftPayload),
      })
      fetchJobs()
      success('Progress saved! You can resume and finish this import anytime under Settings.')
      importState.closeOverlay()
      setReviewJob(null)
      router.push('/dashboard')
    } catch {
      error('Could not save draft. Please try again.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleApproveImport = (rows: Record<string, unknown>[]) => {
    if (!rows || rows.length === 0) return error('Nothing to import')
    const clean = rows.map(row => {
      const out: Record<string, unknown> = {}
      columns.forEach(col => {
        const val = row[col.key]
        if (val !== undefined && val !== '') {
          out[col.key] = col.type === 'number' ? (parseFloat(String(val)) || 0) : val
        }
      })
      return out
    })
    bulkFullImportMutation.mutate({ rows: clean }, {
      onSuccess: (res: { unitsCreated?: number }) => {
        success(`Imported ${res.unitsCreated || clean.length} units`)
        importState.closeOverlay()
        router.push('/properties')
      },
      onError: (err: Error) => error(err?.message || 'Could not complete the import'),
    })
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Bring your properties in</span>
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Close"
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px 48px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', margin: '0 0 6px' }}>
            Upload your file
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
            Upload your properties and tenants. If you use Excel, we will guide you through matching columns. If you have a PDF, photo, or document, our team will type it in for you.
          </p>

          <ActiveImportJobsList
            jobs={activeJobs}
            onOpenReviewModal={handleOpenReviewModal}
            onDeleteJob={handleDeleteJob}
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '20px 16px',
              borderRadius: 12,
              border: `2px dashed ${isDragging ? 'var(--clay)' : 'var(--border-strong)'}`,
              background: isDragging ? 'var(--clay-faint)' : 'var(--surface)',
              transition: 'background 0.15s, border-color 0.15s',
              marginBottom: 16,
              marginTop: 20,
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, border: '1px solid var(--border)' }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--clay)' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', margin: '0 0 2px' }}>
              {isDragging ? 'Drop it here' : 'Choose your file'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Excel, PDF, image, or document</p>
            <label className="btn btn--primary" style={{ padding: '8px 24px', height: 38, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={15} /> Choose file
              <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb,.pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} ref={fileInputRef} />
            </label>
            <p className="desktop-only" style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              or drag and drop it here
            </p>
          </div>

          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', margin: '0 0 4px' }}>
              How to name your Excel columns
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.4 }}>
              Make sure your file has these columns. Put everything on one sheet, with one row for each flat or tenant.
            </p>

            {/* Row 1: Required Columns */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--forest)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--forest)' }} />
                Required Columns (Must have these)
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}>
                {compulsory.map(c => {
                  let example = 'Text info';
                  if (c.key === 'propertyAddress') example = '18 Freedom Way';
                  else if (c.key === 'tenantFirstName') example = 'Daniel Okafor';
                  else if (c.key === 'tenantPhone') example = '08012345678';
                  else if (c.key === 'unitRentAmount') example = '4,200,000';
                  else if (c.key === 'unitRentAmountPaid') example = '4,200,000';
                  else if (c.key === 'unitRentStartDate') example = '15/01/2025';
                  else if (c.key === 'unitRentType') example = 'Annually';

                  return (
                    <div key={c.key} style={{ flexShrink: 0, width: 130, padding: '10px 12px', background: 'var(--forest-faint)', border: '1px solid rgba(22, 101, 52, 0.15)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{example}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--forest)', display: 'flex', alignItems: 'flex-start', gap: 6, background: 'var(--forest-faint)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(22, 101, 52, 0.1)' }}>
                <Info size={14} style={{ color: 'var(--forest)', marginTop: 2, flexShrink: 0 }} />
                <span style={{ lineHeight: 1.4 }}>
                  <strong>Why is Tenant Phone Number required?</strong> We use it to send automated rent reminders and digital receipts directly to your tenants via WhatsApp or SMS.
                </span>
              </div>
            </div>

            {/* Row 2: Optional Columns */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
                Optional Columns (Add if you want)
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}>
                {optional.map(c => {
                  let example = 'Optional';
                  if (c.key === 'propertyName') example = 'Freedom Court';
                  else if (c.key === 'tenantLastName') example = 'Okafor';
                  else if (c.key === 'tenantEmail') example = 'daniel@email.com';
                  else if (c.key === 'unitManagementFee') example = '10%';
                  else if (c.key === 'unitNotes') example = 'Paid on time';
                  else if (c.key === 'unitType') example = '2 Bedroom Flat';
                  else if (c.key === 'propertyType') example = 'Residential';

                  return (
                    <div key={c.key} style={{ flexShrink: 0, width: 130, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{example}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        </div>
      </div>

      {pendingExcelUpload && (
        <Modal
          isOpen={true}
          onClose={() => setPendingExcelUpload(null)}
          title="How is your Excel sheet laid out?"
          maxWidth={500}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Choose the layout that best matches your file. If it has a complex structure, our team will process it for you for free.
            </p>
            
            <button
              onClick={() => {
                const { file, event } = pendingExcelUpload
                setPendingExcelUpload(null)
                importState.handleFileUpload(event, fileInputRef)
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--clay)'
                e.currentTarget.style.backgroundColor = 'var(--ivory-faint)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.backgroundColor = 'var(--surface)'
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}>
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Simple table layout</strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                  A clean grid of columns and rows. You will match the columns yourself in 5 minutes.
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                const { file } = pendingExcelUpload
                setPendingExcelUpload(null)
                setPendingRelayFile(file)
                setShowRelayModal(true)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--clay)'
                e.currentTarget.style.backgroundColor = 'var(--ivory-faint)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.backgroundColor = 'var(--surface)'
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}>
                <FileText size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Custom or complex layout</strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                  Nested tables, receipt styles, or multiple tables. Our team will transcribe it for you.
                </span>
              </div>
            </button>
          </div>
        </Modal>
      )}

      <RelayConfirmationModal
        isOpen={showRelayModal}
        file={pendingRelayFile}
        onClose={() => { setShowRelayModal(false); setPendingRelayFile(null) }}
        onConfirm={handleConfirmRelay}
        isSubmitting={isRelaying}
      />

       {importState.isOverlayOpen && (
        <ImportOverlay
          {...importState}
          mode={mode}
          columns={columns}
          isPending={bulkFullImportMutation.isPending}
          handleConfirmImport={(rows) => handleApproveImport((rows || importState.previewRows) as Record<string, unknown>[])}
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
        title={activeJobs.find(j => j.uuid === jobToDelete)?.fileUrl === 'self_import_draft' || activeJobs.find(j => j.uuid === jobToDelete)?.fileUrl === 'self_onboarding_draft' ? "Delete Saved Draft?" : "Delete Upload Request"}
        icon={AlertTriangle}
        maxWidth={400}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setJobToDelete(null)} disabled={isDeleting}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={confirmDeleteJob} disabled={isDeleting} style={{ background: '#dc2626', borderColor: '#dc2626' }}>
              {isDeleting ? 'Deleting...' : (activeJobs.find(j => j.uuid === jobToDelete)?.fileUrl === 'self_import_draft' || activeJobs.find(j => j.uuid === jobToDelete)?.fileUrl === 'self_onboarding_draft' ? 'Delete Draft' : 'Delete Request')}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          {activeJobs.find(j => j.uuid === jobToDelete)?.fileUrl === 'self_import_draft' || activeJobs.find(j => j.uuid === jobToDelete)?.fileUrl === 'self_onboarding_draft'
            ? "Are you sure you want to permanently delete this saved import draft? This action cannot be undone."
            : "Are you sure you want to permanently delete this assisted upload request? This action cannot be undone."
          }
        </p>
      </Modal>
    </main>
  )
}
