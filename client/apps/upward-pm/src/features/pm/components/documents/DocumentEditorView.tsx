
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
  Loader2
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
          await sendDocument.mutateAsync({
            uuid: documentUuid,
            tenantUuid: recipientType === 'existing' ? selectedTenantUuid : undefined,
            unitUuid,
            subject,
            content,
            documentType: deliveryMode.toUpperCase(),
            recipientName,
            recipientEmail,
            paymentRequestUuid, // New field
            includeLetterhead: hasLetterhead && deliveryMode === 'pdf' ? includeLetterhead : false,
            deliveryChannel: deliveryMode === 'pdf' || deliveryMode === 'email' ? 'EMAIL' : deliveryMode.toUpperCase()
          })
        
        success(paymentContext ? 'Payment request and document sent successfully' : (documentUuid ? 'Document updated successfully' : 'Document sent and recorded successfully'))
      }
      onBack()
    } catch (err: any) {
      error(err.message || (isVaultMode ? 'Failed to send to vault' : (paymentContext ? 'Failed to process payment request' : 'Failed to send document')))
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>
              {isVaultMode ? `Vault Document: ${initialTemplate?.name || 'New Document'}` : (initialTemplate ? `Edit Template: ${initialTemplate.name}` : 'Create New Document')}
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
        <div style={{ display: 'flex', gap: 12 }}>
          {deliveryMode === 'pdf' && (
            <button 
              onClick={handlePreviewPdf}
              disabled={isPreviewLoading}
              className="btn btn--secondary" 
              style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, borderColor: 'var(--brand)' }}
            >
              {isPreviewLoading ? <Loader2 size={20} className="animate-spin text-brand" /> : <Eye size={20} />} 
              {isPreviewLoading ? 'Generating Preview...' : 'Preview PDF'}
            </button>
          )}
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
            {isSending ? 'Processing...' : isVaultMode ? 'Send to Vault' : (paymentContext ? 'Request Payment' : 'Send Document')}
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
                    <button 
                      onClick={() => setDeliveryMode('sms')}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: 12, 
                        border: `1px solid ${deliveryMode === 'sms' ? 'var(--clay)' : 'var(--border)'}`,
                        background: deliveryMode === 'sms' ? 'var(--clay-faint)' : 'white',
                        color: deliveryMode === 'sms' ? 'var(--clay)' : 'var(--text-muted)',
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
                          border: `1.5px solid ${deliveryMode === 'sms' ? 'var(--clay)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                       }}>
                          {deliveryMode === 'sms' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clay)' }}></div>}
                       </div>
                      <Mail size={18} /> SMS
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
              Use the professional editor to format your document. You can include dynamic placeholders like [Tenant Name], [BankDetails], [PaymentURL] or [PaymentInfo] which will be replaced when sending.
            </p>
          </div>
        </div>

        {/* Right Panel: Rich Text Editor or Live Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                value={content}
                onChange={(newContent) => setContent(newContent)}
                height="100%"
              />
            </div>
          )}
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

      {isPreviewingPdf && previewPdfUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass" style={{
            background: 'white',
            borderRadius: 24,
            border: '1px solid var(--border)',
            padding: 24,
            width: '90%',
            maxWidth: 1000,
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>PDF Document Preview</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Review formatting and custom letterhead overlay.</p>
              </div>
              <button 
                onClick={() => setIsPreviewingPdf(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <iframe 
                src={previewPdfUrl} 
                title="PDF Document Preview" 
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button 
                onClick={() => setIsPreviewingPdf(false)}
                className="btn btn--primary" 
                style={{ borderRadius: 12, height: 44, padding: '0 24px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

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
