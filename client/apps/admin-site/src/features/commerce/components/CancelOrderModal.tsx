import React, { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { AdminCommerceOrder } from '../types'

interface CancelOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (orderUuid: string, reason: string) => Promise<void>
  order: AdminCommerceOrder | null
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  order,
}) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReason('')
    setError(null)
  }, [order, isOpen])

  if (!order) return null

  const isPaid = order.paymentStatus === 'PAID'

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a specific cancellation reason (minimum 3 characters)')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await onConfirm(order.uuid, reason.trim())
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel Order #${order.orderNumber}`}
      description="Cancelling this order will release reserved inventory, mark all fulfillment packages as cancelled, and notify the customer via push and in-app notifications."
      icon={<AlertTriangle size={22} color="#dc2626" />}
      maxWidth="480px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Keep Order
          </button>
          <button
            type="submit"
            form="cancel-order-form"
            className="btn btn-danger"
            disabled={submitting || !reason.trim()}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              borderColor: '#b91c1c',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </button>
        </div>
      }
    >
      <form id="cancel-order-form" onSubmit={handleConfirm}>
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: 6,
              padding: '10px 14px',
              fontSize: 13,
              color: '#dc2626',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              Customer: <strong>{order.recipientName}</strong> ({order.recipientPhone})
            </div>
            <div>
              Payment Status:{' '}
              <strong style={{ color: isPaid ? '#059669' : '#d97706' }}>
                {order.paymentStatus}
              </strong>
              {isPaid && ' — Customer will be notified that a full refund is underway.'}
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 8 }}>
          <label
            htmlFor="cancel-reason"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: 'var(--text)',
            }}
          >
            Reason for Cancellation <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            className="form-input"
            placeholder="e.g., Customer requested cancellation, merchant out of stock, unserviceable address..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 13,
              resize: 'vertical',
            }}
          />
        </div>
      </form>
    </Modal>
  )
}
