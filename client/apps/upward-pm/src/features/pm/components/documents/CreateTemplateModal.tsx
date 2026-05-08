
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
      background: 'rgba(0, 0, 0, 0.75)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 2000, // Higher z-index to cover sidebar
      backdropFilter: 'blur(8px)'
    }}>
      <div 
        className="modal animate-scale-in" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: 'white', 
          borderRadius: 32, 
          width: '96vw', 
          height: '94vh', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Create New Template</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Design your document template with placeholders for dynamic data.</p>
          </div>
          <button onClick={onClose} style={{ background: '#e2e8f0', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '40px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template Type</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    className="form-input" 
                    style={{ borderRadius: 12, paddingRight: 40, appearance: 'none', height: 52, background: '#f1f5f9', border: 'none' }}
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
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Standard Rent Increase Notice" 
                  className="form-input" 
                  style={{ borderRadius: 12, height: 52, background: '#f1f5f9', border: 'none' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="glass" style={{ padding: 20, borderRadius: 20, background: 'var(--forest-faint)', border: '1px solid var(--forest-glow)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)', marginBottom: 8 }}>Pro Tip</h4>
                <p style={{ fontSize: 12, color: 'var(--accent)', lineHeight: 1.5 }}>
                  Use the <strong>Placeholders</strong> menu in the editor to insert tags like [Tenant Name]. These will be automatically filled when you send the document.
                </p>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '65vh' }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Content</label>
              <div style={{ flex: 1, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <RichTextEditor 
                  value={content}
                  onChange={setContent}
                  height="100%"
                  placeholder="Begin drafting your document..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 40px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 16, background: '#f8fafc' }}>
          <button 
            onClick={onClose} 
            className="btn btn--secondary" 
            style={{ borderRadius: 16, height: 56, padding: '0 40px', fontWeight: 600, fontSize: 15 }}
          >
            Discard Changes
          </button>
          <button 
            onClick={handleCreate}
            disabled={isSaving}
            className="btn btn--primary" 
            style={{ 
              borderRadius: 16, 
              height: 56, 
              padding: '0 48px', 
              fontWeight: 700,
              fontSize: 15,
              background: 'var(--forest)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 20px -5px var(--forest-glow)'
            }}
          >
            {isSaving ? 'Saving Template...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
