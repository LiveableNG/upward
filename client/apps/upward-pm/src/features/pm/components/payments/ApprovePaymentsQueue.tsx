'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, FileText, Download, Loader2 } from 'lucide-react'
import { getPendingManualPayments, reviewManualPayment, downloadManualPaymentProof } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import { DataTable, Column } from '@/components/common/DataTable'
import { downloadBlob } from '@/lib/download-helper'

export function ApprovePaymentsQueue() {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [remarks, setRemarks] = useState('')
  const [mounted, setMounted] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ['pm-pending-proofs'],
    queryFn: getPendingManualPayments
  })

  const { mutate: reviewProof, isPending } = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string, status: 'APPROVED' | 'REJECTED', remarks?: string }) => 
      reviewManualPayment(id, status, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-pending-proofs'] })
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
      success(`Payment proof ${variables.status.toLowerCase()} successfully`)
      setSelectedProof(null)
      setRemarks('')
    },
    onError: (err: any) => {
      error(err.message || 'Failed to review payment proof')
    }
  })

  const handleDownload = async (proof: any) => {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      const blob = await downloadManualPaymentProof(proof.id) as Blob
      await downloadBlob(blob, proof.fileName || 'proof_of_payment')
    } catch (err: any) {
      error('Failed to download document')
    } finally {
      setIsDownloading(false)
    }
  }

  const emptyStateNode = (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 rounded-full bg-[var(--clay-faint)] flex items-center justify-center mb-4">
        <CheckCircle size={24} className="text-[var(--clay)]" />
      </div>
      <h3 className="text-lg font-bold text-[var(--text)]">All Caught Up!</h3>
      <p className="text-[var(--text-secondary)] mt-1">There are no pending manual payment proofs to review.</p>
    </div>
  )

  const columns: Column<any>[] = [
    {
      header: 'Tenant & Unit',
      render: (proof) => {
        const tenant = proof.paymentRequest?.user || proof.userProperty?.user || proof.paymentRequest?.userProperty?.user
        const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}`.trim() : 'Unknown Tenant'
        const unitName = proof.paymentRequest?.userProperty?.pmUnitId ? `Unit ${proof.paymentRequest.userProperty.pmUnitId}` : proof.userProperty?.pmUnitId ? `Unit ${proof.userProperty.pmUnitId}` : ''
        
        return (
          <div className="tenant-cell">
            <div className="tenant-avatar">
              {tenant ? `${tenant.firstName?.[0] || ''}${tenant.lastName?.[0] || ''}` : 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{tenantName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unitName || 'No Unit'}</div>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Property',
      render: (proof) => {
        const location = proof.paymentRequest?.userProperty?.location || proof.userProperty?.location
        const propertyName = location?.name || location?.address || 'Property'
        return <span style={{ fontSize: 13 }}>{propertyName}</span>
      }
    },
    {
      header: 'Expected Amount',
      render: (proof) => {
        const amount = proof.amount || proof.paymentRequest?.amount || 0
        const currency = proof.currency || proof.paymentRequest?.currency || 'NGN'
        return (
          <div className="amount-text">
            {formatCurrency(amount, currency)}
          </div>
        )
      }
    },
    {
      header: 'Upload Date',
      render: (proof) => (
        <div style={{ fontSize: 13 }}>
          {new Date(proof.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      )
    },
    {
      header: 'Status',
      render: (proof) => (
        <span className={`status-chip status-chip--${proof.status.toLowerCase()}`}>
          {proof.status}
        </span>
      )
    },
    {
      header: '',
      align: 'right',
      render: (proof) => (
        <button 
          className="btn btn--secondary btn--sm"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedProof(proof)
          }}
        >
          <Eye size={16} className="mr-2" /> Review
        </button>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={proofs}
        isLoading={isLoading}
        emptyMessage={emptyStateNode}
        onRowClick={(proof) => setSelectedProof(proof)}
        pageSize={10}
      />

      {selectedProof && mounted && createPortal(
        <div className="modal-overlay" onClick={() => {
          setSelectedProof(null)
          setRemarks('')
        }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="modal-header-icon" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="modal__title" style={{ marginBottom: 2 }}>
                    Review Payment Proof
                  </h2>
                  <p className="modal__desc" style={{ margin: 0 }}>
                    Verify the uploaded document and mark the payment as approved or rejected.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedProof(null)
                  setRemarks('')
                }} 
                className="btn-icon"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div className="join-request-card">
                <div className="join-request-card__header">
                  <CheckCircle size={14} />
                  <span>Payment Request Details</span>
                </div>
                <div className="join-request-card__body">
                  <div className="join-request-card__row">
                    <span className="join-request-card__label">Tenant</span>
                    <span className="join-request-card__val font-semibold">
                      {selectedProof.paymentRequest?.user?.firstName || selectedProof.userProperty?.user?.firstName} {selectedProof.paymentRequest?.user?.lastName || selectedProof.userProperty?.user?.lastName}
                    </span>
                  </div>
                  <div className="join-request-card__row">
                    <span className="join-request-card__label">Property</span>
                    <span className="join-request-card__val">
                      {selectedProof.paymentRequest?.userProperty?.location?.name || selectedProof.userProperty?.location?.name || 'Property'}
                    </span>
                  </div>
                  <div className="join-request-card__row">
                    <span className="join-request-card__label">Expected Amount</span>
                    <span className="join-request-card__val join-request-card__val--highlight">
                      {formatCurrency(selectedProof.amount || selectedProof.paymentRequest?.amount || 0, selectedProof.currency || selectedProof.paymentRequest?.currency || 'NGN')}
                    </span>
                  </div>
                </div>
              </div>

              {selectedProof.lineItems && selectedProof.lineItems.length > 0 && (
                <div className="join-request-card">
                  <div className="join-request-card__header" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}>
                    <CheckCircle size={14} />
                    <span>Custom Allocation Breakdown</span>
                  </div>
                  <div className="join-request-card__body">
                    {selectedProof.lineItems.map((item: any, idx: number) => (
                      <div className="join-request-card__row" key={idx}>
                        <span className="join-request-card__label">{item.name}</span>
                        <span className="join-request-card__val font-semibold">
                          {formatCurrency(item.amountPaid || item.amount || 0, selectedProof.currency || 'NGN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProof.senderName || selectedProof.referenceNumber || selectedProof.paymentDate ? (
                <div className="join-request-card">
                  <div className="join-request-card__header" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}>
                    <CheckCircle size={14} />
                    <span>Manual Transfer Details</span>
                  </div>
                  <div className="join-request-card__body">
                    {selectedProof.senderName && (
                      <div className="join-request-card__row">
                        <span className="join-request-card__label">Sender Name</span>
                        <span className="join-request-card__val font-semibold">{selectedProof.senderName}</span>
                      </div>
                    )}
                    {selectedProof.paymentDate && (
                      <div className="join-request-card__row">
                        <span className="join-request-card__label">Payment Date</span>
                        <span className="join-request-card__val">
                          {new Date(selectedProof.paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedProof.referenceNumber && (
                      <div className="join-request-card__row">
                        <span className="join-request-card__label">Reference Number</span>
                        <span className="join-request-card__val">{selectedProof.referenceNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {selectedProof.fileUrl && (
                <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileText size={20} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{selectedProof.fileName || 'Proof of Payment'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Document ready for review</div>
                    </div>
                  </div>
                  <button 
                    className="btn btn--secondary btn--sm"
                    onClick={() => handleDownload(selectedProof)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />
                    ) : (
                      <Download size={14} style={{ marginRight: 6 }} />
                    )}
                    {isDownloading ? 'Downloading...' : 'View'}
                  </button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Remarks (Optional)</label>
                <textarea 
                  className="form-input"
                  rows={3}
                  placeholder="Add a note for the tenant..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button 
                  className="btn"
                  style={{ flex: 1, background: 'var(--error-faint)', color: 'var(--error)', borderColor: 'var(--error-faint)' }}
                  onClick={() => reviewProof({ id: selectedProof.id, status: 'REJECTED', remarks })}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Reject
                </button>
                <button 
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  onClick={() => reviewProof({ id: selectedProof.id, status: 'APPROVED', remarks })}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Approve
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        /* Join Request Card (Reused for Payment Details) */
        .join-request-card {
          border: 1.5px solid var(--forest);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(22, 101, 52, 0.03);
        }
        .join-request-card__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(22, 101, 52, 0.07);
          border-bottom: 1px solid rgba(22, 101, 52, 0.12);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--forest);
        }
        .join-request-card__body {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .join-request-card__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .join-request-card__label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
        }
        .join-request-card__val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          text-align: right;
        }
        .join-request-card__val--highlight {
          color: var(--forest);
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
