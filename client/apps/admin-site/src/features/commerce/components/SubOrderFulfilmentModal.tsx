import React, { useState, useEffect } from 'react'
import { Truck, Wrench, Send, Loader2, User, ChevronRight, MessageSquare, Tag } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type {
  AdminCommerceSubOrder,
  AdminFulfilmentTransitionAction,
} from '../types'

interface SubOrderFulfilmentModalProps {
  subOrder: AdminCommerceSubOrder
  onClose: () => void
  onUpdate: (
    subOrderUuid: string,
    payload: {
      action: AdminFulfilmentTransitionAction
      carrierName?: string
      trackingNumber?: string
      trackingUrl?: string
      serviceScheduledAt?: string
      serviceWindowNotes?: string
      technicianName?: string
      technicianPhone?: string
      adminOperationalNotes?: string
    },
  ) => Promise<any>
  onSetQuote?: (
    subOrderUuid: string,
    payload: { quotedPriceNgn: number; quoteNotes?: string },
  ) => Promise<any>
  onPostMessage?: (subOrderUuid: string, message: string) => Promise<any>
}

export function SubOrderFulfilmentModal({
  subOrder,
  onClose,
  onUpdate,
  onSetQuote,
  onPostMessage,
}: SubOrderFulfilmentModalProps) {
  const isService = (subOrder.items || []).some((i) => i.offeringType === 'SERVICE')
  const isQuoteDeclined = subOrder.customerStatus === 'QUOTE_DECLINED'
  const isQuotePhase =
    subOrder.customerStatus === 'QUOTE_REQUESTED' ||
    subOrder.customerStatus === 'QUOTE_PROVIDED' ||
    isQuoteDeclined
  const declinedEvent = isQuoteDeclined
    ? (subOrder.fulfilmentEvents || []).find(
        (ev: any) =>
          ev.status === 'QUOTE_DECLINED' ||
          (ev.title || '').toLowerCase().includes('declined'),
      )
    : null

  const [messages, setMessages] = useState(subOrder.messages || [])
  useEffect(() => {
    setMessages(subOrder.messages || [])
  }, [subOrder.messages])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [quotedPriceNgn, setQuotedPriceNgn] = useState(
    subOrder.subtotalKobo && Number(subOrder.subtotalKobo) > 0
      ? String(Math.round(Number(subOrder.subtotalKobo) / 100))
      : '',
  )
  const [quoteNotes, setQuoteNotes] = useState(subOrder.quoteNotes || '')
  const [savingQuote, setSavingQuote] = useState(false)

  const getInitialAction = (): AdminFulfilmentTransitionAction => {
    if (isService) {
      if (subOrder.customerStatus === 'ORDER_CONFIRMED') return 'CONFIRM_BY_VENDOR'
      if (subOrder.customerStatus === 'PROCESSING') return 'SCHEDULE_SERVICE'
      if (subOrder.customerStatus === 'SERVICE_SCHEDULED') return 'TECHNICIAN_EN_ROUTE'
      return 'COMPLETE_SERVICE'
    } else {
      if (subOrder.customerStatus === 'ORDER_CONFIRMED') return 'CONFIRM_BY_VENDOR'
      if (subOrder.customerStatus === 'PROCESSING') return 'DISPATCH'
      return 'DELIVER'
    }
  }

  const [action, setAction] = useState<AdminFulfilmentTransitionAction>(getInitialAction())
  const [carrierName, setCarrierName] = useState(subOrder.carrierName || '')
  const [trackingNumber, setTrackingNumber] = useState(subOrder.trackingNumber || '')
  const [trackingUrl, setTrackingUrl] = useState(subOrder.trackingUrl || '')
  const [showCourierDetails, setShowCourierDetails] = useState(
    Boolean(subOrder.carrierName || subOrder.trackingNumber || subOrder.trackingUrl),
  )
  const initialDateObj = subOrder.serviceScheduledAt ? new Date(subOrder.serviceScheduledAt) : null
  const [serviceDate, setServiceDate] = useState(() => {
    if (!initialDateObj || isNaN(initialDateObj.getTime())) return ''
    const yyyy = initialDateObj.getFullYear()
    const mm = String(initialDateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(initialDateObj.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [serviceTime, setServiceTime] = useState(() => {
    if (!initialDateObj || isNaN(initialDateObj.getTime())) return '09:00'
    const hh = String(initialDateObj.getHours()).padStart(2, '0')
    const mins = initialDateObj.getMinutes() >= 30 ? '30' : '00'
    return `${hh}:${mins}`
  })
  const serviceScheduledAt = serviceDate ? `${serviceDate}T${serviceTime || '09:00'}` : ''

  const TIME_SLOTS = [
    { value: '07:00', label: '7:00 AM' },
    { value: '07:30', label: '7:30 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '08:30', label: '8:30 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '09:30', label: '9:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '11:30', label: '11:30 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '12:30', label: '12:30 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '13:30', label: '1:30 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '14:30', label: '2:30 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '15:30', label: '3:30 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '16:30', label: '4:30 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '17:30', label: '5:30 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '18:30', label: '6:30 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '19:30', label: '7:30 PM' },
    { value: '20:00', label: '8:00 PM' },
  ]
  const [serviceWindowNotes, setServiceWindowNotes] = useState(
    subOrder.serviceWindowNotes || 'Morning window (9:00 AM - 1:00 PM)',
  )
  const [technicianName, setTechnicianName] = useState(subOrder.technicianName || '')
  const [technicianPhone, setTechnicianPhone] = useState(subOrder.technicianPhone || '')
  const [adminOperationalNotes, setAdminOperationalNotes] = useState(
    subOrder.adminOperationalNotes || '',
  )
  const [submitting, setSubmitting] = useState(false)

  const steps = isService
    ? [
        {
          action: 'CONFIRM_BY_VENDOR' as AdminFulfilmentTransitionAction,
          stepNum: 1,
          label: 'Booking Confirmed',
          desc: 'Merchant confirmed booking',
        },
        {
          action: 'SCHEDULE_SERVICE' as AdminFulfilmentTransitionAction,
          stepNum: 2,
          label: 'Service Scheduled',
          desc: 'Date & time scheduled',
        },
        {
          action: 'TECHNICIAN_EN_ROUTE' as AdminFulfilmentTransitionAction,
          stepNum: 3,
          label: 'Specialist En Route',
          desc: 'Specialist travelling to location',
        },
        {
          action: 'COMPLETE_SERVICE' as AdminFulfilmentTransitionAction,
          stepNum: 4,
          label: 'Complete Service',
          desc: 'Work fully delivered',
        },
      ]
    : [
        {
          action: 'CONFIRM_BY_VENDOR' as AdminFulfilmentTransitionAction,
          stepNum: 1,
          label: 'Vendor Confirmed',
          desc: 'Stock verified & in preparation',
        },
        {
          action: 'DISPATCH' as AdminFulfilmentTransitionAction,
          stepNum: 2,
          label: 'Dispatched & En Route',
          desc: 'Package handed to rider & in transit',
        },
        {
          action: 'DELIVER' as AdminFulfilmentTransitionAction,
          stepNum: 3,
          label: 'Mark as Delivered',
          desc: 'Delivered to recipient address',
        },
      ]

  const handleSendAdminReply = async () => {
    const trimmed = replyText.trim()
    if (!trimmed || !onPostMessage) return
    const tempUuid = `optimistic-${Date.now()}`
    const optimisticMsg = {
      uuid: tempUuid,
      senderType: 'ADMIN',
      senderName: 'Upward Team',
      message: trimmed,
      createdAt: new Date().toISOString(),
    }

    // Optimistically append message and clear input at 0ms
    setMessages((prev) => [...prev, optimisticMsg])
    setReplyText('')
    setSendingReply(true)
    try {
      const res = await onPostMessage(subOrder.uuid, trimmed)
      if (res?.message) {
        setMessages((prev) => prev.map((m) => (m.uuid === tempUuid ? res.message : m)))
      }
    } catch {
      // Roll back optimistic message and restore input on failure
      setMessages((prev) => prev.filter((m) => m.uuid !== tempUuid))
      setReplyText(trimmed)
    } finally {
      setSendingReply(false)
    }
  }

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSetQuote) return
    const parsed = Number(quotedPriceNgn)
    if (!Number.isFinite(parsed) || parsed < 100) {
      alert('Please enter a valid quoted price of at least ₦100.')
      return
    }
    setSavingQuote(true)
    try {
      await onSetQuote(subOrder.uuid, {
        quotedPriceNgn: parsed,
        quoteNotes: quoteNotes.trim() || undefined,
      })
      onClose()
    } catch {
      // toast handled in hook
    } finally {
      setSavingQuote(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((action === 'SCHEDULE_SERVICE' || action === 'SERVICE_SCHEDULE') && !serviceScheduledAt) {
      alert('Please select an Appointment Date & Time to schedule service.')
      return
    }

    if (action === 'TECHNICIAN_EN_ROUTE' && (!technicianName.trim() || !technicianPhone.trim())) {
      alert('Please provide the assigned specialist / crew name and contact phone before marking En Route.')
      return
    }

    setSubmitting(true)
    try {
      await onUpdate(subOrder.uuid, {
        action,
        carrierName: carrierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        serviceScheduledAt: serviceScheduledAt ? new Date(serviceScheduledAt).toISOString() : undefined,
        serviceWindowNotes: serviceWindowNotes.trim() || undefined,
        technicianName: technicianName.trim() || undefined,
        technicianPhone: technicianPhone.trim() || undefined,
        adminOperationalNotes: adminOperationalNotes.trim() || undefined,
      })
      onClose()
    } catch {
      // toast handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel =
    action === 'DELIVER'
      ? 'Mark as Delivered'
      : action === 'COMPLETE_SERVICE'
      ? 'Complete Service'
      : action === 'DISPATCH'
      ? 'Dispatch with Rider'
      : action === 'OUT_FOR_DELIVERY'
      ? 'Set Out for Delivery'
      : action === 'CONFIRM_BY_VENDOR'
      ? 'Confirm Vendor Acceptance'
      : 'Update Milestone'

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isService ? 'Service Fulfilment Milestone' : 'Shipping & Fulfilment Milestone'}
      description={`Sub-Order: ${subOrder.subOrderNumber} · Vendor: ${subOrder.vendor?.name || 'Upward Verified Merchant'}`}
      icon={isService ? <Wrench size={22} /> : <Truck size={22} />}
      maxWidth="620px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status preview banner */}
        <div
          style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Current Customer Status: </span>
            <strong style={{ color: 'var(--text)' }}>{subOrder.customerStatus.replace(/_/g, ' ')}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Internal Status: </span>
            <strong style={{ color: 'var(--text)' }}>{subOrder.operationalStatus.replace(/_/g, ' ')}</strong>
          </div>
        </div>

        {/* Quote Review, Interactive Messages & Custom Price Setup */}
        {isQuotePhase ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isQuoteDeclined && (
              <div
                style={{
                  border: '1px solid rgba(220, 38, 38, 0.28)',
                  background: 'rgba(220, 38, 38, 0.06)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12.5,
                  color: '#991b1b',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Customer Declined Previous Quote
                </div>
                <div>
                  {declinedEvent?.description ||
                    'The customer declined the previous quoted price. You can message them below to clarify scope/budget and send a revised quote, or close this request from the Orders table.'}
                </div>
              </div>
            )}
            {/* Milestone Conversation Thread */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
                background: '#FAF8F5',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                <MessageSquare size={15} />
                <span>Scope &amp; Customer Clarification Thread</span>
              </div>

              <div
                style={{
                  maxHeight: 210,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingRight: 4,
                }}
              >
                {messages.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    No messages yet. Ask any clarifying questions below before setting a quote price.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderType === 'ADMIN'
                    return (
                      <div
                        key={msg.uuid}
                        style={{
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '86%',
                          background: isAdmin ? 'var(--clay, #C2501F)' : '#FFFFFF',
                          color: isAdmin ? '#FFFFFF' : 'var(--text, #1A1714)',
                          border: isAdmin ? 'none' : '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontSize: 12.5,
                          lineHeight: 1.45,
                        }}
                      >
                        <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.8, marginBottom: 3 }}>
                          {isAdmin ? 'Upward Team' : msg.senderName || 'Customer'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendAdminReply()
                    }
                  }}
                  placeholder="Ask customer for clarification or reply…"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    background: '#FFFFFF',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendAdminReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="btn btn-secondary"
                  style={{ height: 38, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Send</span>
                </button>
              </div>
            </div>

            {/* Set Final Custom Quote Price */}
            <form
              onSubmit={handleSendQuote}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                <Tag size={15} />
                <span>
                  {isQuoteDeclined
                    ? 'Send Revised Service Quote (Re-opens Quote for Customer)'
                    : 'Set Final Service Quote (100% Upward Balance)'}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Total Quoted Price (₦ NGN) *
                </label>
                <input
                  type="number"
                  min={100}
                  step="100"
                  required
                  value={quotedPriceNgn}
                  onChange={(e) => setQuotedPriceNgn(e.target.value)}
                  placeholder="e.g. 25000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Quote Breakdown / Notes for Customer (Optional)
                </label>
                <textarea
                  rows={3}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. Covers full service labor, materials, and logistics."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingQuote || !quotedPriceNgn}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {savingQuote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>
                    {subOrder.customerStatus === 'QUOTE_PROVIDED'
                      ? 'Update & Resend Quote'
                      : 'Send Quote to Customer'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chronological Step Pipeline */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
              Milestone Stage (Click to transition or edit details) *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isService ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
              {steps.map((st) => {
                const isSelected = action === st.action
                return (
                  <button
                    key={st.action}
                    type="button"
                    onClick={() => setAction(st.action)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 10px',
                      borderRadius: 10,
                      border: isSelected
                        ? '2px solid var(--clay, #B65B37)'
                        : '1px solid var(--border, #E5E2DC)',
                      background: isSelected ? 'rgba(182, 91, 55, 0.06)' : 'var(--white, #ffffff)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        fontSize: 11,
                        fontWeight: 800,
                        background: isSelected ? 'var(--clay, #B65B37)' : '#EAE6E1',
                        color: isSelected ? '#ffffff' : '#666666',
                        marginBottom: 6,
                      }}
                    >
                      {st.stepNum}
                    </span>
                    <strong
                      style={{
                        fontSize: 12,
                        color: isSelected ? 'var(--clay, #B65B37)' : 'var(--text, #1E1B18)',
                        lineHeight: 1.25,
                      }}
                    >
                      {st.label}
                    </strong>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: 'var(--text-muted, #777777)',
                        marginTop: 3,
                        lineHeight: 1.2,
                      }}
                    >
                      {st.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Delivery Rider Details (For physical orders) */}
          {!isService && (
            <div
              style={{
                background: '#FAF8F6',
                border: '1px solid var(--border, #E5E2DC)',
                borderRadius: 10,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={16} color="var(--clay, #B65B37)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Delivery Rider / Driver Details
                  </span>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Customer can tap to call rider directly
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 5,
                      color: 'var(--text)',
                    }}
                  >
                    Rider / Driver Name
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="e.g. Tunde Adebayo"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border, #E5E2DC)',
                      fontSize: 13,
                      color: 'var(--text)',
                      background: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 5,
                      color: 'var(--text)',
                    }}
                  >
                    Rider Phone Number
                  </label>
                  <input
                    type="tel"
                    value={technicianPhone}
                    onChange={(e) => setTechnicianPhone(e.target.value)}
                    placeholder="e.g. 08031234567"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border, #E5E2DC)',
                      fontSize: 13,
                      color: 'var(--text)',
                      background: '#fff',
                    }}
                  />
                </div>
              </div>

              {/* Courier Toggle */}
              <div style={{ borderTop: '1px dashed #E5E2DC', paddingTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCourierDetails(!showCourierDetails)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--clay, #B65B37)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ChevronRight
                    size={14}
                    style={{
                      transform: showCourierDetails ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  <span>Optional: 3rd-Party Courier (GIG, DHL, Tracking Number)</span>
                </button>

                {showCourierDetails && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                      marginTop: 10,
                      paddingTop: 4,
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
                        Logistics Partner
                      </label>
                      <input
                        type="text"
                        value={carrierName}
                        onChange={(e) => setCarrierName(e.target.value)}
                        placeholder="e.g. GIG Logistics, DHL, Kwik"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 12.5,
                          background: '#fff',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. GIG-LAG-98213"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 12.5,
                          background: '#fff',
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
                        Tracking Portal URL
                      </label>
                      <input
                        type="url"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://track.giglogistics.com/shipment/..."
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 12.5,
                          background: '#fff',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Fields */}
          {isService && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Appointment Date &amp; Time
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      fontSize: 13,
                      color: 'var(--text)',
                      background: '#fff',
                    }}
                  />
                  <select
                    value={serviceTime}
                    onChange={(e) => setServiceTime(e.target.value)}
                    aria-label="Appointment Time"
                    style={{
                      width: '100%',
                      padding: '9px 8px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      fontSize: 13,
                      color: 'var(--text)',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Service Window Notes
                </label>
                <input
                  type="text"
                  value={serviceWindowNotes}
                  onChange={(e) => setServiceWindowNotes(e.target.value)}
                  placeholder="e.g. 10:00 AM - 1:00 PM"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Assigned Crew / Specialist Name {action === 'TECHNICIAN_EN_ROUTE' ? '*' : ''}
                </label>
                <input
                  type="text"
                  required={action === 'TECHNICIAN_EN_ROUTE'}
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="e.g. Emmanuel Nwachukwu / Team Alpha"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Crew / Specialist Contact Phone {action === 'TECHNICIAN_EN_ROUTE' ? '*' : ''}
                </label>
                <input
                  type="tel"
                  required={action === 'TECHNICIAN_EN_ROUTE'}
                  value={technicianPhone}
                  onChange={(e) => setTechnicianPhone(e.target.value)}
                  placeholder="+23480..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Operational Notes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                Operational Notes / Dispatch Message
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Visible to customer on tracking timeline
              </span>
            </div>
            <textarea
              rows={3}
              value={adminOperationalNotes}
              onChange={(e) => setAdminOperationalNotes(e.target.value)}
              placeholder="e.g. Driver picked up order; expected delivery around 2:30 PM."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 13,
                resize: 'vertical',
                color: 'var(--text)',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '9px 18px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 22px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>{submitLabel}</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </Modal>
  )
}

