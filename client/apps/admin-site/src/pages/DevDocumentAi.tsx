import React, { useState, useRef } from 'react'
import { Sparkles, Upload, FileSpreadsheet, Loader2, FileText, Terminal } from 'lucide-react'
import { FULL_COLUMNS, UNIT_COLUMNS } from '../components/data-import-grid/types'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { useDataImport } from '../components/data-import-grid/useDataImport'
import { ImportOverlay } from '../components/data-import-grid/ImportOverlay'
import { Modal } from '../components/common'

interface DevDocumentAiProps {
  token: string
}

const DevDocumentAi: React.FC<DevDocumentAiProps> = ({ token }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'full' | 'units'>('full')
  const [inputText, setInputText] = useState('')
  const [isTextParsing, setIsTextParsing] = useState(false)

  const columns = mode === 'units' ? UNIT_COLUMNS : FULL_COLUMNS
  const importState = useDataImport(columns, mode, [], '')

  const [pendingFile, setPendingFile] = useState<{ file: File; event: React.ChangeEvent<HTMLInputElement> } | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile({ file, event: e })
  }

  // Paste text AI parser flow
  const handleAiTextParse = async () => {
    if (!inputText.trim()) {
      showToast('Please paste some text content first.', true)
      return
    }

    setIsTextParsing(true)
    try {
      const textBase64 = btoa(unescape(encodeURIComponent(inputText)))
      const responseRows = await apiService.post('/pm/ai-document/parse', {
        base64Data: textBase64,
        contentType: 'text/plain',
        fileName: 'unstructured_text.txt',
        mode,
      }, token) as any[]

      const formattedRows = responseRows.map((r: any, idx: number) => ({
        id: `row-ai-${Date.now()}-${idx}`,
        ...r,
      }))

      // Run local client-side validation logic
      const newErrors: Record<string, string> = {}
      const newWarnings: Record<string, string> = {}

      formattedRows.forEach(row => {
        const startDateField = mode === 'full' ? 'unitRentStartDate' : 'rentStartDate'
        const dueDateField = mode === 'full' ? 'unitRentDueDate' : 'rentDueDate'

        const startDateVal = row[startDateField]
        const endDateVal = row[dueDateField]
        if (startDateVal && endDateVal && new Date(endDateVal) < new Date(startDateVal)) {
          newErrors[`${row.id}-${dueDateField}`] = 'The end date is before the start date'
        }

        columns.forEach(col => {
          // Import custom utility validators if needed, or run standard check
          if (col.required && (!row[col.key] || String(row[col.key]).trim() === '')) {
            newErrors[`${row.id}-${col.key}`] = `${col.label} is required`
          }
        })
      })

      importState.setPreviewRows(formattedRows)
      importState.setValidationErrors(newErrors)
      importState.setAmberWarnings(newWarnings)
      importState.setPhase('preview')
      importState.setIsOverlayOpen(true)
      
      showToast('AI text parsing complete!')
    } catch (err: any) {
      console.error(err)
      showToast(err?.message || 'Failed to parse pasted text.', true)
    } finally {
      setIsTextParsing(false)
    }
  }

  const handleConfirmSandboxImport = async () => {
    showToast('Sandbox verification complete! Data staging successfully validated.')
    importState.setIsOverlayOpen(false)
  }

  return (
    <div className="page-container fade-in" style={{ padding: '24px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--accent-faint)', color: 'var(--accent)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="section-title" style={{ margin: 0, fontSize: '20px' }}>AI Document Parser Sandbox</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Upload files or paste raw unstructured rent rolls to test our multi-modal AI parser and interactive review table.
          </p>
        </div>
      </div>

      {/* Mode & Config */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--white)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Extraction Mode:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <input type="radio" name="extraction_mode" checked={mode === 'full'} onChange={() => setMode('full')} />
            Full Import (Properties & Units)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <input type="radio" name="extraction_mode" checked={mode === 'units'} onChange={() => setMode('units')} />
            Units Only
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        {/* Upload Box */}
        <div 
          style={{ 
            border: '2px dashed var(--border)', 
            borderRadius: 20, 
            padding: '40px 24px', 
            textAlign: 'center', 
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, border: '1px solid var(--border)' }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            Upload document or spreadsheet
          </h3>
          <p style={{ fontSize: 12, color: '#64748b', maxWidth: 320, margin: '0 auto 16px', lineHeight: 1.4 }}>
            Supports PDF, images, Word docs, and Excel files.
          </p>
          <label className="btn btn-primary" style={{ borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} /> Select File
            <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} ref={fileInputRef}/>
          </label>
        </div>

        {/* Text Paste Box */}
        <div className="card" style={{ background: 'var(--white)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Terminal size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>Paste Raw Text Roll</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste raw conversational rent rolls here to test AI text formatting..."
            style={{ width: '100%', flex: 1, height: '110px', borderRadius: '8px', border: '1px solid var(--border)', padding: '10px', fontSize: '12px', fontFamily: 'monospace', resize: 'none' }}
          />
          <button 
            onClick={handleAiTextParse} 
            disabled={isTextParsing} 
            className="btn btn-secondary" 
            style={{ alignSelf: 'flex-end', fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isTextParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Parse Text
          </button>
        </div>
      </div>

      {/* Option Selection Modal */}
      {pendingFile && (
        <Modal
          isOpen={true}
          onClose={() => setPendingFile(null)}
          title="Choose Import Option"
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Choose how you want to process this document. We recommend using our AI parsing system for fast field extraction.
            </p>

            <button
              onClick={() => {
                const { file } = pendingFile
                setPendingFile(null)
                importState.handleAiFileUpload(file, token)
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                border: '2px solid var(--accent)',
                background: 'var(--accent-faint)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
                width: '100%',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
                <Sparkles size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--dark)', display: 'block', marginBottom: 2 }}>
                  AI Auto-Onboarding <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 6 }}>Recommended</span>
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                  Auto-extracts properties, units, and tenants instantly. Drops data directly to the review table.
                </span>
              </div>
            </button>

            {pendingFile.file.name.match(/\.(xlsx|xls|csv|xlsm|xlsb)$/i) ? (
              <button
                onClick={() => {
                  const { event } = pendingFile
                  setPendingFile(null)
                  importState.handleFileUpload(event, fileInputRef)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.backgroundColor = 'var(--accent-faint)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--white)'
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}>
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Manual Column Mapping (Legacy)</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                    Match each spreadsheet column to Upward database fields manually step-by-step.
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setPendingFile(null)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.backgroundColor = 'var(--accent-faint)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--white)'
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}>
                  <FileText size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--dark)', display: 'block', marginBottom: 2 }}>Cancel Upload</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                    Only Excel and CSV spreadsheets support manual field-mapping. Choose AI for other file types.
                  </span>
                </div>
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* AI Processing overlay spinner */}
      {importState.isAiParsing && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Processing Document with AI"
          maxWidth="450px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 12px' }}>
            <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16, color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Analyzing layout & mapping fields...</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Upward AI is parsing the document to extract properties, unit configurations, and tenant details. This will take a few seconds...
            </p>
          </div>
        </Modal>
      )}

      {importState.isOverlayOpen && (
        <ImportOverlay 
          {...importState}
          closeOverlay={() => importState.closeOverlay()}
          mode={mode}
          columns={columns}
          isPending={false}
          isEditMode={true}
          handleConfirmImport={handleConfirmSandboxImport}
        />
      )}
    </div>
  )
}

export default DevDocumentAi
