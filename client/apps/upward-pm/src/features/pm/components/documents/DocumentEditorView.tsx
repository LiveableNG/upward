
'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  Download,
  Send,
  PlusCircle,
  User,
  Building,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useTenants } from '../../hooks/useTenants'
import { useUnit } from '../../hooks/useProperties'
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'

interface DocumentEditorViewProps {
  initialContent?: string
  initialSubject?: string
  initialTemplate?: any
  onBack: () => void
}

export function DocumentEditorView({ 
  initialContent = '', 
  initialSubject = '', 
  initialTemplate,
  onBack 
}: DocumentEditorViewProps) {
  const { success, error } = useToast()
  const { data: tenants = [] } = useTenants()
  const { sendDocument } = useDocuments()
  
  const [content, setContent] = useState(initialTemplate?.content || initialContent)
  const [subject, setSubject] = useState(initialTemplate?.name || initialSubject)
  const [recipientType, setRecipientType] = useState<'existing' | 'new'>('existing')
  const [selectedTenantUuid, setSelectedTenantUuid] = useState('')
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' })
  const [deliveryMode, setDeliveryMode] = useState<'pdf' | 'email'>('pdf')
  const [isSending, setIsSending] = useState(false)

  const selectedTenant = tenants.find(t => t.uuid === selectedTenantUuid)

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  }

  const handleSend = async () => {
    if (!subject) return error('Please enter a subject')
    if (!content) return error('Please enter document content')

    const recipient = recipientType === 'existing' 
      ? { name: `${selectedTenant?.firstName} ${selectedTenant?.lastName}`, email: selectedTenant?.email }
      : newRecipient

    if (!recipient.name || !recipient.email) return error('Please specify a recipient')

    setIsSending(true)
    try {
      await sendDocument.mutateAsync({
        tenantUuid: recipientType === 'existing' ? selectedTenantUuid : undefined,
        subject,
        content,
        documentType: deliveryMode.toUpperCase(),
        recipientName: recipient.name,
        recipientEmail: recipient.email,
      })
      success('Document sent and recorded successfully')
      onBack()
    } catch (err) {
      error('Failed to send document')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="document-editor animate-fade-in">
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={18} /> Back to Documents
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>
            {initialTemplate ? `Edit Template: ${initialTemplate.name}` : 'Create New Document'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn--secondary" 
            style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={20} /> Save as PDF
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending}
            className="btn btn--primary" 
            style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Send size={20} /> {isSending ? 'Sending...' : 'Send Document'}
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 40, alignItems: 'start' }}>
        
        {/* Left Panel: Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'white' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 24 }}>Document Settings</h3>
             
             <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Delivery Mode</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => setDeliveryMode('pdf')}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      borderRadius: 12, 
                      border: `1px solid ${deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--border)'}`,
                      background: deliveryMode === 'pdf' ? 'var(--clay-faint)' : 'white',
                      color: deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Download size={18} /> PDF Attachment
                  </button>
                  <button 
                    onClick={() => setDeliveryMode('email')}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      borderRadius: 12, 
                      border: `1px solid ${deliveryMode === 'email' ? 'var(--clay)' : 'var(--border)'}`,
                      background: deliveryMode === 'email' ? 'var(--clay-faint)' : 'white',
                      color: deliveryMode === 'email' ? 'var(--clay)' : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Mail size={18} /> Email Body
                  </button>
                </div>
             </div>

             <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>From</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value="noreply@goodtenants.io" 
                  disabled
                  style={{ background: '#f8fafc', borderRadius: 12 }}
                />
             </div>

             <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>To Recipient</label>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <button 
                    onClick={() => setRecipientType('existing')}
                    style={{ fontSize: 12, color: recipientType === 'existing' ? 'var(--clay)' : 'var(--text-muted)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Existing Tenant
                  </button>
                  <button 
                    onClick={() => setRecipientType('new')}
                    style={{ fontSize: 12, color: recipientType === 'new' ? 'var(--clay)' : 'var(--text-muted)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    New Recipient
                  </button>
                </div>

                {recipientType === 'existing' ? (
                  <select 
                    className="form-input" 
                    style={{ borderRadius: 12 }}
                    value={selectedTenantUuid}
                    onChange={(e) => setSelectedTenantUuid(e.target.value)}
                  >
                    <option value="">Select a tenant...</option>
                    {tenants.map(t => (
                      <option key={t.uuid} value={t.uuid}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input 
                      type="text" 
                      placeholder="Recipient Name" 
                      className="form-input" 
                      style={{ borderRadius: 12 }}
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    />
                    <input 
                      type="email" 
                      placeholder="Recipient Email" 
                      className="form-input" 
                      style={{ borderRadius: 12 }}
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    />
                  </div>
                )}
             </div>

             <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rent Review Notice" 
                  className="form-input" 
                  style={{ borderRadius: 12 }}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
             </div>
          </div>

          <div className="glass" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--ivory-dim)', display: 'flex', gap: 12 }}>
            <AlertCircle size={20} color="var(--clay)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Use the editor to format your document. You can include dynamic placeholders like [Tenant Name] which will be replaced when sending.
            </p>
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '800px', boxShadow: 'var(--shadow-lg)', borderRadius: 24 }}>
          {/* Toolbar */}
          <div style={{ 
            background: 'white', 
            padding: '16px 32px', 
            borderRadius: '24px 24px 0 0', 
            border: '1px solid var(--border)',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }}
                style={{ padding: 8, borderRadius: 8, background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                title="Bold"
              >
                <Bold size={18} />
              </button>
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }}
                style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                title="Italic"
              >
                <Italic size={18} />
              </button>
            </div>
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand('justifyLeft'); }}
                style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                title="Align Left"
              >
                <AlignLeft size={18} />
              </button>
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand('justifyCenter'); }}
                style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                title="Align Center"
              >
                <AlignCenter size={18} />
              </button>
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand('justifyRight'); }}
                style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                title="Align Right"
              >
                <AlignRight size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }}
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'white' }}
                title="List"
              >
                <List size={18} />
              </button>
            </div>
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
            <button 
              type="button"
              className="hover-bg-faint"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'white', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              <PlusCircle size={16} color="var(--clay)" />
              Signatures
            </button>
          </div>

          {/* Editor Body */}
          <div style={{ 
            background: 'white', 
            flex: 1, 
            borderRadius: '0 0 24px 24px', 
            border: '1px solid var(--border)',
            padding: '60px',
            overflowY: 'auto',
            position: 'relative'
          }}>
            <div 
              contentEditable 
              suppressContentEditableWarning
              onInput={(e) => setContent(e.currentTarget.innerHTML)}
              style={{ 
                outline: 'none', 
                fontSize: 16, 
                lineHeight: 1.8, 
                color: '#1e293b',
                minHeight: '100%',
                fontFamily: "'Inter', sans-serif"
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
            {!content && (
               <div style={{ position: 'absolute', top: 60, left: 60, color: '#94a3b8', pointerEvents: 'none', fontSize: 16 }}>
                 Start typing your document here...
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
