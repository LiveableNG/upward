
'use client'

import React, { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '@/components/common/Toast'

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

  if (!isOpen) return null

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
    <div className="modal-overlay" onClick={onClose} style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0, 0, 0, 0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div 
        className="modal animate-scale-in" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: 'white', 
          borderRadius: 24, 
          width: '900px', 
          maxWidth: '95vw', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>Create New Template</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Template Type</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="form-input" 
                  style={{ borderRadius: 12, paddingRight: 40, appearance: 'none' }}
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
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Template Name</label>
              <input 
                type="text" 
                placeholder="Enter template name" 
                className="form-input" 
                style={{ borderRadius: 12 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Template Content</label>
            <div style={{ flex: 1, minHeight: '400px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <RichTextEditor 
                value={content}
                onChange={setContent}
                height="100%"
                placeholder="Start typing your template here..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button 
            onClick={onClose} 
            className="btn btn--secondary" 
            style={{ borderRadius: 12, height: 48, padding: '0 32px', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={isSaving}
            className="btn btn--primary" 
            style={{ 
              borderRadius: 12, 
              height: 48, 
              padding: '0 32px', 
              fontWeight: 600,
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isSaving ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
