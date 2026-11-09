import React, { useState } from 'react'
import { ShieldAlert, HelpCircle, Send, CheckCircle2, User } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
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

export function ResolveDisputeModal({ dispute, onClose, onResolve }: ResolveDisputeModalProps) {
  const isInquiry =
    dispute.reason.startsWith('[Inquiry]') ||
    Boolean(dispute.subOrder?.subOrderNumber?.startsWith('INQ-'))
  const isAlreadyResolved = dispute.status.startsWith('RESOLVED') || dispute.status === 'CLOSED'

  const [isEditingReply, setIsEditingReply] = useState(!dispute.resolutionNotes)

  const [resolutionStatus, setResolutionStatus] = useState<DisputeStatus>(
    isAlreadyResolved ? dispute.status : isInquiry ? 'CLOSED' : 'RESOLVED_REFUND',
  )
  const [resolutionNotes, setResolutionNotes] = useState(dispute.resolutionNotes || '')
  const [refundAmountKobo, setRefundAmountKobo] = useState(
    dispute.subOrder
      ? String(BigInt(dispute.subOrder.subtotalKobo) + BigInt(dispute.subOrder.deliveryFeeKobo))
      : '0',
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolutionNotes.trim()) {
      alert('Please provide a message or resolution notes to explain the decision to the tenant.')
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

  const subOrderRef = dispute.subOrder?.subOrderNumber || `REF-${dispute.subOrderId}`
  const tenantName = dispute.subOrder?.order?.recipientName || 'Customer'

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        isAlreadyResolved
          ? isInquiry
            ? 'Inquiry Resolution Details'
            : 'Dispute Resolution Details'
          : isInquiry
            ? 'Reply to Inquiry & Resolve'
            : 'Resolve Customer Dispute'
      }
      description={
        isAlreadyResolved
          ? `Ticket ${subOrderRef} has been resolved.`
          : isInquiry
            ? 'Send an official response to the tenant regarding this product inquiry and complete the ticket.'
            : 'Review case specifics, determine financial settlement, and record official notes for tenant records.'
      }
      icon={isInquiry ? <HelpCircle size={22} /> : <ShieldAlert size={22} />}
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Ticket Context Box */}
        <div
          style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: isInquiry ? 'var(--accent-faint)' : 'rgba(239, 68, 68, 0.08)',
                  color: isInquiry ? 'var(--accent)' : '#ef4444',
                  border: `1px solid ${isInquiry ? 'var(--accent-muted)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}
              >
                {isInquiry ? 'INQUIRY' : 'DISPUTE'}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: 'var(--text)',
                }}
              >
                {subOrderRef}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              <User size={13} />
              <span>{tenantName}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {dispute.reason}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                background: 'var(--white)',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              {dispute.explanation || 'No customer notes provided.'}
            </div>
          </div>
        </div>

        {/* If already resolved and not editing, display resolution summary */}
        {isAlreadyResolved && !isEditingReply ? (
          <div
            style={{
              padding: 14,
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                Status: {dispute.status.replace(/_/g, ' ')}
              </span>
              {dispute.resolvedBy && (
                <span style={{ fontSize: 12, color: '#047857' }}>
                  · Resolved by {dispute.resolvedBy}
                </span>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#065f46',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                Resolution Notes / Reply
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#064e3b',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {dispute.resolutionNotes || 'No notes recorded.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditingReply(true)}
                style={{ padding: '8px 16px', fontSize: 12.5 }}
              >
                Edit Reply / Notes
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form for pending or editing inquiry / dispute */
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 6,
                  color: 'var(--text)',
                }}
              >
                Resolution Action
              </label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value as DisputeStatus)}
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
                {isInquiry ? (
                  <>
                    <option value="CLOSED">Answer Inquiry & Close Ticket</option>
                    <option value="RESOLVED_REFUND">Issue Customer Refund</option>
                    <option value="RESOLVED_PAYOUT">Resolve & Confirm Booking/Order</option>
                  </>
                ) : (
                  <>
                    <option value="RESOLVED_REFUND">
                      Resolve in Customer Favor (Approve Refund)
                    </option>
                    <option value="RESOLVED_PAYOUT">
                      Resolve in Partner Favor (Release Payout)
                    </option>
                    <option value="SETTLED_COMPROMISE">Settled via Mutual Compromise</option>
                    <option value="CLOSED">Administrative Closure</option>
                  </>
                )}
              </select>
            </div>

            {resolutionStatus === 'RESOLVED_REFUND' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Refund Amount (Kobo)
                </label>
                <input
                  type="text"
                  value={refundAmountKobo}
                  onChange={(e) => setRefundAmountKobo(e.target.value)}
                  placeholder="e.g. 500000 = ₦5,000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    display: 'block',
                  }}
                >
                  Amount in Kobo (100 Kobo = ₦1).
                </span>
              </div>
            )}

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                  {isInquiry ? 'Reply Message & Notes' : 'Official Resolution Notes'} *
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Emailed to customer
                </span>
              </div>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={
                  isInquiry
                    ? 'Type your answer or response to the customer question here...'
                    : 'Provide a clear, courteous summary of the resolution decision for tenant and partner records...'
                }
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
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
              {isAlreadyResolved && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingReply(false)}
                  disabled={submitting}
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  Cancel
                </button>
              )}
              {!isAlreadyResolved && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  Cancel
                </button>
              )}
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
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>
                      {isAlreadyResolved
                        ? 'Update Reply & Save'
                        : isInquiry
                          ? 'Send Reply & Resolve'
                          : 'Submit Resolution'}
                    </span>
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
