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
import * as XLSX from 'xlsx'

const COMPULSORY_KEYS = [
  'propertyAddress',
  'tenantFirstName',
  'tenantPhone',
  'unitRentAmount',
  'unitRentAmountPaid',
  'unitRentStartDate',
  'unitRentType',
] as const

const OPTIONAL_EXAMPLES: Record<string, string> = {
  propertyName: 'Freedom Court',
  propertyType: 'Residential',
  propertyCountry: 'Nigeria',
  propertyState: 'Lagos',
  propertyArea: 'Lekki',
  landlordFirstName: 'Adebayo',
  landlordLastName: 'Alabi',
  landlordEmail: 'adebayo@email.com',
  landlordPhone: '08098765432',
  tenantCommercialName: 'Upward Ltd',
  tenantLastName: 'Okafor',
  tenantEmail: 'daniel@email.com',
  tenantAdditionalPhone: '08033334444',
  unitName: 'Flat 3',
  leaseYears: '2',
  unitCurrency: 'NGN',
  unitRentDueDate: '15/01/2026',
  unitManagementFee: '10%',
  unitNotes: 'Paid on time',
  unitType: '2 Bedroom Flat',
}


function checkSheetComplexity(file: File): Promise<{ isComplex: boolean; reason: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        
        const validSheets = wb.SheetNames.filter(sheetName => {
          const worksheet = wb.Sheets[sheetName]
          if (!worksheet) return false
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          return sheetData.length > 1
        })
        
        if (validSheets.length > 1) {
          resolve({
            isComplex: true,
            reason: "Your file contains multiple sheets. Please merge your data into one sheet."
          })
          return
        }

        if (validSheets.length === 0) {
          resolve({
            isComplex: true,
            reason: "No valid sheets with data were found in the file."
          })
          return
        }

        const sheetName = validSheets[0]
        const worksheet = wb.Sheets[sheetName]
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
        
        if (sheetData.length <= 1) {
          resolve({
            isComplex: true,
            reason: "The sheet is empty or contains no data rows."
          })
          return
        }

        const headers = (sheetData[0] || []).map(h => String(h || '').trim())
        if (headers.filter(Boolean).length === 0) {
          resolve({
            isComplex: true,
            reason: "The sheet is missing column headers."
          })
          return
        }

        const hasEmptyHeaders = headers.some((h, i) => h === '' && i < headers.length - 1 && sheetData.some(row => row[i] !== ''))
        if (hasEmptyHeaders) {
          resolve({
            isComplex: true,
            reason: "The sheet has missing column headers or complex nested headers."
          })
          return
        }

        const dateRegex = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g
        
        for (let r = 1; r < sheetData.length; r++) {
          const row = sheetData[r]
          if (!row) continue
          for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c] || '').trim()
            if (cellVal) {
              const matches = cellVal.match(dateRegex)
              if (matches && matches.length >= 2) {
                resolve({
                  isComplex: true,
                  reason: `A single cell ("${cellVal}") contains multiple dates. Rent start and end dates must be in separate columns.`
                })
                return
              }
            }
          }
        }

        resolve(null)
      } catch (err) {
        resolve({
          isComplex: true,
          reason: "The file could not be read. It may be corrupted or in an unsupported layout."
        })
      }
    }
    reader.onerror = () => resolve({ isComplex: true, reason: "Error reading the file." })
    reader.readAsArrayBuffer(file)
  })
}

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
  const [showRelayModal, setShowRelayModal] = useState(false)
  const [isRelaying, setIsRelaying] = useState(false)
  const [showComplexModal, setShowComplexModal] = useState(false)
  const [complexityReason, setComplexityReason] = useState<string | null>(null)

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isSheet = ['csv', 'xlsx', 'xls', 'xlsm', 'xlsb', 'xltx', 'xltm'].includes(ext || '')

    if (isSheet) {
      const complexity = await checkSheetComplexity(file)
      if (complexity && complexity.isComplex) {
        setPendingRelayFile(file)
        setComplexityReason(complexity.reason)
        setShowComplexModal(true)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        importState.handleFileUpload(e, fileInputRef)
      }
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

          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20, marginTop: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: '0 0 6px' }}>
              How to name your Excel columns
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Make sure your file has these columns. Put everything on one sheet, with one row for each unit or tenant.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {/* Left Column: Required */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(22, 101, 52, 0.02)', border: '1px solid rgba(22, 101, 52, 0.08)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--forest)' }} />
                    Required Columns
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest)', background: 'var(--forest-faint)', padding: '2px 8px', borderRadius: 12 }}>
                    Must Have ({compulsory.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid rgba(22, 101, 52, 0.12)', borderRadius: 10, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{c.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Example: <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500 }}>{example}</span></span>
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'var(--forest-faint)', color: 'var(--forest)' }}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Optional */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
                    Optional Columns
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--border)', padding: '2px 8px', borderRadius: 12 }}>
                    Nice to Have ({optional.length})
                  </span>
                </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(showOptional ? optional : optional.slice(0, 7)).map(c => {
                    const example = OPTIONAL_EXAMPLES[c.key] || 'Optional';

                    return (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{c.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Example: <span style={{ fontStyle: 'italic' }}>{example}</span></span>
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14 }}>
                          +
                        </span>
                      </div>
                    );
                  })}
                </div>

                {optional.length > 7 && (
                  <button
                    onClick={() => setShowOptional(!showOptional)}
                    style={{
                      background: 'none',
                      border: '1px dashed var(--border-strong)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 'auto',
                      transition: 'border-color 0.15s, background-color 0.15s',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--clay)'
                      e.currentTarget.style.backgroundColor = 'var(--bg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {showOptional ? 'Show less' : `+ Show ${optional.length - 7} more optional columns`}
                  </button>
                )}
              </div>
            </div>
          </section>

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

        </div>
      </div>

      {showComplexModal && (
        <Modal
          isOpen={true}
          onClose={() => { setShowComplexModal(false); setPendingRelayFile(null) }}
          title="This file is too complicated to process automatically"
          maxWidth={500}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '6px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {complexityReason}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              You can fix the layout and upload again, or send the file to our team. We will type it in for you for free.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              <button
                onClick={() => {
                  setShowComplexModal(false)
                  setPendingRelayFile(null)
                  fileInputRef.current?.click()
                }}
                className="btn btn--secondary"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                Choose a different file
              </button>

              <button
                onClick={() => {
                  setShowComplexModal(false)
                  setShowRelayModal(true)
                }}
                className="btn btn--primary"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                Send to our team (Free)
              </button>
            </div>
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
