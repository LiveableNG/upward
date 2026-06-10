'use client'

import React, { useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '@/components/common/Toast'
import { Modal } from '@/components/ui/Modal/Modal'

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTemplateModal({ isOpen, onClose }: CreateTemplateModalProps) {
  const { success, error } = useToast()
  const { saveTemplate } = useDocuments()
  
  const [name, setName] = useState('')
  const [type, setType] = useState('RENT_REVIEW')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    if (!name) return error('Please enter a template name')
    if (!content) return error('Please enter template content')

    setIsSaving(true)
    try {
      await saveTemplate.mutateAsync({
        name,
        type,
        content
      })
      success('Template created successfully')
      onClose()
      // Reset fields
      setName('')
      setContent('')
    } catch (err) {
      error('Failed to create template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Template"
      subtitle="Design your document template with placeholders for dynamic data."
      icon={FileText}
      maxWidth="1100px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, width: '100%' }}>
          <button 
            onClick={onClose} 
            className="btn btn--secondary" 
            style={{ borderRadius: 12, height: 48, padding: '0 24px' }}
          >
            Discard Changes
          </button>
          <button 
            onClick={handleCreate}
            disabled={isSaving}
            className="btn btn--primary" 
            style={{ 
              borderRadius: 12, 
              height: 48, 
              padding: '0 32px',
              background: 'var(--forest)',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isSaving ? 'Saving Template...' : 'Create Template'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Template Type</label>
            <div style={{ position: 'relative' }}>
              <select 
                className="form-input" 
                style={{ borderRadius: 12, paddingRight: 40, height: 52, background: 'var(--bg)', border: '1px solid var(--border)', width: '100%' }}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="RENT_REVIEW">Rent Review</option>
                <option value="RENT_RENEWAL">Rent Renewal</option>
                <option value="LEASE_AGREEMENT">Lease Agreement</option>
                <option value="EVICTION_NOTICE">Eviction Notice</option>
                <option value="CUSTOM">Custom Template</option>
              </select>
              <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Template Name</label>
            <input 
              type="text" 
              placeholder="e.g. Standard Rent Increase Notice" 
              className="form-input" 
              style={{ borderRadius: 12, height: 52, background: 'var(--bg)', border: '1px solid var(--border)', width: '100%' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="form-label" style={{ margin: 0 }}>Template Content</label>
            <div>
              <button
                type="button"
                onClick={() => document.getElementById('template-word-upload')?.click()}
                className="btn btn--secondary"
                style={{ 
                  borderRadius: 10, 
                  padding: '4px 12px', 
                  height: 32, 
                  fontSize: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  border: '1px solid var(--border-strong)',
                  cursor: 'pointer',
                  background: 'none'
                }}
              >
                <FileText size={14} /> Import from Word (.docx)
              </button>
              <input
                id="template-word-upload"
                type="file"
                accept=".docx"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  try {
                    const arrayBuffer = await file.arrayBuffer()
                    const mammoth = (await import('mammoth')).default
                    const result = await mammoth.convertToHtml({ arrayBuffer })
                    setContent(result.value)
                    if (!name) {
                      setName(file.name.replace('.docx', ''))
                    }
                    success('Word document imported successfully')
                  } catch (err) {
                    console.error('Failed to convert word doc:', err)
                    error('Failed to convert Word document')
                  }
                }}
              />
            </div>
          </div>
          <div style={{ flex: 1, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 400 }}>
            <RichTextEditor 
              value={content}
              onChange={setContent}
              height="400px"
              placeholder="Begin drafting your document..."
            />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderRadius: 12, background: 'var(--forest-faint)', border: '1px solid var(--forest-glow)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--forest)', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>!</div>
          <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.5, margin: 0 }}>
            <strong>Pro Tip:</strong> Use the <strong>Placeholders</strong> menu in the editor to insert tags like [Tenant Name]. These will be automatically filled when you send the document.
          </p>
        </div>
      </div>
    </Modal>
  )
}
