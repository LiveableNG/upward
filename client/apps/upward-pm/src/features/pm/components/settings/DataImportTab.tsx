'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Download, Upload, Check, ChevronDown, ChevronUp, HelpCircle, FileText, AlertTriangle, ArrowRight, Eye, Building, Home, User, Lightbulb } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { downloadBlob } from '@/lib/download-helper'
import { api } from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'

import { FULL_COLUMNS } from './data-import/types'
import { useDataImport } from './data-import/useDataImport'
import { parseDateString } from './data-import/utils'
import { ImportOverlay } from './data-import/ImportOverlay'
import { RelayConfirmationModal } from './data-import/RelayConfirmationModal'
import { ActiveImportJobsList } from './data-import/ActiveImportJobsList'
import { Modal } from '@/components/ui/Modal/Modal'
import { useQueryClient } from '@tanstack/react-query'

export const DataImportTab: React.FC = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const mode = 'full' as const
  
  const { success, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkFullImportMutation = useBulkFullImport()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const columns = useMemo(() => FULL_COLUMNS, [])
  const importState = useDataImport(columns, mode, properties, '')

  // UX Redesign state
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false)
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    property: true,
    unit: true,
    tenant: false,
    landlord: false
  })

  // Dynamic schema summary grouping for Help Drawer
  const schemaSummary = useMemo(() => {
    const categories: Record<string, { label: string; icon: React.ReactNode; required: typeof FULL_COLUMNS; optional: typeof FULL_COLUMNS }> = {
      property: { label: 'Property Information', icon: <Building size={16} style={{ color: 'var(--clay)' }} />, required: [], optional: [] },
      unit: { label: 'Units Details', icon: <Home size={16} style={{ color: 'var(--clay)' }} />, required: [], optional: [] },
      tenant: { label: 'Tenant Information', icon: <User size={16} style={{ color: 'var(--clay)' }} />, required: [], optional: [] },
      landlord: { label: 'Landlord Details', icon: <User size={16} style={{ color: 'var(--clay)' }} />, required: [], optional: [] }
    }

    FULL_COLUMNS.forEach(col => {
      const cat = col.category
      if (categories[cat]) {
        if (col.required) {
          categories[cat].required.push(col)
        } else {
          categories[cat].optional.push(col)
        }
      }
    })

    return categories
  }, [])

  const handleDownloadTemplate = () => {
    const exportColumns = columns.filter(c => 
      c.key !== 'unitRentDueDate' && 
      c.key !== 'rentDueDate'
    );
    const headers = exportColumns.map(c => c.label)
    
    const rows = [
      ['Maple Residences', '18 Freedom Way, Lekki Phase 1', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Michael', 'Adebayo', 'michael.adebayo@landlord.com', '+2348012345678', '', 'Daniel', 'Okafor', 'daniel.okafor@email.com', '+2348031112233', 'Flat B3', '4200000', '4200000', 'Annually', '', 'NGN', '2025-01-15', '420000', '3-bedroom apartment', 'Flat / Apartment'],
      ['The Oak Apartments', '7 Prince Ade Odedina Street, Victoria Island', 'Residential', 'Nigeria', 'Lagos', 'Victoria Island', 'Grace', 'Johnson', 'grace.johnson@landlord.com', '+2348023456789', '', 'Sarah', 'Williams', 'sarah.williams@email.com', '+2348056677889', 'Unit 5C', '650000', '650000', 'Monthly', '', 'NGN', '2025-02-01', '65000', 'Luxury serviced apartment', 'Flat / Apartment'],
      ['Atlantic Business Hub', '22 Adeola Odeku Street, Victoria Island', 'Commercial', 'Nigeria', 'Lagos', 'Victoria Island', 'David', 'Ogunleye', 'david.indigo@landlord.com', '+2348034567890', 'TechNova Solutions Ltd', '', '', 'admin@technova.com', '+2348078899001', 'Office 401', '24000000', '24000000', 'Lease', '5', 'NGN', '2025-03-01', '2400000', '5-year commercial office lease', 'Office Space']
    ]

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `upward_full_import_template.csv`).then(() => {
      success('Template downloaded successfully!')
    }).catch((err: any) => console.error(err))
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
      if (docInputRef.current) docInputRef.current.value = ''
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

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="import-page animate-fade-in" style={{ padding: '24px 0', maxWidth: 740, margin: '0 auto' }}>
      
      {/* Header Block */}
      <div className="import-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }}>Bulk Import</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Import your existing spreadsheet in just a few minutes.</p>
        </div>
        <button 
          onClick={() => setIsHelpDrawerOpen(true)}
          className="btn btn--secondary btn--sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, borderRadius: 10, fontSize: 13, fontWeight: 600 }}
        >
          <HelpCircle size={16} /> Need help importing?
        </button>
      </div>

      <ActiveImportJobsList
        jobs={activeJobs}
        onOpenReviewModal={handleOpenReviewModal}
        onDeleteJob={handleDeleteJob}
      />

      {/* Visual Timeline Stepper */}
      <div className="workflow-steps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 24px', marginBottom: 32 }}>
        <div className="workflow-step" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="workflow-step__num" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--dark)' }}>1</div>
          <div className="workflow-step__desc" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Upload File</div>
        </div>
        <div className="workflow-step__line" style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 16px' }} />
        <div className="workflow-step" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="workflow-step__num" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--dark)' }}>2</div>
          <div className="workflow-step__desc" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Review Columns</div>
        </div>
        <div className="workflow-step__line" style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 16px' }} />
        <div className="workflow-step" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="workflow-step__num" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--dark)' }}>3</div>
          <div className="workflow-step__desc" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Fix Issues</div>
        </div>
        <div className="workflow-step__line" style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 16px' }} />
        <div className="workflow-step" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="workflow-step__num" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--dark)' }}>4</div>
          <div className="workflow-step__desc" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Import</div>
        </div>
      </div>

      {/* Hero Upload Box */}
      <div 
        className="upload-hero-dropzone" 
        style={{ 
          border: '2px dashed var(--border)', 
          borderRadius: 20, 
          padding: '64px 32px', 
          textAlign: 'center', 
          background: 'white',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24
        }}
      >
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid var(--border)' }}>
          <FileSpreadsheet size={32} style={{ color: 'var(--clay)' }} />
        </div>
        
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
          Drag your spreadsheet here or browse your computer
        </h3>
        
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.5 }}>
          Supports Excel (.xlsx, .xls) and CSV files.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <label className="btn btn--primary" style={{ padding: '12px 32px', height: 44, borderRadius: 12, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={18} /> Select Spreadsheet
            <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb" style={{ display: 'none' }} onChange={handleFileSelect} ref={fileInputRef}/>
          </label>
          
          <div className="secondary-links" style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)', alignItems: 'center' }}>
            <button 
              onClick={handleDownloadTemplate} 
              style={{ background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 }}
            >
              Download Template
            </button>
            <span style={{ color: 'var(--border)' }}>|</span>
            <button 
              onClick={() => setIsExampleModalOpen(true)} 
              style={{ background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 }}
            >
              View Example Spreadsheet
            </button>
          </div>
        </div>
      </div>

      {/* Document Assisted Onboarding */}
      <div 
        className="assisted-upload-card animate-fade-in"
        style={{ 
          background: 'white', 
          border: '1px solid var(--border)', 
          borderRadius: 16, 
          padding: 16, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24 
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <FileText size={20} style={{ color: 'var(--clay)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>Have a PDF or photo of records instead?</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assisted manual support transcription. Typical turnaround ~48h.</div>
          </div>
        </div>
        <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={14} /> Send to Support
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} ref={docInputRef}/>
        </label>
      </div>

      {/* Reassurance Card */}
      <div 
        className="reassurance-card" 
        style={{ 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0', 
          borderRadius: 16, 
          padding: 18, 
          display: 'flex', 
          gap: 12, 
          alignItems: 'flex-start' 
        }}
      >
        <Lightbulb size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
        <div style={{ textAlign: 'left' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#14532d', margin: '0 0 4px 0' }}>Only 4 Fields are Required to Get Started</h4>
          <p style={{ fontSize: 12, color: '#15803d', margin: 0, lineHeight: 1.5 }}>
            You only need columns for <strong>Property Name, Address, Unit Name,</strong> and <strong>Rent Amount</strong>. 
            All other information—including tenant details, landlord contacts, lease dates, and notes—can be added or edited later.
          </p>
        </div>
      </div>

      {/* Floating / On-Demand Help Drawer */}
      <Modal
        isOpen={isHelpDrawerOpen}
        onClose={() => setIsHelpDrawerOpen(false)}
        title="Import Help Guide"
        maxWidth={520}
        footer={
          <button className="btn btn--secondary" style={{ width: '100%', borderRadius: 10 }} onClick={() => setIsHelpDrawerOpen(false)}>
            Close Guide
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>What information should my spreadsheet contain?</h4>
            <div className="schema-categories" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(schemaSummary).map(([key, cat]) => {
                const isExpanded = expandedCategories[key]
                const reqCount = cat.required.length
                const optCount = cat.optional.length
                return (
                  <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <button 
                      onClick={() => toggleCategory(key)}
                      style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 13, color: 'var(--dark)' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {cat.icon}
                        <span style={{ fontWeight: 600 }}>{cat.label}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>{reqCount} req, {optCount} opt</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: 12, background: 'white', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)' }}>
                        {cat.required.map(col => (
                          <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--dark)' }}>
                            <Check size={14} style={{ color: 'var(--forest)' }} />
                            <span>{col.label} <span style={{ color: 'var(--error)' }}>*</span></span>
                          </div>
                        ))}
                        {cat.optional.map(col => (
                          <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-block', width: 14, textAlign: 'center' }}>•</span>
                            <span>{col.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>Import Guidelines</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Building size={18} style={{ color: 'var(--clay)', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--dark)', display: 'block' }}>Properties</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Import names and locations. Multiple units can belong to the same property.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Home size={18} style={{ color: 'var(--clay)', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--dark)', display: 'block' }}>Units</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Import flats, commercial offices, or shops.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <User size={18} style={{ color: 'var(--clay)', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--dark)', display: 'block' }}>Tenants & Landlords</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Optional fields. They will receive automated setup emails only when you choose to activate them later.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

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
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Property Name *</th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Address *</th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Unit Name *</th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Rent Amount *</th>
                  <th style={{ padding: 12, fontWeight: 600, color: 'var(--dark)' }}>Tenant Email</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>Palm Court</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>12 Lekki Road, Lagos</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>A101</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>₦ 600,000</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>john@example.com</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>Palm Court</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>12 Lekki Road, Lagos</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>A102</td>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>₦ 650,000</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>jane@example.com</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, color: 'var(--dark)' }}>Sunrise Estate</td>
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
