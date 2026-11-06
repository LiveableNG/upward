import React, { useState } from 'react'
import { X, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react'
import type { AdminCommerceDispute, DisputeStatus } from '../types'

interface ResolveDisputeModalProps {
  dispute: AdminCommerceDispute
  onClose: () => void
  onResolve: (
    disputeUuid: string,
    payload: {
      resolutionStatus: DisputeStatus
      resolutionNotes: string
      refundAmountKobo?: string
    },
  ) => Promise<any>
}

export function ResolveDisputeModal({
  dispute,
  onClose,
  onResolve,
}: ResolveDisputeModalProps) {
  const [resolutionStatus, setResolutionStatus] = useState<DisputeStatus>('RESOLVED_REFUND')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [refundAmountKobo, setRefundAmountKobo] = useState(
    dispute.subOrder
      ? String(
          BigInt(dispute.subOrder.subtotalKobo) + BigInt(dispute.subOrder.deliveryFeeKobo),
        )
      : '',
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes explaining the decision to the tenant.')
      return
    }

    setSubmitting(true)
    try {
      await onResolve(dispute.uuid, {
        resolutionStatus,
        resolutionNotes: resolutionNotes.trim(),
        refundAmountKobo:
          resolutionStatus === 'RESOLVED_REFUND' && refundAmountKobo ? refundAmountKobo : undefined,
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
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} color="#DC2626" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              Resolve Concierge Dispute
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: '#FAF8F6', border: '1px solid #E5E2DC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
            Sub-Order: <strong>{dispute.subOrder?.subOrderNumber || dispute.subOrderId}</strong>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E1B18', marginBottom: 4 }}>
            Reason: {dispute.reason}
          </div>
          <div style={{ fontSize: 12.5, color: '#444' }}>
            {dispute.explanation}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Resolution Decision
            </label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value as DisputeStatus)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13.5 }}
            >
              <option value="RESOLVED_REFUND">Resolve in Customer Favor (Approve Refund)</option>
              <option value="RESOLVED_PAYOUT">Resolve in Partner Favor (Release Payout)</option>
              <option value="SETTLED_COMPROMISE">Settled via Mutual Compromise</option>
              <option value="CLOSED">Administrative Closure</option>
            </select>
          </div>

          {resolutionStatus === 'RESOLVED_REFUND' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Refund Amount (Kobo)
              </label>
              <input
                type="text"
                value={refundAmountKobo}
                onChange={(e) => setRefundAmountKobo(e.target.value)}
                placeholder="Amount in Kobo (e.g. 500000 = ₦5,000)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
              />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Resolution Notes
              </label>
              <span style={{ fontSize: 11, color: '#666' }}>Emailed to tenant</span>
            </div>
            <textarea
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Provide a clear, courteous summary of the resolution for the tenant and partner records..."
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
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
                background: resolutionStatus === 'RESOLVED_REFUND' ? '#059669' : 'var(--primary-color, #B65B37)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              <span>Execute Resolution</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
