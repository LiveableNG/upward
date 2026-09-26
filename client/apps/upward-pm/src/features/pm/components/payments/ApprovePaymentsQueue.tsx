'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, FileText, Download, Loader2, User, Building, CreditCard, Calendar, Hash, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'
import { getPendingManualPayments, reviewManualPayment, downloadManualPaymentProof } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { DataTable, Column } from '@/components/common/DataTable'
import { Modal } from '@/components/ui/Modal/Modal'
import { downloadBlob } from '@/lib/download-helper'

export function ApprovePaymentsQueue() {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [approvedAmount, setApprovedAmount] = useState<string>('')
  const [remarks, setRemarks] = useState('')
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (selectedProof) {
      const pr = selectedProof.paymentRequest
      const remaining = pr ? Math.max(0, (pr.amount || 0) - (pr.amountPaid || 0)) : (selectedProof.amount || 0)
      const initialAmt = selectedProof.amount && selectedProof.amount > 0 
        ? selectedProof.amount 
        : (remaining > 0 ? remaining : (pr?.amount || 0))
      
      setApprovedAmount(String(initialAmt || ''))
      setRemarks('')
      setActionType(null)
    }
  }, [selectedProof])
  
  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ['pm-pending-proofs'],
    queryFn: getPendingManualPayments
  })

  const { mutate: reviewProof, isPending } = useMutation({
    mutationFn: ({ id, status, remarks, amount }: { id: string, status: 'APPROVED' | 'REJECTED', remarks?: string, amount?: number }) => 
      reviewManualPayment(id, status, remarks, amount),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-pending-proofs'] })
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pm-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit-details'] })
      success(`Payment proof ${variables.status.toLowerCase()} successfully`)
      setSelectedProof(null)
      setRemarks('')
      setActionType(null)
    },
    onError: (err: any) => {
      error(err.message || 'Failed to review payment proof')
      setActionType(null)
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

  const handleApprove = () => {
    if (isPending) return
    const parsed = Number(approvedAmount)
    if (isNaN(parsed) || parsed <= 0) {
      error('Please enter a valid approved amount greater than 0')
      return
    }

    setActionType('APPROVED')
    reviewProof({
      id: selectedProof.id,
      status: 'APPROVED',
      remarks: remarks.trim() || undefined,
      amount: parsed
    })
  }

  const handleReject = () => {
    if (isPending) return
    setActionType('REJECTED')
    reviewProof({
      id: selectedProof.id,
      status: 'REJECTED',
      remarks: remarks.trim() || undefined
    })
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
      header: 'Amount Claimed',
      render: (proof) => {
        const pr = proof.paymentRequest
        const remaining = pr ? Math.max(0, (pr.amount || 0) - (pr.amountPaid || 0)) : (proof.amount || 0)
        const amount = proof.amount || remaining || pr?.amount || 0
        const currency = proof.currency || pr?.currency || 'NGN'
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

  const pr = selectedProof?.paymentRequest
  const prTotal = pr?.amount || selectedProof?.amount || 0
  const prPaidAlready = pr?.amountPaid || 0
  const prRemaining = pr ? Math.max(0, prTotal - prPaidAlready) : (selectedProof?.amount || 0)
  const currency = selectedProof?.currency || pr?.currency || 'NGN'
  const proofAmountClaimed = selectedProof?.amount || prRemaining

  const tenant = selectedProof?.paymentRequest?.user || selectedProof?.userProperty?.user || selectedProof?.paymentRequest?.userProperty?.user
  const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}`.trim() : 'Unknown Tenant'
  const propertyName = selectedProof?.paymentRequest?.userProperty?.location?.name || 
                       selectedProof?.userProperty?.location?.name || 
                       selectedProof?.paymentRequest?.userProperty?.location?.address || 
                       'Property'

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

      <Modal
        isOpen={!!selectedProof && mounted}
        onClose={() => {
          if (isPending) return
          setSelectedProof(null)
          setRemarks('')
          setActionType(null)
        }}
        title="Review Payment Proof"
        subtitle="Verify the bank transfer proof and settle the payment to update the tenant's ledger."
        icon={FileText}
        maxWidth={580}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button 
              type="button"
              className="btn btn--danger-subtle"
              style={{ flex: 1, height: 44, fontWeight: 600 }}
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending && actionType === 'REJECTED' ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle size={16} style={{ marginRight: 8 }} />
                  Reject Proof
                </>
              )}
            </button>
            <button 
              type="button"
              className="btn btn--primary"
              style={{ flex: 1.5, height: 44, fontWeight: 600 }}
              onClick={handleApprove}
              disabled={isPending || !approvedAmount || Number(approvedAmount) <= 0}
            >
              {isPending && actionType === 'APPROVED' ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />
                  Approving & Settling...
                </>
              ) : (
                <>
                  <CheckCircle size={16} style={{ marginRight: 8 }} />
                  Approve & Settle ({formatCurrency(Number(approvedAmount) || 0, currency)})
                </>
              )}
            </button>
          </div>
        }
      >
        {selectedProof && (
          <div className="proof-modal-content">
            
            {/* 1. Tenant & Property Context Strip */}
            <div className="proof-context-card">
              <div className="proof-context-avatar">
                {tenant ? `${tenant.firstName?.[0] || ''}${tenant.lastName?.[0] || ''}` : <User size={18} />}
              </div>
              <div className="proof-context-details">
                <div className="proof-context-name">{tenantName}</div>
                <div className="proof-context-sub">{propertyName}</div>
              </div>
              {pr?.status && (
                <span className={`status-chip status-chip--${pr.status.toLowerCase()}`}>
                  {pr.status}
                </span>
              )}
            </div>

            {/* 2. Invoice Balance Summary Strip */}
            <div className="proof-balance-grid">
              <div className="proof-balance-card">
                <span className="proof-balance-label">Invoice Total</span>
                <span className="proof-balance-val">{formatCurrency(prTotal, currency)}</span>
              </div>
              <div className="proof-balance-card">
                <span className="proof-balance-label">Paid to Date</span>
                <span className="proof-balance-val" style={{ color: prPaidAlready > 0 ? 'var(--forest)' : 'var(--text-muted)' }}>
                  {formatCurrency(prPaidAlready, currency)}
                </span>
              </div>
              <div className="proof-balance-card proof-balance-card--highlight">
                <span className="proof-balance-label">Remaining Balance</span>
                <span className="proof-balance-val" style={{ color: 'var(--clay)' }}>
                  {formatCurrency(prRemaining, currency)}
                </span>
              </div>
            </div>

            {/* 3. Editable Approved Amount Box */}
            <div className="proof-amount-section">
              <div className="proof-amount-header">
                <label className="proof-amount-label" htmlFor="approved-amount-input">
                  Amount to Settle
                </label>
                <span className="proof-amount-hint">
                  Tenant Claimed: <strong>{formatCurrency(proofAmountClaimed, currency)}</strong>
                </span>
              </div>
              <div className="proof-input-wrap">
                <span className="proof-input-currency">₦</span>
                <input
                  id="approved-amount-input"
                  type="text"
                  inputMode="numeric"
                  className="proof-amount-input"
                  placeholder="0"
                  disabled={isPending}
                  value={approvedAmount ? formatCurrencyInput(Number(approvedAmount) || 0) : ''}
                  onChange={(e) => {
                    const parsed = parseCurrencyInput(e.target.value)
                    setApprovedAmount(parsed !== null ? String(parsed) : '')
                  }}
                />
              </div>
              <p className="proof-input-help">
                You can edit this amount if the actual bank deposit was different from the requested or claimed amount.
              </p>
            </div>

            {/* 4. Custom Allocation Breakdown (if provided) */}
            {selectedProof.lineItems && selectedProof.lineItems.length > 0 && (
              <div className="proof-card">
                <div className="proof-card__header">
                  <ShieldCheck size={14} />
                  <span>Payment Allocation Breakdown</span>
                </div>
                <div className="proof-card__body">
                  {selectedProof.lineItems.map((item: any, idx: number) => {
                    const itemAmt = Number(item.amountAllocated ?? item.amount ?? item.amountPaid ?? 0)
                    return (
                      <div className="proof-card__row" key={idx}>
                        <span className="proof-card__label">{item.name || item.label || 'Rent'}</span>
                        <span className="proof-card__val font-semibold">
                          {formatCurrency(itemAmt, currency)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 5. Transfer Metadata (Sender, Reference, Date) */}
            {(selectedProof.senderName || selectedProof.referenceNumber || selectedProof.paymentDate) && (
              <div className="proof-card">
                <div className="proof-card__header">
                  <CreditCard size={14} />
                  <span>Bank Transfer Details</span>
                </div>
                <div className="proof-card__body">
                  {selectedProof.senderName && (
                    <div className="proof-card__row">
                      <span className="proof-card__label">Sender Name</span>
                      <span className="proof-card__val font-semibold">{selectedProof.senderName}</span>
                    </div>
                  )}
                  {selectedProof.paymentDate && (
                    <div className="proof-card__row">
                      <span className="proof-card__label">Payment Date</span>
                      <span className="proof-card__val">
                        {new Date(selectedProof.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedProof.referenceNumber && (
                    <div className="proof-card__row">
                      <span className="proof-card__label">Reference Number</span>
                      <span className="proof-card__val font-mono">{selectedProof.referenceNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Uploaded Document Card */}
            {selectedProof.fileUrl && (
              <div className="proof-doc-card">
                <div className="proof-doc-info">
                  <div className="proof-doc-icon">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="proof-doc-name">{selectedProof.fileName || 'Proof of Payment Document'}</div>
                    <div className="proof-doc-sub">Document uploaded by tenant</div>
                  </div>
                </div>
                <button 
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => handleDownload(selectedProof)}
                  disabled={isDownloading || isPending}
                >
                  {isDownloading ? (
                    <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />
                  ) : (
                    <Download size={14} style={{ marginRight: 6 }} />
                  )}
                  {isDownloading ? 'Downloading...' : 'View / Download'}
                </button>
              </div>
            )}

            {/* 7. Remarks Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>
                Remarks / Note to Tenant (Optional)
              </label>
              <textarea 
                className="form-input"
                rows={2}
                placeholder="e.g. Bank transfer verified on Statement"
                value={remarks}
                disabled={isPending}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ resize: 'none', borderRadius: 10, fontSize: 13 }}
              />
            </div>

          </div>
        )}
      </Modal>

      <style jsx>{`
        .proof-modal-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 8px;
        }

        .proof-context-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--surface2, #f8fafc);
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .proof-context-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--clay-faint);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .proof-context-details {
          flex: 1;
          min-width: 0;
        }

        .proof-context-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .proof-context-sub {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .proof-balance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .proof-balance-card {
          padding: 10px 12px;
          border-radius: 12px;
          background: var(--surface2, #f8fafc);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .proof-balance-card--highlight {
          background: var(--clay-faint);
          border-color: rgba(180, 154, 105, 0.25);
        }

        .proof-balance-label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .proof-balance-val {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
        }

        .proof-amount-section {
          background: #ffffff;
          border: 1.5px solid var(--clay);
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 2px 8px rgba(180, 154, 105, 0.08);
        }

        .proof-amount-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .proof-amount-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
        }

        .proof-amount-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        .proof-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .proof-input-currency {
          position: absolute;
          left: 14px;
          font-size: 18px;
          font-weight: 700;
          color: var(--clay);
          pointer-events: none;
        }

        .proof-amount-input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 32px;
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .proof-amount-input:focus {
          border-color: var(--clay);
          box-shadow: 0 0 0 3px var(--clay-faint);
        }

        .proof-input-help {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
          line-height: 1.4;
        }

        .proof-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          background: var(--surface);
        }

        .proof-card__header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--surface2, #f8fafc);
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .proof-card__body {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .proof-card__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .proof-card__label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .proof-card__val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .proof-doc-card {
          padding: 12px 14px;
          background: var(--surface2, #f8fafc);
          border-radius: 12px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .proof-doc-info {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .proof-doc-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--clay-faint);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .proof-doc-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .proof-doc-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .btn--danger-subtle {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .btn--danger-subtle:hover:not(:disabled) {
          background: #fecaca;
          color: #b91c1c;
        }
      `}</style>
    </div>
  )
}

