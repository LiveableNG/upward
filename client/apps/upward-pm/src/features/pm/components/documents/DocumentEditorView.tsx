
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
  PanelLeft
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
import { RecipientSelectModal } from './RecipientSelectModal'
import { useCreatePaymentRequest } from '../../hooks/usePayments'
import { CreditCard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { downloadBlob } from '@/lib/download-helper'

interface DocumentEditorViewProps {
  initialContent?: string
  initialSubject?: string
  initialTemplate?: any
  initialRecipient?: {
    type: 'existing' | 'new'
    uuid?: string
    name?: string
    email?: string
    deliveryMode?: 'pdf' | 'email' | 'sms' | 'whatsapp'
  }
  paymentContext?: any
  onBack: () => void
  unitUuid?: string
  documentUuid?: string
  isVaultMode?: boolean
}

export function DocumentEditorView({ 
  initialContent = '', 
  initialSubject = '', 
  initialTemplate,
  initialRecipient,
  paymentContext,
  onBack,
  unitUuid,
  documentUuid,
  isVaultMode = false
}: DocumentEditorViewProps) {
  const { success, error } = useToast()
  const { data: tenants = [] } = useTenants()
  const { sendDocument, generatePdf } = useDocuments()
  const { sendTemplateToVault } = useVaultActions()
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
          <h2 style="margin: 0 0 8px 0; color: #0a0a0f; font-size: 18px; font-weight: 700;">Payment Information</h2>
          <p style="margin: 0 0 24px 0; color: #4a4642; font-size: 14px; line-height: 1.5;">To settle this request, please use the payment details or link provided below.</p>
          [PaymentInfo]
          <div style="margin-top: 20px; font-size: 11px; color: #8a8a8a;">
            This is a secure payment request powered by Upward.
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
  const [deliveryMode, setDeliveryMode] = useState<'pdf' | 'email' | 'sms' | 'whatsapp'>(initialRecipient?.deliveryMode || 'pdf')
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false)
  const [includeLetterhead, setIncludeLetterhead] = useState(true)
  const [tempEmail, setTempEmail] = useState('')
  const { user } = useAuth()
  const { updateTenant } = useTenantActions()
  const { data: letterheads = [] } = useQuery<any[]>({
    queryKey: ['letterheads'],
    queryFn: () => api.fetchLetterheads()
  })
  const hasLetterhead = letterheads.length > 0 || !!(user?.letterheadHeaderUrl || user?.letterheadFooterUrl)

  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const { data: unitDetails } = useQuery({
    queryKey: ['pm-unit-detail', unitUuid],
    queryFn: () => api.getUnit(unitUuid as string),
    enabled: !!unitUuid
  })

  const isSampleTemplate = initialTemplate?.type === 'SAMPLE' || initialTemplate?.uuid === 'system-sample-template'
  const [showSettings, setShowSettings] = useState(!isSampleTemplate)
  const [previewMode, setPreviewMode] = useState(false)

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
    const currentMonth = now.toLocaleDateString('en-GB', { month: 'long' })
    const currentYear = now.getFullYear().toString()
    const nextMonthDate = new Date()
    nextMonthDate.setMonth(now.getMonth() + 1)
    const nextMonth = nextMonthDate.toLocaleDateString('en-GB', { month: 'long' })
    const prevMonthDate = new Date()
    prevMonthDate.setMonth(now.getMonth() - 1)
    const previousMonth = prevMonthDate.toLocaleDateString('en-GB', { month: 'long' })

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
    let recipientName = newRecipient.name
    let recipientEmail = newRecipient.email
    let tenantPhone = '__________'
    let tenantAddress = '__________'
    let tenantFirstName = '__________'
    let tenantLastName = '__________'

    if (recipientType === 'existing' && selectedTenant) {
      recipientName = selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant'
      recipientEmail = selectedTenant.email || ''
      tenantPhone = selectedTenant.phone || '__________'
      tenantAddress = selectedTenant.formerAddress || '__________'
      tenantFirstName = selectedTenant.commercialName ? selectedTenant.commercialName : (selectedTenant.firstName || '__________')
      tenantLastName = selectedTenant.commercialName ? '' : (selectedTenant.lastName || '__________')
    } else if (newRecipient.name) {
      tenantFirstName = newRecipient.name.split(' ')[0] || '__________'
      tenantLastName = newRecipient.name.split(' ').slice(1).join(' ') || '__________'
    }

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
    let resolvedUnit: any = unitDetails || (selectedTenant?.units && selectedTenant.units.find((u: any) => u.uuid === unitUuid)) || selectedTenant?.units?.[0]
    
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
      '[PaymentURL]': paymentContext ? 'https://upward-dev.vercel.app/pay/secure-link-preview' : '__________',
      '[Payment URL]': paymentContext ? 'https://upward-dev.vercel.app/pay/secure-link-preview' : '__________',
      '[PaymentLink]': paymentContext ? '<a href="#" style="color: var(--forest); font-weight: 700; text-decoration: underline;">Pay via Secure Link</a>' : '__________',
      '[Payment Link]': paymentContext ? '<a href="#" style="color: var(--forest); font-weight: 700; text-decoration: underline;">Pay via Secure Link</a>' : '__________',
      '[BankDetails]': paymentContext ? 'Virtual Account: 9988776655 (Wema Bank)' : '__________',
      '[Bank Details]': paymentContext ? 'Virtual Account: 9988776655 (Wema Bank)' : '__________',
      '[PaymentInfo]': paymentContext ? 'Virtual Account: 9988776655 (Wema Bank) or secure link.' : '__________',
      '[Payment Info]': paymentContext ? 'Virtual Account: 9988776655 (Wema Bank) or secure link.' : '__________',
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

  const selectedTenant = tenants.find(t => t.uuid === selectedTenantUuid)

  useEffect(() => {
    if (selectedTenant) {
      setTempEmail(selectedTenant.email?.endsWith('@upward.com') ? '' : (selectedTenant.email || ''))
    } else {
      setTempEmail('')
    }
  }, [selectedTenant])

  const handleSaveAsPdf = async () => {
    if (!content) return error('No content to download')
    setIsDownloading(true)
    try {
      const recipientName = recipientType === 'existing' 
        ? (selectedTenant ? (selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant') : undefined)
        : newRecipient.name;

      const blob = await generatePdf.mutateAsync({ 
        content, 
        tenantUuid: recipientType === 'existing' ? (selectedTenantUuid || undefined) : undefined,
        recipientName: recipientName || undefined,
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
      const recipientName = recipientType === 'existing' 
        ? (selectedTenant ? (selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant') : undefined)
        : newRecipient.name;

      const blob = await generatePdf.mutateAsync({ 
        content, 
        tenantUuid: recipientType === 'existing' ? (selectedTenantUuid || undefined) : undefined,
        recipientName: recipientName || undefined,
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

  const handleSend = async () => {
    if (!subject) return error('Please enter a subject')
    if (!content) return error('Please enter document content')

    let recipientName = newRecipient.name
    let recipientEmail = newRecipient.email

    if (recipientType === 'existing') {
      if (!selectedTenant) return error('Please select a recipient')
      
      recipientName = selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant'
      recipientEmail = selectedTenant.email || ''

      // If the selected tenant has a guest email, they must provide a real email
      if (selectedTenant.email?.endsWith('@upward.com')) {
        if (!tempEmail) {
          return error('This tenant has a temporary system email. Please enter a valid email address first so they can receive this document.')
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tempEmail)) {
          return error('Please enter a valid email address.')
        }
        
        setIsSending(true)
        try {
          await updateTenant.mutateAsync({ uuid: selectedTenant.uuid, data: { email: tempEmail } })
          recipientEmail = tempEmail
        } catch (err: any) {
          setIsSending(false)
          return error(err.message || 'Failed to update tenant email address')
        }
      }
    }

    if (!recipientName || !recipientEmail) return error('Please specify a recipient')

    setIsSending(true)
    try {
      if (isVaultMode) {
        // Send to vault flow
        await sendTemplateToVault.mutateAsync({
          content,
          subject,
          includeLetterhead: hasLetterhead ? includeLetterhead : false,
          tenantUuid: recipientType === 'existing' ? selectedTenantUuid : undefined,
          unitUuid
        })
        success('Document sent to tenant vault successfully')
      } else {
        // Normal send flow
        let paymentRequestUuid = undefined;

        if (paymentContext) {
          // 1. Create Payment Request
          const resp = await createPaymentRequest(paymentContext);
          paymentRequestUuid = resp.uuid;
        }

          // 2. Send Document (linked to payment if context exists)
          const docResp = await sendDocument.mutateAsync({
            uuid: documentUuid,
            tenantUuid: recipientType === 'existing' ? selectedTenantUuid : undefined,
            unitUuid,
            subject,
            content,
            documentType: deliveryMode === 'whatsapp' ? 'PDF' : deliveryMode.toUpperCase(),
            recipientName,
            recipientEmail,
            paymentRequestUuid, // New field
            includeLetterhead: hasLetterhead && (deliveryMode === 'pdf' || deliveryMode === 'whatsapp') ? includeLetterhead : false,
            deliveryChannel: deliveryMode === 'whatsapp' ? 'MANUAL' : (deliveryMode === 'pdf' || deliveryMode === 'email' ? 'EMAIL' : deliveryMode.toUpperCase())
          })
          
          if (deliveryMode === 'whatsapp') {
            const phone = selectedTenant?.phone ? selectedTenant.phone.replace(/[^0-9+]/g, '') : '';
            const pdfUrl = (docResp as any)?.pdfUrl || '';
            const message = encodeURIComponent(`Hello ${recipientName},\n\nPlease view your document (${subject}) here:\n${pdfUrl}\n\nThank you.`);
            
            // Open WhatsApp deep link with the S3 URL
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            success('Document logged. WhatsApp opened with document link.');
          } else {
            success(paymentContext ? 'Payment request and document sent successfully' : (documentUuid ? 'Document updated successfully' : 'Document sent and recorded successfully'))
          }
      }
      onBack()
    } catch (err: any) {
      error(err.message || (isVaultMode ? 'Failed to send to vault' : (paymentContext ? 'Failed to process payment request' : 'Failed to send document')))
    } finally {
      setIsSending(false)
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
              {isVaultMode ? `Vault Document: ${initialTemplate?.name || 'New Document'}` : (isSampleTemplate ? `Preview Template: ${initialTemplate?.name}` : (initialTemplate ? `Edit Template: ${initialTemplate.name}` : 'Create New Document'))}
            </h1>
            {isVaultMode && (
              <span style={{
                background: 'var(--forest-faint)',
                color: 'var(--forest)',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 100,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Vault Document
              </span>
            )}
          </div>
        </div>
        {!isSampleTemplate && (
          <div style={{ display: 'flex', gap: 12 }}>
            {!paymentContext && (
              <button 
                onClick={handleSaveAsPdf}
                disabled={isDownloading}
                className="btn btn--secondary" 
                style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Download size={20} /> {isDownloading ? 'Downloading...' : 'Save as PDF'}
              </button>
            )}
            <button 
              onClick={handleSend}
              disabled={isSending || (selectedTenant && !selectedTenant.email && !selectedTenant.phone)}
              className="btn btn--primary" 
              style={{ 
                borderRadius: 12, 
                height: 48, 
                padding: '0 24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                opacity: (selectedTenant && !selectedTenant.email && !selectedTenant.phone) ? 0.5 : 1,
                cursor: (selectedTenant && !selectedTenant.email && !selectedTenant.phone) ? 'not-allowed' : 'pointer'
              }}
            >
              {paymentContext ? <CreditCard size={20} /> : <Send size={20} />} 
              {isSending ? 'Processing...' : isVaultMode ? 'Send to Vault' : (paymentContext ? 'Request Payment' : 'Send Document')}
            </button>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: showSettings ? '400px 1fr' : '1fr', gap: 40, alignItems: 'start', transition: 'all 0.3s' }}>
        
        {/* Left Panel: Settings */}
        {showSettings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'white' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 24 }}>Document Settings</h3>
             
             <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Delivery Mode</label>
                {isVaultMode ? (
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 12, 
                    border: '1.5px solid var(--forest)', 
                    background: 'var(--forest-faint)', 
                    color: 'var(--forest)', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8 
                  }}>
                    <Download size={18} /> PDF Attachment (Auto-Saved to Vault)
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      onClick={() => setDeliveryMode('pdf')}
                      disabled={selectedTenant && !selectedTenant.email}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: 12, 
                        border: `1px solid ${deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--border)'}`,
                        background: deliveryMode === 'pdf' ? 'var(--clay-faint)' : 'white',
                        color: deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--text-muted)',
                        opacity: (selectedTenant && !selectedTenant.email) ? 0.5 : 1,
                        cursor: (selectedTenant && !selectedTenant.email) ? 'not-allowed' : 'pointer',
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
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          border: `1.5px solid ${deliveryMode === 'pdf' ? 'var(--dark)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                       }}>
                          {deliveryMode === 'pdf' && <Check size={10} color="var(--dark)" strokeWidth={3} />}
                       </div>
                      <Download size={18} /> <span style={{ whiteSpace: 'nowrap' }}>PDF Attachment</span>
                    </button>
                    <button 
                      onClick={() => setDeliveryMode('email')}
                      disabled={selectedTenant && !selectedTenant.email}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: 12, 
                        border: `1px solid ${deliveryMode === 'email' ? 'var(--clay)' : 'var(--border)'}`,
                        background: deliveryMode === 'email' ? 'var(--clay-faint)' : 'white',
                        color: deliveryMode === 'email' ? 'var(--clay)' : 'var(--text-muted)',
                        opacity: (selectedTenant && !selectedTenant.email) ? 0.5 : 1,
                        cursor: (selectedTenant && !selectedTenant.email) ? 'not-allowed' : 'pointer',
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
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          border: `1.5px solid ${deliveryMode === 'email' ? 'var(--dark)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                       }}>
                          {deliveryMode === 'email' && <Check size={10} color="var(--dark)" strokeWidth={3} />}
                       </div>
                      <Mail size={18} /> <span style={{ whiteSpace: 'nowrap' }}>Email Body</span>
                    </button>
                    <button 
                      onClick={() => setDeliveryMode('whatsapp')}
                      disabled={selectedTenant && !selectedTenant.phone}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: 12, 
                        border: `1px solid ${deliveryMode === 'whatsapp' ? '#25D366' : 'var(--border)'}`,
                        background: deliveryMode === 'whatsapp' ? '#dcf8c6' : 'white',
                        color: deliveryMode === 'whatsapp' ? '#075E54' : 'var(--text-muted)',
                        opacity: (selectedTenant && !selectedTenant.phone) ? 0.5 : 1,
                        cursor: (selectedTenant && !selectedTenant.phone) ? 'not-allowed' : 'pointer',
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
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          border: `1.5px solid ${deliveryMode === 'whatsapp' ? '#25D366' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                       }}>
                          {deliveryMode === 'whatsapp' && <Check size={10} color="#25D366" strokeWidth={3} />}
                       </div>
                      <MessageCircle size={18} /> <span style={{ whiteSpace: 'nowrap' }}>WhatsApp</span>
                    </button>
                  </div>
                )}
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
                      {selectedTenant ? (selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant') : 'Select a recipient...'}
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

                {recipientType === 'existing' && selectedTenant && selectedTenant.email?.endsWith('@upward.com') && (
                  <div style={{
                    marginTop: 12,
                    padding: 16,
                    background: 'var(--error-faint, #fef2f2)',
                    borderRadius: 12,
                    border: '1.5px dashed var(--error, #ef4444)',
                    fontSize: 13,
                    color: 'var(--error, #ef4444)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
                      <AlertCircle size={16} />
                      <span>Temporary Email Detected</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
                      This tenant has a temporary system email. Please provide a real email to update their profile and deliver this document successfully.
                    </p>
                    <input 
                      type="email"
                      placeholder="Real Email Address (e.g. name@example.com)"
                      className="form-input"
                      style={{ 
                        borderRadius: 8, 
                        height: 38, 
                        fontSize: 12, 
                        borderColor: 'var(--error, #ef4444)',
                        background: 'white',
                        padding: '0 10px',
                        outline: 'none'
                      }}
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
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

             {hasLetterhead && deliveryMode === 'pdf' && (
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
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isSampleTemplate 
                ? "This is a read-only sample template. It demonstrates how dynamic placeholders like [Tenant Name] or [RentAmount] are automatically filled with real data when sending actual documents." 
                : "Use the professional editor to format your document. You can include dynamic placeholders like [Tenant Name], [BankDetails], [PaymentURL] or [PaymentInfo] which will be replaced when sending."
              }
            </p>
          </div>
        </div>
        )}

        {/* Right Panel: Rich Text Editor or Live Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {!isSampleTemplate && (
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
              )}
              <div style={{ 
                display: isSampleTemplate ? 'none' : 'inline-flex', 
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
                disabled={isSampleTemplate}
                value={content}
                onChange={(newContent) => setContent(newContent)}
                height="100%"
              />
            </div>
          )}
        </div>
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

      <Modal
        isOpen={isPreviewingPdf && !!previewPdfUrl}
        onClose={() => setIsPreviewingPdf(false)}
        title="PDF Document Preview"
        subtitle="Review formatting and custom letterhead overlay."
        maxWidth={1000}
        footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
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
    </>
  )
}
