import React, { useState } from 'react'
import { Truck, Wrench, Send, Loader2 } from 'lucide-react'
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

  const [action, setAction] = useState<AdminFulfilmentTransitionAction>(
    isService ? 'SCHEDULE_SERVICE' : 'DISPATCH',
  )
  const [carrierName, setCarrierName] = useState(subOrder.carrierName || '')
  const [trackingNumber, setTrackingNumber] = useState(subOrder.trackingNumber || '')
  const [trackingUrl, setTrackingUrl] = useState(subOrder.trackingUrl || '')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((action === 'SCHEDULE_SERVICE' || action === 'SERVICE_SCHEDULE') && !serviceScheduledAt) {
      alert('Please select an Appointment Date & Time to schedule service.')
      return
    }

    if ((action === 'ASSIGN_TECHNICIAN' || action === 'TECHNICIAN_ASSIGN') && !technicianName.trim()) {
      alert('Please provide the Technician Name.')
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

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isService ? 'Service Fulfilment Milestone' : 'Shipping & Fulfilment Milestone'}
      description={`Sub-Order: ${subOrder.subOrderNumber} · Vendor: ${subOrder.vendor?.name || 'Upward Verified Merchant'}`}
      icon={isService ? <Wrench size={22} /> : <Truck size={22} />}
      maxWidth="580px"
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
            <span style={{ color: 'var(--text-muted)' }}>Customer Status: </span>
            <strong style={{ color: 'var(--text)' }}>{subOrder.customerStatus.replace(/_/g, ' ')}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Internal Status: </span>
            <strong style={{ color: 'var(--text)' }}>{subOrder.operationalStatus.replace(/_/g, ' ')}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Action Select */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
              Milestone Transition Action *
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AdminFulfilmentTransitionAction)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--white)',
                fontSize: 13.5,
                color: 'var(--text)',
              }}
            >
              {isService ? (
                <>
                  <option value="SCHEDULE_SERVICE">Schedule Service Appointment</option>
                  <option value="ASSIGN_TECHNICIAN">Assign Technician</option>
                  <option value="TECHNICIAN_EN_ROUTE">Technician En Route</option>
                  <option value="COMPLETE_SERVICE">Complete Service</option>
                  <option value="CONFIRM_BY_VENDOR">Confirm Booking (Vendor Confirmed)</option>
                </>
              ) : (
                <>
                  <option value="DISPATCH">Dispatch to Carrier Partner</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVER">Mark as Delivered</option>
                  <option value="CONFIRM_BY_VENDOR">Confirm Vendor Acceptance</option>
                </>
              )}
            </select>
          </div>

          {/* Physical Delivery Fields */}
          {!isService && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Carrier Partner {action === 'DISPATCH' && <span style={{ color: 'var(--accent-red, #dc2626)' }}>*</span>}
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="e.g. GIG Logistics, DHL, Kwik"
                  required={action === 'DISPATCH'}
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
                  Tracking Number {action === 'DISPATCH' && <span style={{ color: 'var(--accent-red, #dc2626)' }}>*</span>}
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GIG-LAG-98213"
                  required={action === 'DISPATCH'}
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

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                  Carrier Tracking Portal URL
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.giglogistics.com/shipment/..."
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
                  Technician Name
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
                  Technician Phone
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
                Visible in tracking timeline
              </span>
            </div>
            <textarea
              rows={3}
              value={adminOperationalNotes}
              onChange={(e) => setAdminOperationalNotes(e.target.value)}
              placeholder="e.g. Dispatched via GIG Logistics from Ikeja Central Hub; expected delivery by 3:00 PM."
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
                padding: '9px 20px',
                fontSize: 13,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="loader" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Dispatch Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
