import React, { useState } from 'react'
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import type { AdminCommerceDispute, DisputeStatus } from '../types'
import { ResolveDisputeModal } from './ResolveDisputeModal'

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

interface CommerceDisputesTableProps {
  disputes: AdminCommerceDispute[]
  total: number
  loading: boolean
  onResolveDispute: (
    disputeUuid: string,
    payload: {
      resolutionStatus: DisputeStatus
      resolutionNotes: string
      refundAmountKobo?: string
    },
  ) => Promise<any>
}

export function CommerceDisputesTable({
  disputes,
  total,
  loading,
  onResolveDispute,
}: CommerceDisputesTableProps) {
  const [activeDisputeForResolve, setActiveDisputeForResolve] = useState<AdminCommerceDispute | null>(null)

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          Showing <strong>{disputes.length}</strong> of <strong>{total}</strong> inquiries & disputes
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          Loading concierge disputes...
        </div>
      ) : disputes.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fafafa', borderRadius: 12, border: '1px dashed #ddd' }}>
          <ShieldAlert size={36} color="#059669" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>No active disputes</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#777' }}>
            All tenant inquiries and complaints have been reviewed and resolved.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.map((dispute) => {
            const isResolved = dispute.status.startsWith('RESOLVED') || dispute.status === 'CLOSED'
            const isInquiry =
              dispute.reason.startsWith('[Inquiry]') ||
              Boolean(dispute.subOrder?.subOrderNumber?.startsWith('INQ-'))

            return (
              <div
                key={dispute.uuid}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e5e5',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
                        {dispute.reason}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isResolved
                            ? 'rgba(5, 150, 105, 0.1)'
                            : isInquiry
                              ? 'rgba(217, 119, 87, 0.12)'
                              : 'rgba(220, 38, 38, 0.1)',
                          color: isResolved
                            ? '#059669'
                            : isInquiry
                              ? '#B65B37'
                              : '#DC2626',
                        }}
                      >
                        {isInquiry && !isResolved ? 'INQUIRY PENDING' : dispute.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#666' }}>
                      {isInquiry ? 'Inquiry Ref' : 'Sub-Order'}: <strong>{dispute.subOrder?.subOrderNumber || dispute.subOrderId}</strong> · Logged on {formatDate(dispute.createdAt)}
                      {dispute.subOrder?.order?.recipientName && (
                        <span style={{ marginLeft: 8, color: '#444' }}>
                          · Tenant: <strong>{dispute.subOrder.order.recipientName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => setActiveDisputeForResolve(dispute)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        background: isInquiry ? '#B65B37' : '#DC2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isInquiry ? 'Reply & Resolve' : 'Resolve Case'}
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 13, color: '#333', background: '#fafafa', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>
                  {dispute.explanation}
                </div>

                {dispute.resolutionNotes && (
                  <div style={{ marginTop: 10, padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                    <strong>Resolution ({dispute.status}):</strong> {dispute.resolutionNotes} · Resolved by {dispute.resolvedBy}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Resolve Modal */}
      {activeDisputeForResolve && (
        <ResolveDisputeModal
          dispute={activeDisputeForResolve}
          onClose={() => setActiveDisputeForResolve(null)}
          onResolve={onResolveDispute}
        />
      )}
    </div>
  )
}
