'use client'

import React, { useState, useRef } from 'react'
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, File, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { useDocuments, useVaultActions } from '@/features/pm/hooks/useDocuments'
import { useToast } from '@/components/common/Toast'

interface SendToVaultModalProps {
  isOpen: boolean
  onClose: () => void
  unitUuid: string
  tenantUuid?: string
  tenantName?: string
  onProceedToEditor?: (template: any) => void
}

type TabType = 'upload' | 'template'

export function SendToVaultModal({ isOpen, onClose, unitUuid, tenantUuid, tenantName, onProceedToEditor }: SendToVaultModalProps) {
  const { templates, isLoading: loadingTemplates } = useDocuments()
  const { sendFileToVault, sendTemplateToVault } = useVaultActions()
  const { success, error } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileSubject, setFileSubject] = useState('')

  const [selectedTemplateUuid, setSelectedTemplateUuid] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [includeLetterhead, setIncludeLetterhead] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const isPending = sendFileToVault.isPending || sendTemplateToVault.isPending

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      error('Only PDF, JPG, or PNG files are allowed')
      return
    }
    if (file.size > MAX_SIZE) {
      error('File size must be less than 10MB')
      return
    }
    setSelectedFile(file)
    if (!fileSubject) setFileSubject(file.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const selectedTemplate = templates.find((t: any) => t.uuid === selectedTemplateUuid)

  const handleSubmitFile = async () => {
    if (!selectedFile) return
    try {
      await sendFileToVault.mutateAsync({
        file: selectedFile,
        subject: fileSubject || selectedFile.name,
        tenantUuid,
        unitUuid,
      })
      success(`Document sent to ${tenantName || 'tenant'}'s vault successfully`)
      onClose()
    } catch (err: any) {
      error(err?.message || 'Failed to send document to vault')
    }
  }

  const handleSubmitTemplate = async () => {
    if (!selectedTemplate || !templateSubject) return
    try {
      await sendTemplateToVault.mutateAsync({
        content: selectedTemplate.content,
        subject: templateSubject,
        includeLetterhead,
        tenantUuid,
        unitUuid,
      })
      success(`Document sent to ${tenantName || 'tenant'}'s vault successfully`)
      onClose()
    } catch (err: any) {
      error(err?.message || 'Failed to send template to vault')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Document to Vault"
      subtitle={tenantName ? `Push a document to ${tenantName}'s Upward profile.` : 'Push a document to the tenant\'s Upward profile.'}
      icon={FileText}
      maxWidth={580}
      footer={
        activeTab === 'upload' ? (
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={!selectedFile || !fileSubject.trim() || isPending}
              onClick={handleSubmitFile}
            >
              {sendFileToVault.isPending
                ? <><Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />Sending...</>
                : <><Upload size={16} style={{ marginRight: 8 }} />Send to Vault</>
              }
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            {selectedTemplateUuid && onProceedToEditor && (
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1, borderColor: 'var(--forest)', color: 'var(--forest)' }}
                onClick={() => onProceedToEditor(selectedTemplate)}
              >
                Edit & Customize
              </button>
            )}
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={!selectedTemplateUuid || !templateSubject.trim() || isPending}
              onClick={handleSubmitTemplate}
            >
              {sendTemplateToVault.isPending
                ? <><Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />Generating PDF...</>
                : <><FileText size={16} style={{ marginRight: 8 }} />Send to Vault</>
              }
            </button>
          </div>
        )
      }
    >

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--ivory-dim)', padding: 4, borderRadius: 12, marginBottom: 24 }}>
          {(['upload', 'template'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? 'var(--forest)' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab === 'upload' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Paperclip size={16} /> Upload File
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FileText size={16} /> From Template
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Upload File Tab */}
        {activeTab === 'upload' && (
          <div>
            {/* Drag & Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--forest)' : selectedFile ? 'var(--forest)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '32px 24px',
                textAlign: 'center',
                background: dragOver ? 'var(--forest-faint)' : selectedFile ? 'rgba(22,101,52,0.03)' : 'var(--ivory-dim)',
                cursor: selectedFile ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {selectedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <File size={22} color="white" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatSize(selectedFile.size)}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); setFileSubject('') }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    Drag & drop a file here, or click to browse
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, JPG or PNG — max 10MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />

            {selectedFile && (
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                  Document Name (shown to tenant)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={fileSubject}
                  onChange={e => setFileSubject(e.target.value)}
                  placeholder="e.g. Tenancy Agreement 2025"
                  style={{ height: 44, borderRadius: 12, fontSize: 14 }}
                />
              </div>
            )}

            {/* Vault explainer */}
            <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--forest-faint)', border: '1px solid rgba(22,101,52,0.15)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle2 size={16} color="var(--forest)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--forest)', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                This document will appear in the tenant's "My Documents" on Upward, tagged <strong>"From PM"</strong>. They'll also receive an email notification to log in and view it.
              </p>
            </div>

          </div>
        )}

        {/* Template Tab */}
        {activeTab === 'template' && (
          <div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Select Template
              </label>
              {loadingTemplates ? (
                <div style={{ height: 44, borderRadius: 12, background: 'var(--ivory-dim)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : (
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <FormSelect
                    value={selectedTemplateUuid}
                    onChange={val => {
                      setSelectedTemplateUuid(val)
                      const t = templates.find((t: any) => t.uuid === val)
                      if (t && !templateSubject) setTemplateSubject(t.name)
                    }}
                    options={templates
                      .filter((t: any) => t.name !== 'Sample Template')
                      .map((t: any) => ({ label: t.name, value: t.uuid }))}
                    placeholder="-- Choose a template --"
                  />
                </div>
              )}
            </div>

            {selectedTemplateUuid && (
              <>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                    Document Name (shown to tenant)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={templateSubject}
                    onChange={e => setTemplateSubject(e.target.value)}
                    placeholder="e.g. Rent Review Notice - June 2025"
                    style={{ height: 44, borderRadius: 12, fontSize: 14 }}
                  />
                </div>

                {/* Letterhead toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--ivory-dim)', borderRadius: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Include Letterhead</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Wrap document with your PM brand header/footer</div>
                  </div>
                  <button
                    onClick={() => setIncludeLetterhead(!includeLetterhead)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: includeLetterhead ? 'var(--forest)' : 'var(--text-muted)' }}
                  >
                    {includeLetterhead ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>

                {/* Template preview card */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', maxHeight: 180, overflowY: 'auto', marginBottom: 20 }}>
                  <div style={{ padding: '8px 14px', background: 'var(--ivory-dim)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Template Preview
                  </div>
                  <div
                    style={{ padding: '16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: selectedTemplate?.content?.slice(0, 600) + (selectedTemplate?.content?.length > 600 ? '...' : '') || '' }}
                  />
                </div>
              </>
            )}

            {/* Auto-PDF note */}
            <div style={{ marginTop: 4, padding: '12px 16px', background: 'var(--forest-faint)', border: '1px solid rgba(22,101,52,0.15)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle2 size={16} color="var(--forest)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--forest)', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                The template will be auto-converted to <strong>PDF</strong> and saved to the tenant's vault. They'll receive an email notification to log in and view it.
              </p>
            </div>

          </div>
        )}
    </Modal>
  )
}
