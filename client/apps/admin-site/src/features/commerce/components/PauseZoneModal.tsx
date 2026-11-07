import React, { useState, useEffect } from 'react'
import { PauseCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { AdminDeliveryZone } from '../types'

interface PauseZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  zone: AdminDeliveryZone | null
}

export const PauseZoneModal: React.FC<PauseZoneModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  zone,
}) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (zone) {
      setReason(
        zone.pauseReason ||
          'Delivery temporarily suspended due to operational conditions.',
      )
    } else {
      setReason('')
    }
    setError(null)
  }, [zone, isOpen])

  if (!zone) return null

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)
      await onConfirm(reason.trim())
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to pause delivery for this zone.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pause Delivery Coverage"
      description={`Temporarily suspend deliveries to "${zone.name}". Customers will be notified why orders to this zone are paused.`}
      icon={<PauseCircle size={22} />}
      maxWidth="460px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '9px 18px', borderRadius: '8px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--clay)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13.5px',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <PauseCircle size={16} />}
            Pause Deliveries
          </button>
        </div>
      }
    >
      <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text)' }}>
                {zone.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {zone.state} {zone.region ? `· ${zone.region}` : ''}
              </div>
            </div>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {zone.tag}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor="pauseReason"
            style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}
          >
            Notice / Reason for Tenants <span style={{ color: 'var(--clay)' }}>*</span>
          </label>
          <textarea
            id="pauseReason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Delivery temporarily suspended due to road construction or operational conditions."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            disabled={submitting}
            required
          />
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            This message will be shown directly to customers attempting to order within this zone.
          </span>
        </div>
      </form>
    </Modal>
  )
}
