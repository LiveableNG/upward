
'use client'

import React, { useState } from 'react'
import { 
  ChevronLeft, 
  Download,
  Send,
  Mail,
  Users,
  AlertCircle
} from 'lucide-react'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { useTenants } from '../../hooks/useTenants'
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { RecipientSelectModal } from './RecipientSelectModal'
import { useCreatePaymentRequest } from '../../hooks/usePayments'
import { CreditCard } from 'lucide-react'

interface DocumentEditorViewProps {
  initialContent?: string
  initialSubject?: string
  initialTemplate?: any
  initialRecipient?: {
    type: 'existing' | 'new'
    uuid?: string
    name?: string
    email?: string
    deliveryMode?: 'pdf' | 'email'
  }
  paymentContext?: any
  onBack: () => void
}

export function DocumentEditorView({ 
  initialContent = '', 
  initialSubject = '', 
  initialTemplate,
  initialRecipient,
  paymentContext,
  onBack 
}: DocumentEditorViewProps) {
  const { success, error } = useToast()
  const { data: tenants = [] } = useTenants()
  const { sendDocument, generatePdf } = useDocuments()
  const { mutateAsync: createPaymentRequest } = useCreatePaymentRequest()
  
  const [content, setContent] = useState(() => {
    const baseContent = initialTemplate?.content || initialContent;
    if (paymentContext && !baseContent.includes('[PaymentLink]') && !baseContent.includes('[Payment Link]')) {
      return baseContent + `
        <br/><br/>
        <div style="margin-top: 40px; padding: 32px; background-color: #faf9f5; border-radius: 20px; text-align: center; border: 1px solid #e8e6dd; font-family: sans-serif;">
          <div style="display: inline-block; width: 48px; height: 48px; background-color: #f0fdf4; border-radius: 50%; color: #16a34a; line-height: 48px; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
            ✓
          </div>
          <h2 style="margin: 0 0 8px 0; color: #0a0a0f; font-size: 18px; font-weight: 700;">Secure Payment Link</h2>
          <p style="margin: 0 0 24px 0; color: #4a4642; font-size: 14px; line-height: 1.5;">To settle this request, please use the secure payment button below.</p>
          <a href="[PaymentLink]" style="display: inline-block; background-color: #166534; color: #ffffff; padding: 14px 40px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px;">Pay Securely Now</a>
          <div style="margin-top: 20px; font-size: 11px; color: #8a8a8a;">
            Or copy and paste this link into your browser: <br/>
            <a href="[PaymentLink]" style="color: #166534; text-decoration: underline;">[PaymentLink]</a>
          </div>
        </div>
      `;
    }
    return baseContent;
  })
  const [subject, setSubject] = useState(initialTemplate?.name || initialSubject)
  const [recipientType, setRecipientType] = useState<'existing' | 'new'>(initialRecipient?.type || 'existing')
  const [selectedTenantUuid, setSelectedTenantUuid] = useState(initialRecipient?.uuid || '')
  const [newRecipient, setNewRecipient] = useState({ 
    name: initialRecipient?.name || '', 
    email: initialRecipient?.email || '' 
  })
  const [deliveryMode, setDeliveryMode] = useState<'pdf' | 'email'>(initialRecipient?.deliveryMode || 'pdf')
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false)
  const [includeLetterhead, setIncludeLetterhead] = useState(true)
  const { user } = useAuth()
  const hasLetterhead = !!(user?.letterheadHeaderUrl || user?.letterheadFooterUrl)

  const selectedTenant = tenants.find(t => t.uuid === selectedTenantUuid)

  const handleSaveAsPdf = async () => {
    if (!content) return error('No content to download')
    setIsDownloading(true)
    try {
      const recipientName = recipientType === 'existing' 
        ? (selectedTenant ? `${selectedTenant.firstName} ${selectedTenant.lastName}` : undefined)
        : newRecipient.name;

      const blob = await generatePdf.mutateAsync({ 
        content, 
        tenantUuid: recipientType === 'existing' ? (selectedTenantUuid || undefined) : undefined,
        recipientName: recipientName || undefined,
        includeLetterhead: hasLetterhead ? includeLetterhead : false
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${subject || 'document'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      success('PDF downloaded successfully')
    } catch (err) {
      error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
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
      let paymentRequestUuid = undefined;

      if (paymentContext) {
        // 1. Create Payment Request
        const resp = await createPaymentRequest(paymentContext);
        paymentRequestUuid = resp.uuid;
      }

      // 2. Send Document (linked to payment if context exists)
      await sendDocument.mutateAsync({
        tenantUuid: recipientType === 'existing' ? selectedTenantUuid : undefined,
        subject,
        content,
        documentType: deliveryMode.toUpperCase(),
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        paymentRequestUuid, // New field
        includeLetterhead: hasLetterhead ? includeLetterhead : false
      })
      
      success(paymentContext ? 'Payment request and document sent successfully' : 'Document sent and recorded successfully')
      onBack()
    } catch (err: any) {
      error(err.message || (paymentContext ? 'Failed to process payment request' : 'Failed to send document'))
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
            onClick={handleSaveAsPdf}
            disabled={isDownloading}
            className="btn btn--secondary" 
            style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={20} /> {isDownloading ? 'Downloading...' : 'Save as PDF'}
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending}
            className="btn btn--primary" 
            style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {paymentContext ? <CreditCard size={20} /> : <Send size={20} />} 
            {isSending ? 'Processing...' : paymentContext ? 'Request Payment' : 'Send Document'}
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
                      gap: 4,
                      position: 'relative'
                    }}
                  >
                    <div style={{ 
                        position: 'absolute', 
                        top: 8, 
                        left: 8, 
                        width: 14, 
                        height: 14, 
                        borderRadius: '50%', 
                        border: `1.5px solid ${deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                     }}>
                        {deliveryMode === 'pdf' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clay)' }}></div>}
                     </div>
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
                      gap: 4,
                      position: 'relative'
                    }}
                  >
                    <div style={{ 
                        position: 'absolute', 
                        top: 8, 
                        left: 8, 
                        width: 14, 
                        height: 14, 
                        borderRadius: '50%', 
                        border: `1.5px solid ${deliveryMode === 'email' ? 'var(--clay)' : 'var(--border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                     }}>
                        {deliveryMode === 'email' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clay)' }}></div>}
                     </div>
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
                    Existing Recipient
                  </button>
                  <button 
                    onClick={() => setRecipientType('new')}
                    style={{ fontSize: 12, color: recipientType === 'new' ? 'var(--clay)' : 'var(--text-muted)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    New Recipient
                  </button>
                </div>

                {recipientType === 'existing' ? (
                  <div 
                    onClick={() => setIsRecipientModalOpen(true)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: 14, 
                      border: '1px solid var(--border)', 
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedTenant ? 'var(--bg)' : 'white'
                    }}
                  >
                    <span style={{ fontSize: 14, color: selectedTenant ? 'var(--dark)' : 'var(--text-muted)', fontWeight: selectedTenant ? 600 : 400 }}>
                      {selectedTenant ? `${selectedTenant.firstName} ${selectedTenant.lastName}` : 'Select a recipient...'}
                    </span>
                    <Users size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
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

             {hasLetterhead && (
               <div 
                 onClick={() => setIncludeLetterhead(!includeLetterhead)}
                 style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', paddingTop: 20, marginTop: 20, borderTop: '1px solid var(--bg)' }}
               >
                 <div style={{ 
                   width: 18, 
                   height: 18, 
                   borderRadius: 4, 
                   border: `1px solid ${includeLetterhead ? 'var(--forest)' : 'var(--border)'}`,
                   background: includeLetterhead ? 'var(--forest)' : 'white',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   color: 'white'
                 }}>
                   {includeLetterhead && <div style={{ width: 8, height: 8, background: 'white', borderRadius: 1 }}></div>}
                 </div>
                 <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Include custom letterhead</span>
               </div>
             )}
          </div>

          <div className="glass" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--ivory-dim)', display: 'flex', gap: 12 }}>
            <AlertCircle size={20} color="var(--clay)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Use the professional editor to format your document. You can include dynamic placeholders like [Tenant Name] or [PaymentLink] which will be replaced when sending.
            </p>
          </div>
        </div>

        {/* Right Panel: Rich Text Editor */}
        <div style={{ height: '800px', boxShadow: 'var(--shadow-lg)', borderRadius: 24, background: 'white' }}>
          <RichTextEditor
            value={content}
            onChange={(newContent) => setContent(newContent)}
            height="100%"
          />
        </div>
      </div>

      <RecipientSelectModal 
        isOpen={isRecipientModalOpen}
        onClose={() => setIsRecipientModalOpen(false)}
        onSelect={(r) => {
          setSelectedTenantUuid(r.uuid)
          setIsRecipientModalOpen(false)
        }}
      />

      <style jsx>{`
        .document-editor {
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 40px;
        }
        .glass {
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
        }
        .form-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          border: 1px solid var(--border);
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: var(--clay);
        }
      `}</style>
    </div>
  )
}
