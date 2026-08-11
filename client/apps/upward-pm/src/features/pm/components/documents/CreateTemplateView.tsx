'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronDown, FileText, Upload, Sparkles, Eye } from 'lucide-react'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/common/RichTextEditor').then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="animate-pulse h-[400px] bg-slate-100 rounded-md w-full" /> }
)
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '@/components/common/Toast'
import { Modal } from '@/components/ui/Modal/Modal'


interface CreateTemplateViewProps {
  onBack: () => void
  onCreated?: () => void
  template?: any
}

const TEMPLATE_TYPES = [
  { value: 'RENT_REVIEW', label: 'Rent Review' },
  { value: 'RENT_RENEWAL', label: 'Rent Renewal' },
  { value: 'LEASE_AGREEMENT', label: 'Lease Agreement' },
  { value: 'EVICTION_NOTICE', label: 'Eviction Notice' },
  { value: 'CUSTOM', label: 'Custom Template' },
]

export function CreateTemplateView({ onBack, onCreated, template }: CreateTemplateViewProps) {
  const { success, error } = useToast()
  const { saveTemplate } = useDocuments()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(template?.name || '')
  const [type, setType] = useState(template?.type || 'RENT_REVIEW')
  const [content, setContent] = useState(template?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  const handleCreate = async () => {
    if (!name.trim()) return error('Please enter a template name')
    if (!content.trim()) return error('Please add some content to the template')

    setIsSaving(true)
    try {
      await saveTemplate.mutateAsync({
        uuid: template?.uuid,
        name,
        type,
        content
      })
      success(template ? 'Template updated successfully' : 'Template created successfully')
      onCreated?.()
      onBack()
    } catch (err) {
      error(template ? 'Failed to update template' : 'Failed to create template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.convertToHtml({ arrayBuffer })
      setContent(result.value)
      if (!name.trim()) {
        setName(file.name.replace(/\.docx$/i, ''))
      }
      success('Word document imported — edit before saving')
    } catch (err) {
      console.error('Failed to convert word doc:', err)
      error('Failed to import Word document')
    } finally {
      setIsImporting(false)
      // Reset input so the same file can be re-imported if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const selectedType = TEMPLATE_TYPES.find(t => t.value === type)

  const renderTemplateSettingsContent = () => (
    <aside className="create-template-view__panel">
      <div className="create-template-view__panel-section">
        <h3 className="create-template-view__panel-heading">Template Settings</h3>

        {isMobile && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setIsContentModalOpen(true)}
            style={{ width: '100%', height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px solid var(--forest)', color: 'var(--forest)', fontWeight: 600 }}
          >
            <Eye size={16} /> Edit Template Content
          </button>
        )}

        <div className="create-template-view__field">
          <label className="create-template-view__label">Template Name</label>
          <input
            type="text"
            placeholder="e.g. Standard Rent Increase Notice"
            className="form-input"
            style={{ borderRadius: 12, height: 48 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="create-template-view__field">
          <label className="create-template-view__label">Template Type</label>
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              style={{ borderRadius: 12, height: 48, paddingRight: 40, appearance: 'none', background: 'var(--surface)' }}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TEMPLATE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown
              size={16}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}
            />
          </div>
        </div>
      </div>

      {/* Pro Tip */}
      <div className="create-template-view__tip">
        <div className="create-template-view__tip-icon">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="create-template-view__tip-title">Pro Tip</p>
          <p className="create-template-view__tip-body">
            Use <strong>[Tenant Name]</strong>, <strong>[RentAmount]</strong>, <strong>[UnitName]</strong>, <strong>[Date]</strong>, and other placeholders — they'll be auto-filled when you send the document.
          </p>
        </div>
      </div>

      {/* Word import hint */}
      <div className="create-template-view__import-hint">
        <Upload size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <p>
          You can import an existing <strong>.docx</strong> Word document to pre-fill the editor, then customise it here before saving.
        </p>
      </div>
    </aside>
  )

  return (
    <div className="create-template-view animate-fade-in">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="create-template-view__header">
        <div>
          <button onClick={onBack} className="create-template-view__back-btn">
            <ChevronLeft size={18} /> Back to Documents
          </button>
          <div className="create-template-view__title-row">
            <div className="create-template-view__title-icon">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="create-template-view__title">
                {name.trim() ? name : (template ? 'Edit Template' : 'New Template')}
              </h1>
              <p className="create-template-view__subtitle">
                {selectedType?.label} · {template ? 'Saved' : 'Draft'}
              </p>
            </div>
          </div>
        </div>

        <div className="create-template-view__actions">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="btn btn--secondary create-template-view__import-btn"
          >
            <Upload size={16} />
            {isImporting ? 'Importing...' : 'Import Word (.docx)'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            style={{ display: 'none' }}
            onChange={handleWordImport}
          />
          <button
            onClick={onBack}
            className="btn btn--secondary create-template-view__discard-btn"
            style={{ borderRadius: 12, height: 48, padding: '0 24px' }}
          >
            Discard
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="btn btn--primary create-template-view__save-btn"
          >
            {isSaving ? 'Saving...' : (template ? 'Save Changes' : 'Save Template')}
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      {isMobile ? (
        <div className="create-template-view__mobile-container">
          {renderTemplateSettingsContent()}
        </div>
      ) : (
        <div className="create-template-view__body">
          {/* Left: Settings panel */}
          {renderTemplateSettingsContent()}

          {/* Right: Editor */}
          <div className="create-template-view__editor">
            <RichTextEditor
              value={content}
              onChange={setContent}
              height="100%"
              placeholder="Start writing your template or import a Word document above..."
            />
          </div>
        </div>
      )}

      {/* Mobile Content Editor Modal */}
      <Modal
        isOpen={isContentModalOpen && isMobile}
        onClose={() => setIsContentModalOpen(false)}
        title="Edit Template Content"
        maxWidth="95%"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button
              onClick={() => setIsContentModalOpen(false)}
              className="btn btn--primary"
              style={{ borderRadius: 12, height: 44, padding: '0 24px', background: 'var(--forest)' }}
            >
              Save & Close
            </button>
          </div>
        }
      >
        <div style={{ height: '60vh', marginTop: 16 }}>
          <RichTextEditor
            value={content}
            onChange={setContent}
            height="100%"
            placeholder="Start writing your template or import a Word document above..."
          />
        </div>
      </Modal>

      <style jsx>{`
        .create-template-view {
          padding: 40px;
          max-width: 1440px;
          margin: 0 auto;
          min-height: calc(100vh - var(--header-height));
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .create-template-view__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
        }

        .create-template-view__back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          margin-bottom: 10px;
          padding: 0;
          transition: color 0.2s;
        }
        .create-template-view__back-btn:hover {
          color: var(--text);
        }

        .create-template-view__title-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .create-template-view__title-icon {
          width: 48px;
          height: 48px;
          background: var(--forest-faint);
          border: 1px solid var(--forest-glow);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest);
          flex-shrink: 0;
        }

        .create-template-view__title {
          font-size: 24px;
          font-weight: 850;
          color: var(--text);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .create-template-view__subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin: 2px 0 0 0;
          font-weight: 500;
        }

        .create-template-view__actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .create-template-view__import-btn {
          border-radius: 12px !important;
          height: 48px !important;
          padding: 0 20px !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .create-template-view__save-btn {
          border-radius: 12px !important;
          height: 48px !important;
          padding: 0 32px !important;
          background: var(--forest) !important;
          border-color: var(--forest) !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          box-shadow: var(--shadow-forest) !important;
        }
        .create-template-view__save-btn:hover:not(:disabled) {
          background: var(--forest-hover) !important;
          transform: translateY(-1px);
        }
        .create-template-view__save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .create-template-view__body {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 32px;
          flex: 1;
          align-items: start;
          min-height: 700px;
        }

        :global(.create-template-view__panel) {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          top: 24px;
        }

        :global(.create-template-view__panel-section) {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        :global(.create-template-view__panel-heading) {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0;
        }

        :global(.create-template-view__field) {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        :global(.create-template-view__label) {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        :global(.create-template-view__tip) {
          background: var(--forest-faint);
          border: 1px solid var(--forest-glow);
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        :global(.create-template-view__tip-icon) {
          width: 28px;
          height: 28px;
          background: var(--forest);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        :global(.create-template-view__tip-title) {
          font-size: 12px;
          font-weight: 800;
          color: var(--forest);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 4px 0;
        }

        :global(.create-template-view__tip-body) {
          font-size: 12.5px;
          color: var(--accent);
          line-height: 1.6;
          margin: 0;
        }

        :global(.create-template-view__import-hint) {
          background: var(--ivory-dim);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.5;
        }


        .create-template-view__import-hint p {
          margin: 0;
        }

        .create-template-view__editor {
          height: 750px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          background: white;
          border: 1px solid var(--border);
        }

        @media (max-width: 1024px) {
          .create-template-view__body {
            grid-template-columns: 1fr;
          }
          .create-template-view__panel {
            position: static;
          }
          .create-template-view__editor {
            height: 500px;
          }
        }

        @media (max-width: 768px) {
          .create-template-view {
            padding: 16px;
            gap: 20px;
          }
          .create-template-view__header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .create-template-view__actions {
            width: 100%;
            flex-direction: column;
            gap: 8px;
          }
          .create-template-view__actions button,
          .create-template-view__actions .create-template-view__import-btn,
          .create-template-view__actions .create-template-view__discard-btn,
          .create-template-view__actions .create-template-view__save-btn {
            width: 100% !important;
            justify-content: center !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

