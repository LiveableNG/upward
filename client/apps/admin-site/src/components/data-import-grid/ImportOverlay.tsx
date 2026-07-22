import React, { useMemo, useEffect, useState } from 'react'
import './data-import.css'
import { createPortal } from 'react-dom'
import { ArrowLeft, FileText, Save, X, AlertTriangle } from 'lucide-react'
import { cn } from './utils'
import { showToast } from '@upward/client-core'
import { Modal } from '../common/modal/Modal'
import { MappingPhase } from './MappingPhase'
import { PreviewGridPhase } from './PreviewGridPhase'
import type { ColumnDef, ImportMode, ColumnMapping, SplitConfig } from './types'
import * as XLSX from 'xlsx'

interface ImportOverlayProps {
  mode: ImportMode
  phase: 'mapping' | 'preview'
  setPhase: (phase: 'mapping' | 'preview') => void
  closeOverlay: () => void
  transformData: () => void
  handleConfirmImport: () => void
  isPending: boolean
  isEditMode?: boolean
  
  // States and actions
  columns: ColumnDef[]
  userColumns: string[]
  mappings: { [sheet: string]: ColumnMapping[] }
  splitConfigs: { [sheet: string]: SplitConfig[] }
  activeSheet: string
  workbook: XLSX.WorkBook | null
  updateMapping: (sheetName: string, userColumn: string, systemField: string | null, entityType: string | null) => void
  toggleSplit: (userColumn: string) => void
  updateSplitConfig: (userColumn: string, updates: Partial<SplitConfig>) => void
  updateSplitPart: (userColumn: string, partIndex: number, field: string | null, entityType: string | null) => void
  addSplitPart: (userColumn: string) => void
  removeSplitPart: (userColumn: string, partIndex: number) => void
  
  previewRows: any[]
  validationErrors: Record<string, string>
  editingCell: { rowId: string, field: string } | null
  setEditingCell: (cell: { rowId: string, field: string } | null) => void
  updateRowField: (rowId: string, field: string, value: any) => void
  setPreviewRows: React.Dispatch<React.SetStateAction<any[]>>
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  revalidateDuplicates: (rows: any[]) => void
}

