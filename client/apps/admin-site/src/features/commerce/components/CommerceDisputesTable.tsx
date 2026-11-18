import { useState, useMemo } from 'react'
import {
  ShieldAlert,
  HelpCircle,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
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

type DisputeFilterTab = 'ALL' | 'INQUIRY_PENDING' | 'OPEN_DISPUTES' | 'RESOLVED'

export function CommerceDisputesTable({
  disputes,
  total,
  loading,
  onResolveDispute,
}: CommerceDisputesTableProps) {
  const [activeDisputeForResolve, setActiveDisputeForResolve] = useState<AdminCommerceDispute | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DisputeFilterTab>('ALL')

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      const isResolved = d.status.startsWith('RESOLVED') || d.status === 'CLOSED'
      const isInquiry =
        d.reason.startsWith('[Inquiry]') ||
        Boolean(d.subOrder?.subOrderNumber?.startsWith('INQ-'))

      if (statusFilter === 'INQUIRY_PENDING' && (!isInquiry || isResolved)) return false
      if (statusFilter === 'OPEN_DISPUTES' && (isInquiry || isResolved)) return false
      if (statusFilter === 'RESOLVED' && !isResolved) return false

      if (!search.trim()) return true
      const term = search.toLowerCase()
      const ref = (d.subOrder?.subOrderNumber || `REF-${d.subOrderId}`).toLowerCase()
      const reason = d.reason.toLowerCase()
      const explanation = (d.explanation || '').toLowerCase()
      const tenant = (d.subOrder?.order?.recipientName || '').toLowerCase()

      return (
        ref.includes(term) ||
        reason.includes(term) ||
        explanation.includes(term) ||
        tenant.includes(term)
      )
    })
  }, [disputes, search, statusFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search and Quick Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by ref, inquiry question, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--white)',
                fontSize: 13,
                outline: 'none',
                color: 'var(--text)',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === 'ALL' ? 'var(--accent)' : 'var(--surface-hover)',
                color: statusFilter === 'ALL' ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              All ({disputes.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INQUIRY_PENDING')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === 'INQUIRY_PENDING' ? 'var(--accent)' : 'var(--surface-hover)',
                color: statusFilter === 'INQUIRY_PENDING' ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Pending Inquiries
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OPEN_DISPUTES')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === 'OPEN_DISPUTES' ? '#ef4444' : 'var(--surface-hover)',
                color: statusFilter === 'OPEN_DISPUTES' ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Open Disputes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RESOLVED')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === 'RESOLVED' ? '#10b981' : 'var(--surface-hover)',
                color: statusFilter === 'RESOLVED' ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Resolved
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Showing <strong>{filteredDisputes.length}</strong> of <strong>{total}</strong> tickets
        </div>
      </div>

      {/* Table Container */}
      <div className="table-wrapper">
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  borderBottom: '2px solid var(--border)',
                }}
              >
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Issue / Inquiry
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '150px' }}>
                  Reference
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '170px' }}>
                  Customer
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '150px' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Resolution Summary
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right', width: '150px' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} className="loader" />
                      <span>Loading support inquiries & disputes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDisputes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={36} color="#10b981" />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        No records match the filter
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        All product inquiries and customer disputes have been resolved.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDisputes.map((dispute) => {
                  const isResolved = dispute.status.startsWith('RESOLVED') || dispute.status === 'CLOSED'
                  const isInquiry =
                    dispute.reason.startsWith('[Inquiry]') ||
                    Boolean(dispute.subOrder?.subOrderNumber?.startsWith('INQ-'))
                  const refCode = dispute.subOrder?.subOrderNumber || `REF-${dispute.subOrderId}`
                  const tenantName =
                    dispute.subOrder?.order?.recipientName ||
                    'Customer'

                  return (
                    <tr
                      key={dispute.uuid}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      {/* Reason / Title & Explanation preview */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: isInquiry ? 'var(--accent-faint)' : 'rgba(239, 68, 68, 0.08)',
                              border: `1px solid ${isInquiry ? 'var(--accent-muted)' : 'rgba(239, 68, 68, 0.2)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isInquiry ? 'var(--accent)' : '#ef4444',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {isInquiry ? <HelpCircle size={16} /> : <ShieldAlert size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                              {dispute.reason}
                            </div>
                            <div
                              style={{
                                fontSize: 12.5,
                                color: 'var(--text-secondary)',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {dispute.explanation || 'No customer notes provided.'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reference & Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: 'var(--text)',
                            background: 'var(--surface-hover)',
                            padding: '3px 7px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            display: 'inline-block',
                            marginBottom: 4,
                          }}
                        >
                          {refCode}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {formatDate(dispute.createdAt)}
                        </div>
                      </td>

                      {/* Customer / Tenant */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {tenantName}
                        </div>
                        {dispute.subOrder?.order?.recipientPhone && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            {dispute.subOrder.order.recipientPhone}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            display: 'inline-block',
                            background: isResolved
                              ? 'rgba(16, 185, 129, 0.1)'
                              : isInquiry
                                ? 'var(--accent-faint)'
                                : 'rgba(239, 68, 68, 0.1)',
                            color: isResolved
                              ? '#059669'
                              : isInquiry
                                ? 'var(--accent)'
                                : '#dc2626',
                            border: `1px solid ${
                              isResolved
                                ? 'rgba(16, 185, 129, 0.2)'
                                : isInquiry
                                  ? 'var(--accent-muted)'
                                  : 'rgba(239, 68, 68, 0.2)'
                            }`,
                          }}
                        >
                          {isInquiry && !isResolved
                            ? 'INQUIRY PENDING'
                            : dispute.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Resolution Summary */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        {isResolved ? (
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#065f46',
                                background: 'rgba(16, 185, 129, 0.08)',
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                lineHeight: 1.4,
                              }}
                            >
                              <strong>Notes:</strong> {dispute.resolutionNotes || 'Resolved without notes.'}
                              {dispute.resolvedBy && (
                                <span style={{ display: 'block', fontSize: 11, color: '#047857', marginTop: 2 }}>
                                  Resolved by {dispute.resolvedBy}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Awaiting response & action
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDisputeForResolve(dispute)}
                          className={isResolved ? 'btn btn-secondary' : 'btn btn-primary'}
                          style={{
                            height: 32,
                            padding: '0 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isResolved ? (
                            <span>View Details</span>
                          ) : (
                            <>
                              <span>{isInquiry ? 'Reply & Resolve' : 'Resolve Case'}</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
