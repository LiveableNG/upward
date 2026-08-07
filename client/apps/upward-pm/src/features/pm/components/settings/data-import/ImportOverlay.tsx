import React, { useMemo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, FileText, Save, X, AlertTriangle, User, Mail, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { Modal } from '@/components/ui/Modal/Modal'
import { MappingPhase } from './MappingPhase'
import { PreviewGridPhase } from './PreviewGridPhase'
import { ColumnDef, ImportMode, ColumnMapping, SplitConfig } from './types'
import * as XLSX from 'xlsx'
import { useQueryClient } from '@tanstack/react-query'

interface ImportOverlayProps {
  mode: ImportMode
  phase: 'mapping' | 'preview'
  setPhase: (phase: 'mapping' | 'preview') => void
  closeOverlay: () => void
  transformData: () => void
  handleConfirmImport: (rows?: any[]) => void
  isPending: boolean
  
  // Review Mode Props
  reviewJob?: any
  handleSaveDraft?: () => Promise<void>
  isSavingDraft?: boolean
  hasDirtyEdits?: boolean
  setHasDirtyEdits?: (val: boolean) => void

  // States and actions
  columns: ColumnDef[]
  userColumns: string[]
  mappings: { [sheet: string]: ColumnMapping[] }
  splitConfigs: { [sheet: string]: SplitConfig[] }
  activeSheet: string
  setFieldColumn?: (sheetName: string, fieldKey: string, entityType: string, userColumn: string | null) => void
  addFieldColumn?: (sheetName: string, fieldKey: string, entityType: string, userColumn: string) => void
  removeFieldColumn?: (sheetName: string, fieldKey: string, userColumn: string) => void
  swapNameOrder?: boolean
  setSwapNameOrder?: (v: boolean) => void
  dateOrder?: 'dmy' | 'mdy' | 'iso' | 'unknown'
  setDateOrder?: (v: 'dmy' | 'mdy' | 'iso' | 'unknown') => void
  workbook: XLSX.WorkBook | null
  savedTemplates: {id: string, name: string, data: any}[]
  applyTemplate: (templateId: string) => void
  saveTemplate: () => void
  updateMapping: (sheetName: string, userColumn: string, systemField: string | null, entityType: string | null) => void
  toggleSplit: (userColumn: string) => void
  updateSplitConfig: (userColumn: string, updates: Partial<SplitConfig>) => void
  updateSplitPart: (userColumn: string, partIndex: number, field: string | null, entityType: string | null) => void
  addSplitPart: (userColumn: string) => void
  removeSplitPart: (userColumn: string, partIndex: number) => void
  
  previewRows: any[]
  validationErrors: Record<string, string>
  amberWarnings?: Record<string, string>
  editingCell: { rowId: string, field: string } | null
  setEditingCell: (cell: { rowId: string, field: string } | null) => void
  updateRowField: (rowId: string, field: string, value: any) => void
  setPreviewRows: React.Dispatch<React.SetStateAction<any[]>>
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  revalidateDuplicates: (rows: any[]) => void
}

export const ImportOverlay: React.FC<ImportOverlayProps> = ({
  mode, phase, setPhase, closeOverlay, transformData, handleConfirmImport, isPending,
  reviewJob, handleSaveDraft, isSavingDraft, hasDirtyEdits, setHasDirtyEdits,
  columns, userColumns, mappings, splitConfigs, activeSheet,
  setFieldColumn, addFieldColumn, removeFieldColumn,
  swapNameOrder, setSwapNameOrder, dateOrder, setDateOrder, workbook,
  savedTemplates, applyTemplate, saveTemplate, updateMapping, toggleSplit,
  updateSplitConfig, updateSplitPart, addSplitPart, removeSplitPart,
  previewRows, validationErrors, amberWarnings, editingCell, setEditingCell,
  updateRowField, setPreviewRows, setValidationErrors, revalidateDuplicates
}) => {

  const [mounted, setMounted] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showDraftConfirm, setShowDraftConfirm] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const { error: toastError } = useToast()

  useEffect(() => {
    setMounted(true)
    // Prevent scrolling of background page when overlay is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  
  // Several columns feeding one field is intentional now — names, instalments,
  // an address split in two — so there is nothing to guard against here.
  const missingRequired = useMemo(() => {
    const mappedFields = new Set<string>()
    const sheetMappings = mappings[activeSheet] || []
    sheetMappings.forEach(m => { if (m.systemField && m.entityType !== 'skip') mappedFields.add(m.systemField) })
    
    const sheetSplits = splitConfigs[activeSheet] || []
    sheetSplits.forEach(s => s.parts.forEach(p => { if (p.systemField && p.entityType !== 'skip') mappedFields.add(p.systemField) }))
    
    return columns.filter(c => c.required && !mappedFields.has(c.key))
  }, [mappings, splitConfigs, activeSheet, columns])

  const handlePreviewClick = () => {
    if (missingRequired.length > 0) {
      const firstMissing = missingRequired[0].label
      return toastError(`Missing required field mapping: ${firstMissing}`)
    }
    transformData()
  }

  if (!mounted) return null

  const overlayContent = (
    <div className="import-overlay">
      <header className="import-overlay__header">
        <div className="import-overlay__header-title">
          <h2>{reviewJob ? 'Review & Edit Prepared Data' : 'Bulk Data Import'}</h2>
          {!reviewJob && (
            <span className="import-overlay__mode-badge">
              {mode === 'full' ? 'Full Portfolio Mode' : 'Units & Leases Mode'}
            </span>
          )}
        </div>

        <div className="import-overlay__actions">
          {phase === 'preview' && !reviewJob && (
            <button 
              type="button" 
              className="link-btn" 
              style={{ background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginRight: 16 }}
              onClick={() => setPhase('mapping')}
            >
              <ArrowLeft size={16} /> Back to matching
            </button>
          )}
          {phase === 'mapping' && !reviewJob && (
            <button 
              type="button"
              className="btn btn--primary" 
              style={{ borderRadius: 10, height: 40, cursor: 'pointer' }}
              onClick={handlePreviewClick}
            >
              Continue <ArrowRight size={16} style={{ marginLeft: 8 }}/>
            </button>
          )}

          {phase === 'preview' && !reviewJob && (
            <button 
              type="button"
              className="btn btn--primary" 
              style={{ borderRadius: 10, height: 40, cursor: isPending ? 'not-allowed' : 'pointer' }}
              onClick={() => {
                if (Object.keys(validationErrors).length > 0) {
                  const firstErrorKey = Object.keys(validationErrors)[0]
                  const lastDashIndex = firstErrorKey.lastIndexOf('-')
                  const rowId = firstErrorKey.substring(0, lastDashIndex)
                  const field = firstErrorKey.substring(lastDashIndex + 1)
                  const rowIndex = previewRows.findIndex(r => r.id === rowId)
                  const colLabel = columns.find(c => c.key === field)?.label || field
                  return toastError(`Please resolve validation issues first. Error at Row ${rowIndex + 1}, Column "${colLabel}": ${validationErrors[firstErrorKey]}`)
                }
                handleConfirmImport()
              }}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Complete Import'}
            </button>
          )}
          {phase === 'preview' && reviewJob && (
            <>
              <button
                type="button"
                className="btn btn--secondary"
                style={{
                  borderRadius: 10, height: 40, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: hasDirtyEdits ? '#f8fafc' : '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  cursor: hasDirtyEdits && !isPending && !isSavingDraft ? 'pointer' : 'not-allowed',
                  opacity: hasDirtyEdits ? 1 : 0.5
                }}
                onClick={() => {
                  if (Object.keys(validationErrors).length > 0) {
                    const firstErrorKey = Object.keys(validationErrors)[0]
                    const lastDashIndex = firstErrorKey.lastIndexOf('-')
                    const rowId = firstErrorKey.substring(0, lastDashIndex)
                    const field = firstErrorKey.substring(lastDashIndex + 1)
                    const rowIndex = previewRows.findIndex(r => r.id === rowId)
                    const colLabel = columns.find(c => c.key === field)?.label || field
                    return toastError(`Please resolve validation issues first. Error at Row ${rowIndex + 1}, Column "${colLabel}": ${validationErrors[firstErrorKey]}`)
                  }
                  setShowDraftConfirm(true)
                }}
                disabled={isPending || isSavingDraft || !hasDirtyEdits || previewRows.length === 0}
                title={!hasDirtyEdits ? 'Make edits to enable Save Draft' : 'Save draft edits'}
              >
                <Save size={16} /> {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ borderRadius: 10, height: 40, cursor: isPending || isSavingDraft ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  if (Object.keys(validationErrors).length > 0) {
                    const firstErrorKey = Object.keys(validationErrors)[0]
                    const lastDashIndex = firstErrorKey.lastIndexOf('-')
                    const rowId = firstErrorKey.substring(0, lastDashIndex)
                    const field = firstErrorKey.substring(lastDashIndex + 1)
                    const rowIndex = previewRows.findIndex(r => r.id === rowId)
                    const colLabel = columns.find(c => c.key === field)?.label || field
                    return toastError(`Please resolve validation issues first. Error at Row ${rowIndex + 1}, Column "${colLabel}": ${validationErrors[firstErrorKey]}`)
                  }
                  setShowApproveConfirm(true)
                }}
                disabled={isPending || isSavingDraft || previewRows.length === 0}
              >
                Complete Import
              </button>
            </>
          )}
          <button 
            type="button"
            onClick={() => setShowExitConfirm(true)} 
            className="import-overlay__close-icon" 
            style={{ cursor: 'pointer' }}
            title="Close import session"
          >
            <X size={22} />
          </button>
        </div>

      </header>
      
      {!reviewJob && (
        <div className="import-overlay__steps">
          <div className={cn('import-step', phase === 'mapping' && 'import-step--active')}>
            <span className="import-step__number">1</span> Match Columns
          </div>
          <div className="import-step__separator">—</div>
          <div className={cn('import-step', phase === 'preview' && 'import-step--active')}>
            <span className="import-step__number">2</span> Check &amp; Import
          </div>
        </div>
      )}

      <main className="import-overlay__content">
        {phase === 'mapping' && !reviewJob ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <MappingPhase
            columns={columns}
            userColumns={userColumns}
            mappings={mappings}
            splitConfigs={splitConfigs}
            activeSheet={activeSheet}
            workbook={workbook}
            savedTemplates={savedTemplates}
            applyTemplate={applyTemplate}
            saveTemplate={saveTemplate}
            updateMapping={updateMapping}
            setFieldColumn={setFieldColumn}
            addFieldColumn={addFieldColumn}
            removeFieldColumn={removeFieldColumn}
            swapNameOrder={swapNameOrder}
            setSwapNameOrder={setSwapNameOrder}
            dateOrder={dateOrder}
            setDateOrder={setDateOrder}
            toggleSplit={toggleSplit}
            updateSplitConfig={updateSplitConfig}
            updateSplitPart={updateSplitPart}
            addSplitPart={addSplitPart}
            removeSplitPart={removeSplitPart}
            />
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
            {reviewJob && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 16, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Transcribed By Upward Support Agent
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <User size={16} style={{ color: 'var(--clay)' }} /> {reviewJob.assignedAdminName || 'Customer Support Agent'}
                    </span>
                    {reviewJob.assignedAdminEmail && (
                      <button 
                        onClick={() => {
                          const subject = encodeURIComponent(`Re: Bulk Import Support - ${reviewJob.originalFileName}`)
                          const body = encodeURIComponent(`Hi ${reviewJob.assignedAdminName || 'Support'},\n\nI have a question regarding my staged data for "${reviewJob.originalFileName}":\n\n`)
                          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(reviewJob.assignedAdminEmail!)}&su=${subject}&body=${body}`
                          window.open(gmailUrl, '_blank')
                        }}
                        style={{ fontSize: 13, color: 'var(--clay)', fontWeight: 600, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}
                      >
                        <Mail size={14} /> Message Support
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              <PreviewGridPhase
                columns={columns}
                previewRows={previewRows}
                validationErrors={validationErrors}
                amberWarnings={amberWarnings}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                updateRowField={updateRowField}
                setPreviewRows={setPreviewRows}
                setValidationErrors={setValidationErrors}
                revalidateDuplicates={revalidateDuplicates}
              />
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal when closing */}
      {showExitConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowExitConfirm(false)}
          title="Exit Data Import?"
          subtitle="Any unconfirmed row mapping or edits will be discarded."
          icon={AlertTriangle}
          maxWidth={460}
          footer={
            <>
              <button className="btn btn--secondary" style={{ flex: 1, height: 44 }} onClick={() => setShowExitConfirm(false)}>
                Continue Import
              </button>
              <button 
                className="btn btn--primary" 
                style={{ flex: 1, height: 44, background: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={() => {
                  setShowExitConfirm(false)
                  closeOverlay()
                }}
              >
                Discard & Exit
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            {reviewJob
              ? 'Are you sure you want to exit the data editor? Any unsaved modifications will be lost.'
              : 'Are you sure you want to close the data import tool? You will need to re-upload your file to import again.'}
          </p>
        </Modal>
      )}

      {/* Confirmation Modal for Draft Save */}
      <Modal
        isOpen={showDraftConfirm}
        onClose={() => setShowDraftConfirm(false)}
        title="Save Draft Edits?"
        subtitle="Save modifications so Customer Support can review your edits."
        icon={Save}
        maxWidth={460}
        footer={
          <>
            <button className="btn btn--secondary" style={{ flex: 1, height: 44 }} onClick={() => setShowDraftConfirm(false)} disabled={isSavingDraft}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1, height: 44 }}
              onClick={() => {
                setShowDraftConfirm(false)
                handleSaveDraft?.()
              }}
              disabled={isSavingDraft}
            >
              {isSavingDraft ? 'Saving...' : 'Confirm Draft Save'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          Are you sure you want to save your current edits as a draft? The support agent will be able to see these updated rows.
        </p>
      </Modal>

      {/* Confirmation Modal for Final Approval */}
      <Modal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        title="Approve & Finalize Data Import?"
        subtitle="This will immediately create units and leases in your portfolio."
        icon={CheckCircle2}
        maxWidth={460}
        footer={
          <>
            <button className="btn btn--secondary" style={{ flex: 1, height: 44 }} onClick={() => setShowApproveConfirm(false)} disabled={isPending}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1, height: 44 }}
              onClick={() => {
                setShowApproveConfirm(false)
                handleConfirmImport(previewRows)
              }}
              disabled={isPending}
            >
              {isPending ? 'Finalizing...' : 'Confirm Final Import'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          Are you ready to import {previewRows.length} record(s) into your Upward portfolio? This action will generate property units and lease records.
        </p>
      </Modal>
    </div>
  )

  return createPortal(overlayContent, document.body)
}

