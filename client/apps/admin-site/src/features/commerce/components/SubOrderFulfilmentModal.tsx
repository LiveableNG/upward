import React, { useState } from 'react'
import { Truck, Wrench, Send, Loader2, User, ChevronRight } from 'lucide-react'
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
}

export function SubOrderFulfilmentModal({
  subOrder,
  onClose,
  onUpdate,
}: SubOrderFulfilmentModalProps) {
  const isService = (subOrder.items || []).some((i) => i.offeringType === 'SERVICE')

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
  const [serviceScheduledAt, setServiceScheduledAt] = useState(
    subOrder.serviceScheduledAt ? subOrder.serviceScheduledAt.slice(0, 16) : '',
  )
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((action === 'SCHEDULE_SERVICE' || action === 'SERVICE_SCHEDULE') && !serviceScheduledAt) {
      alert('Please select an Appointment Date & Time to schedule service.')
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
                  Appointment Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={serviceScheduledAt}
                  onChange={(e) => setServiceScheduledAt(e.target.value)}
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
                  Specialist Name
                </label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="e.g. Emmanuel Nwachukwu"
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
                  Specialist Phone
                </label>
                <input
                  type="tel"
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
      </div>
    </Modal>
  )
}

