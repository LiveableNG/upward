
'use client'

import React, { useState, useEffect } from 'react'
import {
  ChevronLeft,
  Download,
  Send,
  Mail,
  Users,
  AlertCircle,
  Eye,
  Loader2,
  MessageCircle,
  Check,
  PanelLeft,
  ChevronDown,
  FileText
} from 'lucide-react'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/common/RichTextEditor').then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="animate-pulse h-[400px] bg-slate-100 rounded-md w-full" /> }
)
import { useTenants, useTenantActions } from '../../hooks/useTenants'
import { useDocuments, useVaultActions } from '../../hooks/useDocuments'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { Modal } from '@/components/ui/Modal/Modal'
import { BulkRecipientSelectModal, Recipient } from './BulkRecipientSelectModal'
import { useCreatePaymentRequest } from '../../hooks/usePayments'
import { CreditCard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { downloadBlob } from '@/lib/download-helper'

interface BulkDocumentEditorViewProps {
  initialContent?: string
  initialSubject?: string
  initialTemplate?: any
  initialRecipients?: Recipient[]
  onBack: () => void
}

export function BulkDocumentEditorView({
  initialContent = '',
  initialSubject = '',
  initialTemplate,
  initialRecipients = [],
  onBack,
}: BulkDocumentEditorViewProps) {
  const { success, error } = useToast()
  const { data: tenants = [] } = useTenants()
  const { sendBulkDocument, generatePdf, templates = [] } = useDocuments()
  const { sendTemplateToVault } = useVaultActions()
  const { mutateAsync: createPaymentRequest } = useCreatePaymentRequest()

  const [content, setContent] = useState(initialTemplate?.content || initialContent)
  const { user } = useAuth()
  const [fromEmail, setFromEmail] = useState(user?.email || 'noreply@goodtenants.io')
  const [subject, setSubject] = useState(initialTemplate?.subject || initialTemplate?.name || initialSubject)
  const [recipients, setRecipients] = useState(initialRecipients)
  const [deliveryMode, setDeliveryMode] = useState<'email' | 'sms' | 'whatsapp'>('email')
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'text'>('pdf')
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showSettings, setShowSettings] = useState(true)
  const [showRecipientsList, setShowRecipientsList] = useState(false)
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(!initialContent && !initialTemplate?.content)
  const [includeLetterhead, setIncludeLetterhead] = useState(true)
  const [tempEmail, setTempEmail] = useState('')
  const { updateTenant } = useTenantActions()
  const { data: letterheads = [] } = useQuery<any[]>({
    queryKey: ['letterheads'],
    queryFn: () => api.fetchLetterheads()
  })
  const hasLetterhead = letterheads.length > 0 || !!(user?.letterheadHeaderUrl || user?.letterheadFooterUrl)

  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const [currentTemplate, setCurrentTemplate] = useState<any>(initialTemplate)
  const isSystemTemplate = currentTemplate?.type === 'SYSTEM' || currentTemplate?.isSystem
  const [previewMode, setPreviewMode] = useState(false)

  const validRecipients = React.useMemo(() => {
    return recipients.filter(r => {
      if (deliveryMode === 'email') {
        return r.email && !r.email.endsWith('@upward.com')
      }
      return !!r.phone
    })
  }, [recipients, deliveryMode])

  const invalidRecipients = React.useMemo(() => {
    return recipients.filter(r => !validRecipients.find(v => v.uuid === r.uuid))
  }, [recipients, validRecipients])

  const getRenderedContent = () => {
    let rendered = content
    if (!rendered) return ''

    // Resolve Date formatting helper
    const formatDate = (dateVal: any) => {
      if (!dateVal) return '__________'
      return new Date(dateVal).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    const calculateEndDate = (start: any) => {
      if (!start) return '__________'
      const end = new Date(start)
      end.setFullYear(end.getFullYear() + 1)
      end.setDate(end.getDate() - 1)
      return formatDate(end)
    }

    // Current date values
    const now = new Date()
    const currentYear = now.getFullYear().toString()
    const currentMonth = now.toLocaleString('default', { month: 'long' })
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = nextMonthDate.toLocaleString('default', { month: 'long' })
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonth = previousMonthDate.toLocaleString('default', { month: 'long' })

    const dateValues: Record<string, string> = {
      '[Date]': formatDate(now),
      '[CurrentDate]': formatDate(now),
      '[Current Date]': formatDate(now),
      '[CurrentMonth]': currentMonth,
      '[Current Month]': currentMonth,
      '[CurrentYear]': currentYear,
      '[Current Year]': currentYear,
      '[NextMonth]': nextMonth,
      '[Next Month]': nextMonth,
      '[PreviousMonth]': previousMonth,
      '[Previous Month]': previousMonth,
      '[DocumentDate]': formatDate(now),
      '[Document Date]': formatDate(now),
      '[DocumentNumber]': 'DOC-PREVIEW',
      '[Document Number]': 'DOC-PREVIEW',
      '[DocumentType]': deliveryMode.toUpperCase(),
      '[Document Type]': deliveryMode.toUpperCase(),
    }

    // Property Manager / Company Values
    const pmValues: Record<string, string> = {
      '[CompanyName]': user?.businessName || '__________',
      '[Company Name]': user?.businessName || '__________',
      '[CompanyAddress]': user?.country || '__________',
      '[Company Address]': user?.country || '__________',
      '[CompanyPhone]': user?.phone || '__________',
      '[Company Phone]': user?.phone || '__________',
      '[CompanyEmail]': user?.email || '__________',
      '[Company Email]': user?.email || '__________',
      '[ManagerName]': user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'The Property Manager',
      '[Manager Name]': user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'The Property Manager',
      '[ManagerPhone]': user?.phone || '__________',
      '[Manager Phone]': user?.phone || '__________',
      '[ManagerEmail]': user?.email || '__________',
      '[Manager Email]': user?.email || '__________',
    }

    // Recipient & Tenant Values
    let recipientName = recipients[0]?.name || 'Recipient'
    let recipientEmail = recipients[0]?.email || ''
    let tenantPhone = recipients[0]?.phone || '__________'
    let tenantAddress = '__________'
    let tenantFirstName = recipientName.split(' ')[0] || '__________'
    let tenantLastName = recipientName.split(' ').slice(1).join(' ') || '__________'

    const tenantValues: Record<string, string> = {
      '[Recipient Name]': recipientName || '__________',
      '[TenantName]': recipientName || '__________',
      '[Tenant Name]': recipientName || '__________',
      '[TenantFirstName]': tenantFirstName,
      '[Tenant FirstName]': tenantFirstName,
      '[TenantLastName]': tenantLastName,
      '[Tenant LastName]': tenantLastName,
      '[TenantEmail]': recipientEmail || '__________',
      '[Tenant Email]': recipientEmail || '__________',
      '[TenantPhone]': tenantPhone,
      '[Tenant Phone]': tenantPhone,
      '[TenantAddress]': tenantAddress,
      '[Tenant Address]': tenantAddress,
    }

    // Unit & Property Values
    let resolvedUnit: any = null

    let unitName = resolvedUnit?.unitName || '__________'
    let propertyName = resolvedUnit?.property?.name || '__________'
    let propertyAddress = resolvedUnit?.property?.address || '__________'
    let landlordName = (resolvedUnit?.property as any)?.landlordName || '__________'
    let landlordEmail = (resolvedUnit?.property as any)?.landlordEmail || '__________'
    let rentAmountVal = resolvedUnit?.rentAmount
    let rentAmountStr = rentAmountVal ? `${resolvedUnit.currency || '₦'}${rentAmountVal.toLocaleString()}` : '__________'
    let rentTypeVal = resolvedUnit?.rentType || 'Monthly'
    let rentStartDateVal = resolvedUnit?.rentStartDate
    let rentDueDateVal = resolvedUnit?.rentDueDate
    let rentDuration = rentTypeVal === 'YEARLY' ? '12 Months' : rentTypeVal === 'MONTHLY' ? '1 Month' : '__________'

    const unitValues: Record<string, string> = {
      '[UnitName]': unitName,
      '[Unit Name]': unitName,
      '[UnitNumber]': unitName,
      '[Unit Number]': unitName,
      '[PropertyName]': propertyName,
      '[Property Name]': propertyName,
      '[PropertyAddress]': propertyAddress,
      '[Property Address]': propertyAddress,
      '[PropertyType]': resolvedUnit?.unitType || 'Residential',
      '[Property Type]': resolvedUnit?.unitType || 'Residential',
      '[Bedrooms]': 'N/A',
      '[Bathrooms]': 'N/A',
      '[RentAmount]': rentAmountStr,
      '[Rent Amount]': rentAmountStr,
      '[RentType]': rentTypeVal,
      '[Rent Type]': rentTypeVal,
      '[RentStartDate]': formatDate(rentStartDateVal),
      '[Rent Start Date]': formatDate(rentStartDateVal),
      '[RentEndDate]': calculateEndDate(rentStartDateVal),
      '[Rent End Date]': calculateEndDate(rentStartDateVal),
      '[LeaseStartDate]': formatDate(rentStartDateVal),
      '[Lease Start Date]': formatDate(rentStartDateVal),
      '[LeaseEndDate]': calculateEndDate(rentStartDateVal),
      '[Lease End Date]': calculateEndDate(rentStartDateVal),
      '[LeaseDuration]': rentDuration,
      '[Lease Duration]': rentDuration,
      '[RentDuration]': rentDuration,
      '[Rent Duration]': rentDuration,
      '[ServiceCharge]': 'N/A',
      '[Service Charge]': 'N/A',
      '[TotalAmount]': rentAmountStr,
      '[Total Amount]': rentAmountStr,
      '[PaymentDueDate]': formatDate(rentDueDateVal),
      '[Payment Due Date]': formatDate(rentDueDateVal),
      '[OutstandingBalance]': 'N/A',
      '[Outstanding Balance]': 'N/A',
      '[LastPaymentDate]': 'N/A',
      '[Last Payment Date]': 'N/A',
      '[LastPaymentAmount]': 'N/A',
      '[Last Payment Amount]': 'N/A',
      '[LandlordName]': landlordName,
      '[LandlordEmail]': landlordEmail,
    }

    // Payment link/URL replacements
    const paymentValues: Record<string, string> = {
      '[PaymentURL]': '__________',
      '[Payment URL]': '__________',
      '[PaymentLink]': '__________',
      '[Payment Link]': '__________',
      '[BankDetails]': '__________',
      '[Bank Details]': '__________',
      '[PaymentInfo]': '__________',
      '[Payment Info]': '__________',
    }

    const replacements = {
      ...dateValues,
      ...pmValues,
      ...tenantValues,
      ...unitValues,
      ...paymentValues,
    }

    Object.entries(replacements).forEach(([placeholder, value]) => {
      rendered = rendered.split(placeholder).join(value)
    })

    return rendered
  }

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl)
      }
    }
  }, [previewPdfUrl])

  const handleSaveAsPdf = async () => {
    if (!content) return error('No content to download')
    setIsDownloading(true)
    try {
      const blob = await generatePdf.mutateAsync({
        content,
        recipientName: 'Tenants',
        includeLetterhead: hasLetterhead ? includeLetterhead : false
      })
      await downloadBlob(blob, `${subject || 'document'}.pdf`)
      success('PDF downloaded successfully')
    } catch (err) {
      error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePreviewPdf = async () => {
    if (!content) return error('No content to preview')
    setIsPreviewLoading(true)
    try {
      const blob = await generatePdf.mutateAsync({
        content,
        recipientName: "Tenants",
        includeLetterhead: hasLetterhead ? includeLetterhead : false
      })

      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl)
      }

      const url = window.URL.createObjectURL(blob)
      setPreviewPdfUrl(url)
      setIsPreviewingPdf(true)
      success('Preview generated successfully')
    } catch (err) {
      error('Failed to generate preview PDF')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleSendDocument = async () => {
    if (isSystemTemplate && !fromEmail.trim()) {
      return error('From email cannot be empty for system templates')
    }
    if (!subject) {
      error("Please enter a document subject")
      return
    }
    if (recipients.length === 0) {
      error("Please select at least one recipient")
      return
    }
    if (validRecipients.length === 0) {
      error(`No valid recipients for ${deliveryMode} delivery.`)
      return
    }

    setIsSending(true)
    try {
      await sendBulkDocument.mutateAsync({
        fromEmail: isSystemTemplate ? fromEmail : undefined,
        subject,
        content,
        documentType: deliveryMode === 'whatsapp' ? 'PDF' : (deliveryMode === 'email' ? (emailFormat === 'pdf' ? 'PDF' : 'EMAIL') : 'SMS'),
        includeLetterhead: hasLetterhead ? includeLetterhead : false,
        deliveryChannel: deliveryMode === 'whatsapp' ? 'WHATSAPP' : (deliveryMode === 'sms' ? 'SMS' : 'EMAIL'),
        templateId: currentTemplate?.id,
        templateName: currentTemplate?.name || currentTemplate?.subject || subject,
        recipients: validRecipients.map(r => ({
          uuid: r.uuid,
          type: r.type,
          email: r.email,
          phone: r.phone,
          name: r.name
        }))
      })

      if (deliveryMode === 'whatsapp') {
        await handleDownloadPdf()
      } else {
        success(`Document dispatch initiated for ${validRecipients.length} recipients.`)
      }
      setTimeout(() => {
        onBack()
      }, 1500)
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to send bulk documents')
    } finally {
      setIsSending(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!content) return
    setIsDownloading(true)
    try {
      // Generate a generic PDF for bulk
      const blob = await generatePdf.mutateAsync({
        content,
        recipientName: "Tenants",
        includeLetterhead: hasLetterhead ? includeLetterhead : false,
      })
      await downloadBlob(blob, `${subject || 'bulk_document'}.pdf`)
      success('PDF downloaded successfully')
    } catch (err) {
      error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <div className="document-editor animate-fade-in">
        <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronLeft size={18} /> Back to Documents
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>
                Bulk Document Dispatch
              </h1>
            </div>
          </div>
          <div className="settings-panel animate-slide-left" style={{ display: 'flex', gap: 12 }}>
            {deliveryMode !== 'whatsapp' ? (
              <button
                className="btn btn--primary"
                style={{ flex: 1, padding: '0 24px', borderRadius: 12, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleSendDocument}
                disabled={isSending}
              >
                {isSending ? <><Loader2 size={18} className="animate-spin" /> Dispatching...</> : <><Send size={18} /> Dispatch to {validRecipients.length}</>}
              </button>
            ) : (
              <button
                className="btn btn--secondary"
                style={{ flex: 1, padding: '0 24px', borderRadius: 12, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderColor: 'var(--forest)', color: 'var(--forest)' }}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? <><Loader2 size={18} className="animate-spin" /> Generating PDF...</> : <><Download size={18} /> Generate PDF for WhatsApp</>}
              </button>
            )}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: showSettings ? '400px 1fr' : '1fr', gap: 40, alignItems: 'start', transition: 'all 0.3s' }}>

          {/* Left Panel: Settings */}
          {showSettings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'white' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 24 }}>Document Settings</h3>

                <div className="section" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Template</label>
                    <button
                      onClick={() => setIsTemplateModalOpen(true)}
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Change Template
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', color: 'var(--clay)' }}>
                      <FileText size={16} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subject || 'Blank Document'}
                    </div>
                  </div>
                </div>

                <div className="section" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: showRecipientsList ? 0 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Recipients</label>
                      {invalidRecipients.length > 0 && (
                        <button
                          onClick={() => setShowRecipientsList(true)}
                          style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <AlertCircle size={12} />
                          {invalidRecipients.length} Excluded (Invalid {deliveryMode === 'email' ? 'Email' : 'Phone'}) - Click to view
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                        {validRecipients.length} Selected
                      </div>
                      <button
                        onClick={() => setIsRecipientModalOpen(true)}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        + Add
                      </button>
                      <button
                        onClick={() => setShowRecipientsList(!showRecipientsList)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
                      >
                        <ChevronDown size={14} style={{ transform: showRecipientsList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                    </div>
                  </div>

                  {showRecipientsList && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', background: 'var(--bg)', borderRadius: 12, padding: 12, border: '1px solid var(--border)', marginTop: 16 }}>
                      {validRecipients.map(r => (
                        <div key={r.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email || r.phone || 'No Contact'}</div>
                        </div>
                      ))}
                      {invalidRecipients.map(r => (
                        <div key={r.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)', padding: '8px 12px', borderRadius: 8, border: '1px dashed var(--border)', opacity: 0.6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={14} color="var(--error)" />
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{r.name}</div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--error)' }}>Invalid {deliveryMode === 'email' ? 'Email' : 'Phone'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="section" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                  <label className="form-label">Delivery Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { id: 'email', label: 'Email', icon: Mail, desc: 'Send via Email' },
                      { id: 'sms', label: 'SMS', icon: MessageCircle, desc: 'Send Text' },
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, desc: 'Broadcast' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setDeliveryMode(mode.id as any)}
                        className={`mode-btn ${deliveryMode === mode.id ? 'active' : ''}`}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: `1px solid ${deliveryMode === mode.id ? 'var(--clay)' : 'var(--border)'}`,
                          background: deliveryMode === mode.id ? 'var(--clay-faint)' : 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <mode.icon size={18} color={deliveryMode === mode.id ? 'var(--clay)' : 'var(--text-muted)'} />
                        <div style={{ fontWeight: 600, color: deliveryMode === mode.id ? 'var(--clay)' : 'var(--text-secondary)' }}>{mode.label}</div>
                        <div style={{ fontSize: 11, color: deliveryMode === mode.id ? 'var(--forest)' : 'var(--text-muted)' }}>{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                  {deliveryMode === 'email' && (
                    <div style={{ marginTop: 12, display: 'flex', background: 'var(--bg)', borderRadius: 12, padding: 4 }}>
                      <button
                        onClick={() => setEmailFormat('pdf')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          background: emailFormat === 'pdf' ? 'white' : 'transparent',
                          color: emailFormat === 'pdf' ? 'var(--clay)' : 'var(--text-muted)',
                          boxShadow: emailFormat === 'pdf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Download size={14} /> PDF Attachment
                      </button>
                      <button
                        onClick={() => setEmailFormat('text')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          background: emailFormat === 'text' ? 'white' : 'transparent',
                          color: emailFormat === 'text' ? 'var(--clay)' : 'var(--text-muted)',
                          boxShadow: emailFormat === 'text' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Mail size={14} /> Email Text
                      </button>
                    </div>
                  )}
                  {deliveryMode === 'whatsapp' && (
                    <div style={{ marginTop: 16, padding: 16, background: 'var(--accent-faint)', borderRadius: 12, border: '1px solid var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                        <AlertCircle size={16} /> WhatsApp Bulk Policy
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        To prevent spam blocks, we do not automate mass WhatsApp messages. Instead, click <strong>Generate PDF</strong> below, then create a <strong style={{ color: 'var(--dark)' }}>Broadcast List</strong> in your WhatsApp application and attach the PDF to send it to all recipients securely.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>From</label>
                  <input
                    type="text"
                    className="form-input"
                    value={isSystemTemplate ? fromEmail : 'noreply@goodtenants.io'}
                    onChange={(e) => setFromEmail(e.target.value)}
                    disabled={!isSystemTemplate}
                    style={{ background: !isSystemTemplate ? '#f8fafc' : 'white', borderRadius: 12 }}
                  />
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

                {hasLetterhead && (deliveryMode === 'whatsapp' || (deliveryMode === 'email' && emailFormat === 'pdf')) && (
                  <div
                    onClick={() => setIncludeLetterhead(!includeLetterhead)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', paddingTop: 20, marginTop: 20, borderTop: '1px solid var(--bg)' }}
                  >
                    <div style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      background: includeLetterhead ? 'var(--forest)' : 'var(--border)',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0
                    }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 2,
                        left: includeLetterhead ? 18 : 2,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Include custom letterhead</span>
                  </div>
                )}
              </div>

              <div className="glass" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--ivory-dim)', display: 'flex', gap: 12 }}>
                <AlertCircle size={20} color="var(--clay)" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  {isSystemTemplate
                    ? "This is a read-only system template provided by Upward. You can send it directly or include your custom letterhead."
                    : "Double check your document content and recipient details before sending. You can include dynamic placeholders like [Tenant Name], [BankDetails], [PaymentURL] or [PaymentInfo] which will be replaced when sending."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Right Panel: Rich Text Editor or Live Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    background: 'white',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <PanelLeft size={16} />
                  {showSettings ? 'Hide Settings' : 'Show Settings'}
                </button>
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--ivory-dim)',
                  padding: 4,
                  borderRadius: 12,
                  border: '1px solid var(--border)'
                }}>
                  <button
                    onClick={() => setPreviewMode(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      background: !previewMode ? 'white' : 'transparent',
                      color: !previewMode ? 'var(--dark)' : 'var(--text-muted)',
                      boxShadow: !previewMode ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Edit Template
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      background: previewMode ? 'white' : 'transparent',
                      color: previewMode ? 'var(--dark)' : 'var(--text-muted)',
                      boxShadow: previewMode ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Live Preview
                  </button>
                </div>
              </div>
              {previewMode && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span>
                  Showing rendered placeholders
                </span>
              )}
            </div>

            {previewMode ? (
              <div style={{
                flex: 1,
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 24,
                background: 'white',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  flex: 1,
                  padding: '40px',
                  background: 'var(--ivory)',
                  minHeight: '100%',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '100%',
                    maxWidth: '800px',
                    minHeight: '297mm',
                    background: 'white',
                    boxShadow: 'var(--shadow-md)',
                    borderRadius: 8,
                    padding: '20mm',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'var(--font-main)',
                    color: 'var(--text)',
                    fontSize: '15px',
                    lineHeight: 1.6
                  }}>
                    {/* Header Letterhead */}
                    {includeLetterhead && user?.letterheadHeaderUrl && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                        <img src={user.letterheadHeaderUrl} style={{ maxWidth: '100%', maxHeight: '30mm', objectFit: 'contain' }} alt="Letterhead Header" />
                      </div>
                    )}

                    {/* Document Body */}
                    <div
                      className="preview-body-content"
                      style={{ flex: 1, color: '#1e293b' }}
                      dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
                    />

                    {/* Footer Letterhead */}
                    {includeLetterhead && user?.letterheadFooterUrl && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <img src={user.letterheadFooterUrl} style={{ maxWidth: '100%', maxHeight: '20mm', objectFit: 'contain' }} alt="Letterhead Footer" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, boxShadow: 'var(--shadow-lg)', borderRadius: 24, background: 'white', overflow: 'hidden' }}>
                <RichTextEditor
                  disabled={isSystemTemplate}
                  value={content}
                  onChange={(newContent) => setContent(newContent)}
                  height="100%"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <BulkRecipientSelectModal
        isOpen={isRecipientModalOpen}
        onClose={() => setIsRecipientModalOpen(false)}
        initialSelected={recipients as any}
        onConfirm={(selectedRecipients) => {
          setRecipients(selectedRecipients as any)
          setIsRecipientModalOpen(false)
        }}
      />

      <Modal
        isOpen={isPreviewingPdf && !!previewPdfUrl}
        onClose={() => setIsPreviewingPdf(false)}
        title="PDF Document Preview"
        subtitle="Review formatting and custom letterhead overlay."
        maxWidth={1000}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 12 }}>
            <button
              onClick={onBack}
              className="btn btn--secondary"
              disabled={isSending || isDownloading}
              style={{ borderRadius: 100, padding: '10px 24px', flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              onClick={() => setIsPreviewingPdf(false)}
              className="btn btn--primary"
              style={{ borderRadius: 12, height: 44, padding: '0 24px' }}
            >
              Close Preview
            </button>
          </div>
        }
      >
        <div style={{ height: '70vh', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginTop: 16 }}>
          <iframe
            src={previewPdfUrl || undefined}
            title="PDF Document Preview"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          // If they close without selecting and have no content, we let them proceed with a blank doc
          setIsTemplateModalOpen(false)
        }}
        title="Select a Document Template"
        subtitle="Choose a template to use for your bulk dispatch, or start from scratch."
        maxWidth={700}
      >
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={() => {
              setIsTemplateModalOpen(false)
            }}
            style={{ width: '100%', padding: '16px', borderRadius: 12, background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            + Start with a Blank Document
          </button>

          <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {templates.map((t: any) => (
              <div
                key={t.uuid}
                onClick={() => {
                  setCurrentTemplate(t)
                  setContent(t.content)
                  setSubject(t.subject || t.name)
                  setIsTemplateModalOpen(false)
                }}
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                className="template-select-item"
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.type}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--clay)', fontWeight: 600 }}>Select</div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .template-select-item:hover {
          border-color: var(--clay) !important;
          background: var(--clay-faint) !important;
        }
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
    </>
  )
}