export const ImportOverlay: React.FC<ImportOverlayProps> = ({
  mode, phase, setPhase, closeOverlay, transformData, handleConfirmImport, isPending, isEditMode = false,
  columns, userColumns, mappings, splitConfigs, activeSheet, workbook,
  updateMapping, toggleSplit,
  updateSplitConfig, updateSplitPart, addSplitPart, removeSplitPart,
  previewRows, validationErrors, editingCell, setEditingCell,
  updateRowField, setPreviewRows, setValidationErrors, revalidateDuplicates
}) => {
  const [mounted, setMounted] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Prevent scrolling of background page when overlay is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  
  // Derived state: errors and warnings
  const duplicateMappings = useMemo(() => {
    const fieldMap: Record<string, string[]> = {}
    const duplicates: { field: string, columns: string[] }[] = []

    const sheetMappings = mappings[activeSheet] || []
    sheetMappings.forEach(m => {
      if (m.systemField && m.entityType !== 'skip') {
        if (!fieldMap[m.systemField]) fieldMap[m.systemField] = []
        fieldMap[m.systemField].push(m.userColumn)
      }
    })

    const sheetSplits = splitConfigs[activeSheet] || []
    sheetSplits.forEach(s => {
      s.parts.forEach(p => {
        if (p.systemField && p.entityType !== 'skip') {
          if (!fieldMap[p.systemField]) fieldMap[p.systemField] = []
          if (!fieldMap[p.systemField].includes(s.userColumn)) fieldMap[p.systemField].push(s.userColumn)
        }
      })
    })

    Object.entries(fieldMap).forEach(([field, cols]) => {
      if (cols.length > 1) duplicates.push({ field, columns: cols })
    })

    return duplicates
  }, [mappings, splitConfigs, activeSheet])

  const missingRequired = useMemo(() => {
    const mappedFields = new Set<string>()
    const sheetMappings = mappings[activeSheet] || []
    sheetMappings.forEach(m => { if (m.systemField && m.entityType !== 'skip') mappedFields.add(m.systemField) })
    
    const sheetSplits = splitConfigs[activeSheet] || []
    sheetSplits.forEach(s => s.parts.forEach(p => { if (p.systemField && p.entityType !== 'skip') mappedFields.add(p.systemField) }))
    
    return columns.filter(c => c.required && !mappedFields.has(c.key))
  }, [mappings, splitConfigs, activeSheet, columns])

  const handlePreviewClick = () => {
    if (duplicateMappings.length > 0) {
      return showToast('Please resolve duplicate field mappings before continuing.', true)
    }
    if (missingRequired.length > 0) {
      const firstMissing = missingRequired[0].label
      return showToast(`Missing required field mapping: ${firstMissing}`, true)
    }
    transformData()
  }

  if (!mounted) return null

  const overlayContent = (
    <div className="import-overlay">
      <header className="import-overlay__header">
        <div className="import-overlay__header-title">
          <h2>{isEditMode ? 'Edit Staged Data' : 'Bulk Data Import'}</h2>
          <span className="import-overlay__mode-badge">
            {mode === 'full' ? 'Full Portfolio Mode' : 'Units & Leases Mode'}
          </span>
        </div>

        <div className="import-overlay__actions">
          {phase === 'preview' && !isEditMode && (
            <button className="btn btn-secondary" style={{ borderRadius: 10, height: 40 }} onClick={() => setPhase('mapping')}>
              <ArrowLeft size={16} style={{ marginRight: 8 }}/> Return to Mapping
            </button>
          )}
          {phase === 'mapping' && (
            <button 
              type="button"
              className="btn btn-primary" 
              style={{ borderRadius: 10, height: 40, cursor: 'pointer' }}
              onClick={handlePreviewClick}
            >
              <FileText size={16} style={{ marginRight: 8 }}/> Preview Data Grid
            </button>
          )}
          {phase === 'preview' && (
            <button 
              type="button"
              className="btn btn-primary" 
              style={{ borderRadius: 10, height: 40, cursor: isPending ? 'not-allowed' : 'pointer' }}
              onClick={() => setShowSaveConfirm(true)}
              disabled={Object.keys(validationErrors).length > 0 || isPending}
            >
              <Save size={16} style={{ marginRight: 8 }}/> 
              {isPending ? 'Saving Staged Data...' : isEditMode ? 'Save & Update Staged Data' : 'Confirm & Complete Import'}
            </button>
          )}

          <button 
            type="button"
            onClick={() => setShowExitConfirm(true)} 
            className="import-overlay__close-icon" 
            style={{ cursor: 'pointer' }}
            title="Close edit session"
          >
            <X size={22} />
          </button>
        </div>

      </header>
      
      {!isEditMode && (
        <div className="import-overlay__steps">
          <div className={cn('import-step', phase === 'mapping' && 'import-step--active')}>
            <span className="import-step__number">1</span> Column & Name Mapping
          </div>
          <div className="import-step__separator">—</div>
          <div className={cn('import-step', phase === 'preview' && 'import-step--active')}>
            <span className="import-step__number">2</span> Validation & Data Grid
          </div>
        </div>
      )}

      <main className="import-overlay__content">
        {phase === 'mapping' ? (
          <MappingPhase
            columns={columns}
            userColumns={userColumns}
            mappings={mappings}
            splitConfigs={splitConfigs}
            activeSheet={activeSheet}
            workbook={workbook}
            updateMapping={updateMapping}
            toggleSplit={toggleSplit}
            updateSplitConfig={updateSplitConfig}
            updateSplitPart={updateSplitPart}
            addSplitPart={addSplitPart}
            removeSplitPart={removeSplitPart}
            duplicateMappings={duplicateMappings}
            missingRequired={missingRequired}
          />
        ) : (
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
        )}
      </main>

      {/* Confirmation Modal when saving/staging */}
      {showSaveConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowSaveConfirm(false)}
          title={isEditMode ? 'Save Staged Data Edits?' : 'Confirm & Stage Import Data?'}
          description={isEditMode ? 'Update staged rows for property manager review.' : 'Stage structured data rows for property manager review.'}
          icon={<Save size={20} />}
          maxWidth="460px"
          footerActions={
            <>
              <button 
                className="btn btn--secondary" 
                style={{ flex: 1, height: 44 }} 
                onClick={() => setShowSaveConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button 
                className="btn btn--primary" 
                style={{ flex: 1, height: 44, cursor: isPending ? 'not-allowed' : 'pointer' }}
                onClick={() => {
                  setShowSaveConfirm(false)
                  handleConfirmImport()
                }}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : isEditMode ? 'Confirm Save' : 'Confirm & Stage'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            {isEditMode 
              ? `Are you sure you want to save modifications to ${previewRows.length} staged record(s)? The PM will see these updated rows for final approval.`
              : `Are you ready to stage ${previewRows.length} record(s) for the Property Manager to review and import into their account?`}
          </p>
        </Modal>
      )}

      {/* Confirmation Modal when closing */}
      {showExitConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowExitConfirm(false)}
          title={isEditMode ? 'Exit Data Editor?' : 'Exit Data Import?'}
          description={isEditMode ? 'Any unconfirmed changes to staged data will be discarded.' : 'Any unconfirmed row mapping or edits will be discarded.'}
          icon={<AlertTriangle />}
          maxWidth="460px"
          footerActions={
            <>
              <button className="btn btn--secondary" style={{ flex: 1, height: 44 }} onClick={() => setShowExitConfirm(false)}>
                {isEditMode ? 'Continue Editing' : 'Continue Import'}
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
            {isEditMode 
              ? 'Are you sure you want to exit the data editor? Any unsaved modifications will be lost.' 
              : 'Are you sure you want to close the data import tool? You will need to re-upload your file to import again.'}
          </p>
        </Modal>
      )}
    </div>
  )

  return createPortal(overlayContent, document.body)
}

