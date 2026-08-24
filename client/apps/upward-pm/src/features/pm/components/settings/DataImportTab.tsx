'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Download, Upload, Check, ChevronDown, ChevronUp, FileText, AlertTriangle, ArrowRight, ArrowLeft, Eye, Building, Home, User, Table, Files, Clock, Pencil, Keyboard, Lock, Info } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { downloadBlob } from '@/lib/download-helper'
import { api } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'

import { FULL_COLUMNS } from './data-import/types'
import { useDataImport } from './data-import/useDataImport'
import { parseDateString, serializeWorkbook, deserializeWorkbook } from './data-import/utils'
import { ImportOverlay } from './data-import/ImportOverlay'
import { RelayConfirmationModal } from './data-import/RelayConfirmationModal'
import { ActiveImportJobsList } from './data-import/ActiveImportJobsList'
import { Modal } from '@/components/ui/Modal/Modal'
import { useQueryClient } from '@tanstack/react-query'
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

export const DataImportTab: React.FC = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const mode = 'full' as const
  
  const { success, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkFullImportMutation = useBulkFullImport()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const columns = useMemo(() => FULL_COLUMNS, [])
  const importState = useDataImport(columns, mode, properties, '')

  // UX Redesign state
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [showComplexModal, setShowComplexModal] = useState(false)
  const [complexityReason, setComplexityReason] = useState<string | null>(null)

  const compulsory = useMemo(() => {
    return COMPULSORY_KEYS
      .map(key => columns.find(c => c.key === key))
      .filter((c): c is NonNullable<typeof c> => !!c)
  }, [columns])

  const optional = useMemo(() => {
    return columns.filter(c => !COMPULSORY_KEYS.includes(c.key as any))
  }, [columns])



  const handleDownloadTemplate = () => {
    // Keyed by column key, not by position — a positional array silently drifts
    // whenever FULL_COLUMNS changes, which is how Additional Phone lost its value.
    const sampleRows: Record<string, string>[] = [
      {
        propertyName: 'Maple Residences', propertyAddress: '18 Freedom Way, Lekki Phase 1',
        propertyType: 'Residential', propertyCountry: 'Nigeria', propertyState: 'Lagos', propertyArea: 'Lekki Phase 1',
        landlordFirstName: 'Michael', landlordLastName: 'Adebayo',
        landlordEmail: 'michael.adebayo@landlord.com', landlordPhone: '+2348012345678',
        tenantFirstName: 'Daniel', tenantLastName: 'Okafor',
        tenantEmail: 'daniel.okafor@email.com', tenantPhone: '+2348031112233',
        unitName: 'Flat B3', unitRentAmount: '4200000', unitRentAmountPaid: '4200000',
        unitRentType: 'Annually', unitCurrency: 'NGN',
        unitRentStartDate: '2025-01-15', unitRentDueDate: '2026-01-14',
        unitManagementFee: '420000', unitNotes: '3-bedroom apartment', unitType: 'Flat / Apartment',
      },
      {
        propertyName: 'The Oak Apartments', propertyAddress: '7 Prince Ade Odedina Street, Victoria Island',
        propertyType: 'Residential', propertyCountry: 'Nigeria', propertyState: 'Lagos', propertyArea: 'Victoria Island',
        landlordFirstName: 'Grace', landlordLastName: 'Johnson',
        landlordEmail: 'grace.johnson@landlord.com', landlordPhone: '+2348023456789',
        tenantFirstName: 'Sarah', tenantLastName: 'Williams',
        tenantEmail: 'sarah.williams@email.com', tenantPhone: '+2348056677889',
        unitName: 'Unit 5C', unitRentAmount: '650000', unitRentAmountPaid: '650000',
        unitRentType: 'Monthly', unitCurrency: 'NGN',
        unitRentStartDate: '2025-02-01', unitRentDueDate: '2025-03-01',
        unitManagementFee: '65000', unitNotes: 'Luxury serviced apartment', unitType: 'Flat / Apartment',
      },
      {
        propertyName: 'Atlantic Business Hub', propertyAddress: '22 Adeola Odeku Street, Victoria Island',
        propertyType: 'Commercial', propertyCountry: 'Nigeria', propertyState: 'Lagos', propertyArea: 'Victoria Island',
        landlordFirstName: 'David', landlordLastName: 'Ogunleye',
        landlordEmail: 'david.indigo@landlord.com', landlordPhone: '+2348034567890',
        tenantCommercialName: 'TechNova Solutions Ltd',
        tenantEmail: 'admin@technova.com', tenantPhone: '+2348078899001',
        unitName: 'Office 401', unitRentAmount: '24000000', unitRentAmountPaid: '24000000',
        unitRentType: 'Lease', leaseYears: '5', unitCurrency: 'NGN',
        unitRentStartDate: '2025-03-01', unitRentDueDate: '2030-02-28',
        unitManagementFee: '2400000', unitNotes: '5-year commercial office lease', unitType: 'Office Space',
      },
    ]

    const headers = columns.map(c => c.label)
    const rows = sampleRows.map(row => columns.map(c => row[c.key] ?? ''))

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `upward_full_import_template.csv`).then(() => {
      success('Template downloaded successfully!')
    }).catch((err: unknown) => console.error(err))
  }

  const parseBackendError = (message: string): string => {
    if (!message) return 'Failed to import data'
    
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

    const rowsToSend = importState.previewRows.map(sanitizeRow)
    bulkFullImportMutation.mutate({ rows: rowsToSend }, {
      onSuccess: (res) => {
        success(`Imported ${res.unitsCreated} units across ${res.propertiesCreated} properties!`)
        importState.setIsOverlayOpen(false)
        router.push('/properties')
      },
      onError: (err: any) => error(parseBackendError(err?.message || 'Failed to import data'))
    })
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
          targetPropertyUuid: '',
          mode,
          originalFileName: pendingRelayFile.name,
          fileUrl: fileKey,
          fileType: ext,
        })

        setActiveJobs(prev => [newJob, ...prev])
        setShowRelayModal(false)
        setPendingRelayFile(null)
        success('Document sent to Customer Support team! We will notify you once processed manually (~48hrs).')
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
          originalFileName: 'Draft Import',
          fileUrl: 'self_import_draft',
          fileType: 'xlsx',
        })
        jobUuid = newJob.uuid
      }
      await api.patch(`/pm/bulk-imports/${jobUuid}/staged-data`, {
        stagedRowsJson: JSON.stringify(draftPayload)
      })
      queryClient.invalidateQueries({ queryKey: ['pmImportJobs'] })
      setHasDirtyEdits(false)
      success('Draft saved! You can resume it anytime from the uploads list below.')
      importState.closeOverlay()
      setReviewJob(null)
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
      success('Upload request cancelled. Our support team has been notified.')
      setJobToDelete(null)
    } catch (err) {
      error('We could not cancel this request right now. Please try again in a moment, or contact support if the issue continues.')
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
  }

  const passFileToImporter = (file: File) => {
    const transfer = new DataTransfer()
    transfer.items.add(file)
    if (fileInputRef.current) fileInputRef.current.files = transfer.files
    handleFileSelect({ target: { files: transfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) passFileToImporter(file)
  }

  return (
    <section className="settings__section animate-fade-in">

      <div className="settings__section-header import-page__header">
        <h2 className="settings__section-title">Import your properties</h2>
        <p className="settings__section-subtitle" style={{ maxWidth: 520, marginBottom: 12 }}>
          Upload your properties and tenants. If you use Excel, we will guide you through matching columns. If you have a PDF, photo, or document, our team will type it in for you.
        </p>
      </div>

      <ActiveImportJobsList
        jobs={activeJobs}
        onOpenReviewModal={handleOpenReviewModal}
        onDeleteJob={handleDeleteJob}
      />

      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>
            How to name your Excel columns
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
            Make sure your file has these columns. Put everything on one sheet, with one row for each unit or tenant.
          </p>
        </div>

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
          background: isDragging ? 'var(--clay-faint)' : 'var(--bg)',
          transition: 'background 0.15s, border-color 0.15s',
          marginBottom: 16,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, border: '1px solid var(--border)' }}>
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



      {/* Example Spreadsheet Modal */}
      <Modal
        isOpen={isExampleModalOpen}
        onClose={() => setIsExampleModalOpen(false)}
        title="Example Spreadsheet Structure"
        maxWidth={700}
        footer={
          <button className="btn btn--secondary" style={{ width: '100%', borderRadius: 10 }} onClick={() => setIsExampleModalOpen(false)}>
            Close Preview
          </button>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Here is how a standard CSV/Excel spreadsheet should look. You only need the required columns (marked with *) to proceed.
          </p>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
            <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Property Address *</th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Unit Name </th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Rent Amount *</th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Tenant Email</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>12 Lekki Road, Lagos</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>A101</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>₦ 600,000</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>john@example.com</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>12 Lekki Road, Lagos</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>A102</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>₦ 650,000</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>jane@example.com</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>8 Victoria Island, Lagos</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>Suite 5</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>₦ 1,200,000</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>commercial@email.com</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

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
          isPending={bulkFullImportMutation.isPending}
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
    </section>
  )
}
