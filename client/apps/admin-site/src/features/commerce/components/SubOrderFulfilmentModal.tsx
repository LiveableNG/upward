import React, { useState } from 'react'
import {
  X,
  Truck,
  Wrench,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react'
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
    isService ? 'SERVICE_SCHEDULE' : 'DISPATCH_CARRIER',
  )
  const [carrierName, setCarrierName] = useState(subOrder.carrierName || 'GIG Logistics')
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
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isService ? <Wrench size={20} color="var(--primary-color)" /> : <Truck size={20} color="var(--primary-color)" />}
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              Update Sub-Order Milestone
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#666', marginTop: 0, marginBottom: 16 }}>
          Sub-Order: <strong>{subOrder.subOrderNumber}</strong> · Current Status: <strong>{subOrder.customerStatus}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Action Select */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Milestone Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AdminFulfilmentTransitionAction)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13.5 }}
            >
              {isService ? (
                <>
                  <option value="SERVICE_SCHEDULE">Schedule Service Appointment</option>
                  <option value="TECHNICIAN_ASSIGN">Assign Technician</option>
                  <option value="TECHNICIAN_EN_ROUTE">Technician En Route</option>
                  <option value="COMPLETE_SERVICE">Complete Service</option>
                  <option value="VENDOR_CONFIRM">Confirm Booking</option>
                </>
              ) : (
                <>
                  <option value="DISPATCH_CARRIER">Dispatch to Carrier</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVER">Mark as Delivered</option>
                  <option value="VENDOR_CONFIRM">Vendor Confirmed</option>
                </>
              )}
            </select>
          </div>

          {/* Physical Delivery Fields */}
          {!isService && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Carrier Partner
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="e.g. GIG Logistics, DHL, Kwik"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GIG-LAG-98213"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Carrier Tracking Portal URL
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.giglogistics.com/shipment/..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>
            </div>
          )}

          {/* Service Fields */}
          {isService && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Appointment Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={serviceScheduledAt}
                  onChange={(e) => setServiceScheduledAt(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Service Window Notes
                </label>
                <input
                  type="text"
                  value={serviceWindowNotes}
                  onChange={(e) => setServiceWindowNotes(e.target.value)}
                  placeholder="e.g. 10:00 AM - 1:00 PM"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Technician Name
                </label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="e.g. Emmanuel Nwachukwu"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Technician Phone (Internal)
                </label>
                <input
                  type="tel"
                  value={technicianPhone}
                  onChange={(e) => setTechnicianPhone(e.target.value)}
                  placeholder="+23480..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                />
              </div>
            </div>
          )}

          {/* Operational Notes / Traffic delay advisory */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Operational Notes / Traffic Delay Notice
              </label>
              <span style={{ fontSize: 11, color: '#D97706' }}>
                Notifies tenant with ETA adjustment
              </span>
            </div>
            <textarea
              rows={3}
              value={adminOperationalNotes}
              onChange={(e) => setAdminOperationalNotes(e.target.value)}
              placeholder="e.g. Delivery ETA adjusted to 4:30 PM due to Mainland traffic congestion on Third Mainland Bridge."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>Dispatch Update</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
