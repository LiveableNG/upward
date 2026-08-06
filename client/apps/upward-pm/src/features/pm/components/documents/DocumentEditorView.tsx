
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Info
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
import {
  EMPTY_PLACEHOLDER,
  formatAmountInWords,
  formatDisplayDate,
  formatTimeframeUntilDate,
  formatTimeframeUntilDateInWords,
  getLeaseEndDate,
  getNextRentEndDate,
  getNextRentStartDate,
} from '../../utils/documentPlaceholders'

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
  disableRecipientEdit?: boolean
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
  isVaultMode = false,
  disableRecipientEdit = false
}: DocumentEditorViewProps) {
  const { success, error } = useToast()
  const { data: tenants = [] } = useTenants()
  const { user } = useAuth()
  const [fromEmail, setFromEmail] = useState(user?.email || 'noreply@goodtenants.io')
  const [ccEmails, setCcEmails] = useState('')
  const [bccEmails, setBccEmails] = useState('')

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
  const [subject, setSubject] = useState(initialTemplate?.subject || initialTemplate?.name || initialSubject)
  const [recipientType, setRecipientType] = useState<'existing' | 'new'>(initialRecipient?.type || 'existing')
  const [selectedTenantUuid, setSelectedTenantUuid] = useState(initialRecipient?.uuid || '')
  const [newRecipient, setNewRecipient] = useState({
    name: initialRecipient?.name || '',
    email: initialRecipient?.email || ''
  })
  const [deliveryMode, setDeliveryMode] = useState<'pdf' | 'email' | 'sms' | 'whatsapp'>(initialRecipient?.deliveryMode || 'email')
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'text'>('pdf')
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false)
  const [includeLetterhead, setIncludeLetterhead] = useState(true)
  const [tempEmail, setTempEmail] = useState('')
  const [tempPhone, setTempPhone] = useState('')
  const { sendDocument, generatePdf } = useDocuments()
  const { sendTemplateToVault } = useVaultActions()
  const { mutateAsync: createPaymentRequest } = useCreatePaymentRequest()
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

  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ['unit-payments', unitUuid],
    queryFn: () => api.getUnitPayments(unitUuid as string),
    enabled: !!unitUuid
  })

  const isSystemTemplate = initialTemplate?.type === 'SYSTEM' || initialTemplate?.isSystem
  const isWelcomeTemplate = initialTemplate?.uuid === 'system-onboarding-1' || initialTemplate?.name === 'Getting Started' || initialTemplate?.name === 'Welcome System Template';
  const [showSettings, setShowSettings] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)

  const { data: emailSettings } = useQuery({
    queryKey: ['emailSettings'],
    queryFn: () => api.getEmailSettings(),
  })

  useEffect(() => {
    if (emailSettings) {
      if (emailSettings.senderEmail) {
        if (emailSettings.isVerified) {
          setFromEmail(`"${emailSettings.senderName}" <${emailSettings.senderEmail}>`)
        } else {
          setFromEmail(`"${emailSettings.senderName || 'Property Manager'} (via Upward)" <noreply@goodtenants.io>`)
        }
      }
      if (emailSettings.cc && !ccEmails) setCcEmails(emailSettings.cc)
      if (emailSettings.bcc && !bccEmails) setBccEmails(emailSettings.bcc)
    }
  }, [emailSettings])

  const getRenderedContent = () => {
    let rendered = content
    if (!rendered) return ''

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
      '[Date]': formatDisplayDate(now),
      '[CurrentDate]': formatDisplayDate(now),
      '[Current Date]': formatDisplayDate(now),
      '[CurrentMonth]': currentMonth,
      '[Current Month]': currentMonth,
      '[CurrentYear]': currentYear,
      '[Current Year]': currentYear,
      '[NextMonth]': nextMonth,
      '[Next Month]': nextMonth,
      '[PreviousMonth]': previousMonth,
      '[Previous Month]': previousMonth,
      '[DocumentDate]': formatDisplayDate(now),
      '[Document Date]': formatDisplayDate(now),
      '[DocumentNumber]': 'DOC-PREVIEW',
      '[Document Number]': 'DOC-PREVIEW',
      '[DocumentType]': deliveryMode.toUpperCase(),
      '[Document Type]': deliveryMode.toUpperCase(),
    }

    // Property Manager / Company Values
    const pmValues: Record<string, string> = {
      '[CompanyName]': user?.businessName || '__________',
      '[Company Name]': user?.businessName || '__________',
      '[CompanyAddress]': user?.companyAddress || user?.country || '__________',
      '[Company Address]': user?.companyAddress || user?.country || '__________',
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

    // Unit & Property Values
    let resolvedUnit: any = unitDetails || (selectedTenant?.units && selectedTenant.units.find((u: any) => u.uuid === unitUuid)) || selectedTenant?.units?.[0]
    let unitName = resolvedUnit?.unitName || '__________'
    let propertyAddress = resolvedUnit?.property?.address || '__________'

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

      const fallbackAddr = (unitName !== '__________' && propertyAddress !== '__________') ? `Unit ${unitName}, ${propertyAddress}` : ''
      tenantAddress = selectedTenant.formerAddress || fallbackAddr || '__________'

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

    let propertyName = resolvedUnit?.property?.name || '__________'
    let landlordName = (resolvedUnit?.property as any)?.landlordName || '__________'
    let landlordEmail = (resolvedUnit?.property as any)?.landlordEmail || '__________'
    let rentAmountVal = resolvedUnit?.rentAmount
    let rentAmountStr = rentAmountVal ? `${resolvedUnit.currency || '₦'}${rentAmountVal.toLocaleString()}` : '__________'
    let rentTypeVal = resolvedUnit?.rentType || 'Monthly'
    let rentStartDateVal = resolvedUnit?.rentStartDate
    let rentDueDateVal = resolvedUnit?.rentDueDate
    const normRentType = (rentTypeVal || '').trim().toUpperCase()
    let rentDuration = (normRentType === 'YEARLY' || normRentType === 'ANNUALLY') ? '12 Months' : normRentType === 'MONTHLY' ? '1 Month' : '__________'
    const rentEndDate = getLeaseEndDate(rentStartDateVal)
    const nextRentStartDate = getNextRentStartDate(rentStartDateVal)
    const nextRentEndDate = getNextRentEndDate(rentStartDateVal)
    const amountInWords = formatAmountInWords(rentAmountVal, resolvedUnit?.currency)
    const timeFrame = formatTimeframeUntilDate(rentEndDate)
    const timeFrameInWords = formatTimeframeUntilDateInWords(rentEndDate)
    const lastPayment = payments?.[0] || resolvedUnit?.rentPayments?.[0]
    const lastPaymentDateVal = lastPayment ? formatDisplayDate(lastPayment.paymentDate) : 'N/A'
    const lastPaymentAmountVal = lastPayment ? `${resolvedUnit?.currency || '₦'}${lastPayment.amount.toLocaleString()}` : 'N/A'


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
      '[RentAmount]': rentAmountStr,
      '[Rent Amount]': rentAmountStr,
      '[AmountInWords]': amountInWords,
      '[Amount In Words]': amountInWords,
      '[RentType]': rentTypeVal,
      '[Rent Type]': rentTypeVal,
      '[RentStartDate]': formatDisplayDate(rentStartDateVal),
      '[Rent Start Date]': formatDisplayDate(rentStartDateVal),
      '[RentEndDate]': formatDisplayDate(rentEndDate),
      '[Rent End Date]': formatDisplayDate(rentEndDate),
      '[LeaseStartDate]': formatDisplayDate(rentStartDateVal),
      '[Lease Start Date]': formatDisplayDate(rentStartDateVal),
      '[LeaseEndDate]': formatDisplayDate(rentEndDate),
      '[Lease End Date]': formatDisplayDate(rentEndDate),
      '[LeaseDuration]': rentDuration,
      '[Lease Duration]': rentDuration,
      '[RentDuration]': rentDuration,
      '[Rent Duration]': rentDuration,
      '[NextRentStartDate]': formatDisplayDate(nextRentStartDate),
      '[Next Rent Start Date]': formatDisplayDate(nextRentStartDate),
      '[Next rent start date]': formatDisplayDate(nextRentStartDate),
      '[NextRentEndDate]': formatDisplayDate(nextRentEndDate),
      '[Next Rent End Date]': formatDisplayDate(nextRentEndDate),
      '[Next rent end date]': formatDisplayDate(nextRentEndDate),
      '[TimeFrame]': timeFrame,
      '[Time Frame]': timeFrame,
      '[Timeframe]': timeFrame,
      '[timeframe]': timeFrame,
      '[Time frame (period between now/current_time and rent end date)]': timeFrame,
      '[TimeframeinWords]': timeFrameInWords,
      '[Timeframe in Words]': timeFrameInWords,
      '[Timeframe in words]': timeFrameInWords,
      '[ServiceCharge]': 'N/A',
      '[Service Charge]': 'N/A',
      '[TotalAmount]': rentAmountStr,
      '[Total Amount]': rentAmountStr,
      '[PaymentDueDate]': formatDisplayDate(rentDueDateVal),
      '[Payment Due Date]': formatDisplayDate(rentDueDateVal),
      '[LastPaymentDate]': lastPaymentDateVal,
      '[Last Payment Date]': lastPaymentDateVal,
      '[LastPaymentAmount]': lastPaymentAmountVal,
      '[Last Payment Amount]': lastPaymentAmountVal,
      '[LandlordName]': landlordName,
      '[LandlordEmail]': landlordEmail,
    }

    // Payment link/URL replacements
    const paymentValues: Record<string, string> = {
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
      rendered = rendered.split(placeholder).join(value || EMPTY_PLACEHOLDER)
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
    if (isSystemTemplate && !fromEmail.trim()) {
      return error('From email cannot be empty for system templates')
    }
    if (!subject) return error('Please enter a subject')
    if (!content) return error('Please enter document content')

    let recipientName = newRecipient.name
    let recipientEmail = newRecipient.email

    if (recipientType === 'existing') {
      if (!selectedTenant) return error('Please select a recipient')

      recipientName = selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant'
      recipientEmail = selectedTenant.email || ''

      // If the selected tenant has no email or temporary system email, they must provide a real email
      if ((deliveryMode === 'email' || deliveryMode === 'pdf') && (!selectedTenant.email || selectedTenant.email.endsWith('@upward.com'))) {
        if (!tempEmail) {
          return error('This tenant has no email. Please enter a valid email address first so they can receive this document.')
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

      // If the selected tenant has no phone number and we are sending via WhatsApp, they must provide one
      if (deliveryMode === 'whatsapp' && !selectedTenant.phone) {
        if (!tempPhone) {
          return error('This tenant has no phone number. Please enter a valid phone number first to proceed.')
        }
        setIsSending(true)
        try {
          await updateTenant.mutateAsync({ uuid: selectedTenant.uuid, data: { phone: tempPhone } })
        } catch (err: any) {
          setIsSending(false)
          return error(err.message || 'Failed to update tenant phone number')
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
          const resp = await createPaymentRequest({ ...paymentContext, silent: true });
          paymentRequestUuid = resp.uuid;
        }

        // 2. Send Document (linked to payment if context exists)
        const docResp = await sendDocument.mutateAsync({
          fromEmail: isSystemTemplate ? fromEmail : undefined,
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
          deliveryChannel: deliveryMode === 'whatsapp' ? 'MANUAL' : (deliveryMode === 'pdf' || deliveryMode === 'email' ? 'EMAIL' : deliveryMode.toUpperCase()),
          cc: ccEmails.trim() || undefined,
          bcc: bccEmails.trim() || undefined,
          isWelcomeTemplate,
        })

        if (deliveryMode === 'whatsapp') {
          try {
            const blob = await generatePdf.mutateAsync({
              content,
              tenantUuid: recipientType === 'existing' ? (selectedTenantUuid || undefined) : undefined,
              recipientName: recipientName || undefined,
              includeLetterhead: hasLetterhead ? includeLetterhead : false
            });
            // @ts-ignore
            await downloadBlob(blob, `${subject || 'document'}.pdf`);

            const phone = selectedTenant?.phone ? selectedTenant.phone.replace(/[^0-9+]/g, '') : '';
            const message = encodeURIComponent(`Hello ${recipientName},\n\nPlease find your document (${subject}) attached.\n\nThank you.`);

            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            success('Document downloaded. WhatsApp opened to attach it.');
          } catch (err) {
            error('Failed to generate PDF for WhatsApp');
          }
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
          <div className="settings-panel animate-slide-left" style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onBack}
              className="btn btn--secondary"
              disabled={isSending || isDownloading}
              style={{ borderRadius: 100, padding: '10px 24px', flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
            {!paymentContext && !isWelcomeTemplate && (
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
                        onClick={() => setDeliveryMode('email')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: 12,
                          border: `1px solid ${deliveryMode === 'email' || deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--border)'}`,
                          background: deliveryMode === 'email' || deliveryMode === 'pdf' ? 'var(--clay-faint)' : 'white',
                          color: deliveryMode === 'email' || deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--text-muted)',
                          cursor: 'pointer',
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
                          border: `1.5px solid ${deliveryMode === 'email' || deliveryMode === 'pdf' ? 'var(--dark)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {(deliveryMode === 'email' || deliveryMode === 'pdf') && <Check size={10} color="var(--dark)" strokeWidth={3} />}
                        </div>
                        <Mail size={18} /> <span style={{ whiteSpace: 'nowrap' }}>Email</span>
                      </button>

                      <button
                        onClick={() => setDeliveryMode('whatsapp')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: 12,
                          border: `1px solid ${deliveryMode === 'whatsapp' ? '#25D366' : 'var(--border)'}`,
                          background: deliveryMode === 'whatsapp' ? '#dcf8c6' : 'white',
                          color: deliveryMode === 'whatsapp' ? '#075E54' : 'var(--text-muted)',
                          cursor: 'pointer',
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
                  {(deliveryMode === 'email' || deliveryMode === 'pdf') && !isVaultMode && (
                    <div style={{ marginTop: 12, display: 'flex', background: 'var(--bg)', borderRadius: 12, padding: 4 }}>
                      <button
                        onClick={() => { setEmailFormat('pdf'); setDeliveryMode('pdf'); }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          background: deliveryMode === 'pdf' ? 'white' : 'transparent',
                          color: deliveryMode === 'pdf' ? 'var(--clay)' : 'var(--text-muted)',
                          boxShadow: deliveryMode === 'pdf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                        onClick={() => { setEmailFormat('text'); setDeliveryMode('email'); }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          background: deliveryMode === 'email' ? 'white' : 'transparent',
                          color: deliveryMode === 'email' ? 'var(--clay)' : 'var(--text-muted)',
                          boxShadow: deliveryMode === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                    <div style={{
                      marginTop: 12,
                      padding: '12px 16px',
                      background: '#f0fdf4',
                      borderRadius: 12,
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10
                    }}>
                      <MessageCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                        <strong>How it works:</strong> Clicking "{paymentContext ? 'Request Payment' : 'Send Document'}" will download the PDF locally and open a WhatsApp chat with the tenant's number. You can then attach the downloaded PDF to the chat.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>From</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    disabled={!isSystemTemplate}
                    style={{ background: !isSystemTemplate ? '#f8fafc' : 'white', borderRadius: 12 }}
                  />
                </div>

                {(deliveryMode === 'email' || deliveryMode === 'pdf') && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        CC
                        <span
                          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
                          title="Comma-separated email addresses who will receive a copy of this email."
                        >
                          <Info size={13} color="var(--text-muted)" />
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="cc@example.com, another@example.com"
                        value={ccEmails}
                        onChange={(e) => setCcEmails(e.target.value)}
                        style={{ borderRadius: 12 }}
                      />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        BCC
                        <span
                          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
                          title="Blind carbon copy — comma-separated addresses who receive the email invisibly."
                        >
                          <Info size={13} color="var(--text-muted)" />
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="bcc@example.com, hidden@example.com"
                        value={bccEmails}
                        onChange={(e) => setBccEmails(e.target.value)}
                        style={{ borderRadius: 12 }}
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>To Recipient</label>
                  {!disableRecipientEdit && (
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
                  )}

                  {recipientType === 'existing' ? (
                    <div
                      onClick={() => !disableRecipientEdit && setIsRecipientModalOpen(true)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 14,
                        border: '1px solid var(--border)',
                        cursor: disableRecipientEdit ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: selectedTenant ? 'var(--bg)' : 'white'
                      }}
                    >
                      <span style={{ fontSize: 14, color: selectedTenant ? 'var(--dark)' : 'var(--text-muted)', fontWeight: selectedTenant ? 600 : 400 }}>
                        {selectedTenant ? (selectedTenant.commercialName || `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.trim() || 'Tenant') : 'Select a recipient...'}
                      </span>
                      {!disableRecipientEdit && <Users size={18} style={{ color: 'var(--text-muted)' }} />}
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

                  {recipientType === 'existing' && selectedTenant && (!selectedTenant.email || selectedTenant.email.endsWith('@upward.com')) && (deliveryMode === 'email' || deliveryMode === 'pdf') && (
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
                        <span>This tenant has no email</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
                        Please enter a valid email address to update their profile and deliver this document successfully.
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

                  {recipientType === 'existing' && selectedTenant && !selectedTenant.phone && deliveryMode === 'whatsapp' && (
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
                        <span>This tenant has no phone number</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
                        Please provide the tenant's phone number to update their profile and deliver this document successfully via WhatsApp.
                      </p>
                      <input
                        type="tel"
                        placeholder="Real Phone Number (e.g. +234...)"
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
                        value={tempPhone}
                        onChange={(e) => setTempPhone(e.target.value)}
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
                    disabled={isSystemTemplate}
                  />
                </div>

                {hasLetterhead && (deliveryMode === 'pdf' || deliveryMode === 'whatsapp') && (
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

                    {/* Document Body — rendered in an iframe matching editor styles for true WYSIWYG fidelity */}
                    <iframe
                      title="Document Live Preview"
                      style={{
                        flex: 1,
                        width: '100%',
                        border: 'none',
                        minHeight: '400px',
                        display: 'block',
                      }}
                      srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: 'Inter', Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #1e293b;
      background: white;
    }
    body { padding: 20px; max-width: 800px; margin: 0 auto; }
    p { margin: 0 0 0.75em 0; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    td, th { padding: 8px 12px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>${getRenderedContent()}</body>
</html>`}
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
