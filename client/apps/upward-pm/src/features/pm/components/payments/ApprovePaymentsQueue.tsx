'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, FileText, Download, Loader2, User, Building, CreditCard, Calendar, Hash, ExternalLink, ShieldCheck, AlertCircle, Edit3 } from 'lucide-react'
import { getPendingManualPayments, reviewManualPayment, downloadManualPaymentProof } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { DataTable, Column } from '@/components/common/DataTable'
import { Modal } from '@/components/ui/Modal/Modal'
import { downloadBlob } from '@/lib/download-helper'

interface EditableLineItem {
  id?: number
  name: string
  label?: string
  amount: number
  invoiceAmount?: number
  remainingAmount?: number
}

export function ApprovePaymentsQueue() {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [approvedAmount, setApprovedAmount] = useState<string>('')
  const [editableLineItems, setEditableLineItems] = useState<EditableLineItem[]>([])
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
      const lineItemRecords: any[] = pr?.lineItemRecords || []

      let initialItems: EditableLineItem[] = []

      if (selectedProof.lineItems && Array.isArray(selectedProof.lineItems) && selectedProof.lineItems.length > 0) {
        initialItems = selectedProof.lineItems.map((li: any) => {
          const matchPr = lineItemRecords.find(r => r.id === li.id || (r.name && (r.name.toLowerCase() === (li.name || li.label || '').toLowerCase())))
          const invAmt = matchPr ? Number(matchPr.totalAmount || matchPr.amount || 0) : undefined
          const remAmt = matchPr ? Math.max(0, invAmt! - Number(matchPr.amountPaid || 0)) : undefined
          const itemAmt = Number(li.amountAllocated ?? li.amount ?? li.amountPaid ?? 0)
          return {
            id: li.id ?? matchPr?.id,
            name: li.name || li.label || matchPr?.name || 'Rent',
            label: li.label || li.name || matchPr?.name || 'Rent',
            amount: itemAmt,
            invoiceAmount: invAmt,
            remainingAmount: remAmt,
          }
        })
      } else if (lineItemRecords.length > 0) {
        const meaningfulRecords = lineItemRecords.filter(r => !['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(r.name))
        const remainingTotal = pr ? Math.max(0, (pr.amount || 0) - (pr.amountPaid || 0)) : (selectedProof.amount || 0)
        const targetTotal = selectedProof.amount && selectedProof.amount > 0 ? selectedProof.amount : remainingTotal

        let remainingToDistribute = targetTotal
        initialItems = meaningfulRecords.map((r: any) => {
          const invAmt = Number(r.totalAmount || r.amount || 0)
          const remAmt = Math.max(0, invAmt - Number(r.amountPaid || 0))
          const alloc = Math.min(remainingToDistribute, remAmt > 0 ? remAmt : remainingToDistribute)
          remainingToDistribute = Math.max(0, remainingToDistribute - alloc)
          return {
            id: r.id,
            name: r.name || 'Rent',
            label: r.name || 'Rent',
            amount: alloc,
            invoiceAmount: invAmt,
            remainingAmount: remAmt,
          }
        })
      } else {
        const remaining = pr ? Math.max(0, (pr.amount || 0) - (pr.amountPaid || 0)) : (selectedProof.amount || 0)
        const initialAmt = selectedProof.amount && selectedProof.amount > 0 ? selectedProof.amount : (remaining > 0 ? remaining : (pr?.amount || 0))
        initialItems = [
          {
            name: 'Rent',
            label: 'Rent',
            amount: initialAmt,
            invoiceAmount: pr?.amount,
            remainingAmount: remaining,
          }
        ]
      }

      setEditableLineItems(initialItems)
      const totalSum = initialItems.reduce((acc, curr) => acc + (curr.amount || 0), 0)
      setApprovedAmount(totalSum > 0 ? String(totalSum) : String(selectedProof.amount || ''))
      setRemarks('')
      setActionType(null)
    }
  }, [selectedProof])
  
  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ['pm-pending-proofs'],
    queryFn: getPendingManualPayments
  })

  const { mutate: reviewProof, isPending } = useMutation({
    mutationFn: ({ id, status, remarks, amount, lineItems }: { id: string, status: 'APPROVED' | 'REJECTED', remarks?: string, amount?: number, lineItems?: any[] }) => 
      reviewManualPayment(id, status, remarks, amount, lineItems),
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

  const handleLineItemChange = (index: number, val: number | null) => {
    const num = val ?? 0
    const updated = [...editableLineItems]
    updated[index] = { ...updated[index], amount: num }
    setEditableLineItems(updated)
    const newTotal = updated.reduce((acc, it) => acc + (it.amount || 0), 0)
    setApprovedAmount(newTotal > 0 ? String(newTotal) : '')
  }

  const handleTotalAmountChange = (val: number | null) => {
    const newTotal = val ?? 0
    setApprovedAmount(newTotal > 0 ? String(newTotal) : '')
    
    if (editableLineItems.length === 0) return

    let remaining = newTotal
    const updated = editableLineItems.map((item, idx) => {
      if (idx === editableLineItems.length - 1) {
        return { ...item, amount: remaining }
      }
      const cap = item.remainingAmount && item.remainingAmount > 0 ? item.remainingAmount : (item.invoiceAmount || remaining)
      const alloc = Math.min(remaining, cap)
      remaining = Math.max(0, remaining - alloc)
      return { ...item, amount: alloc }
    })
    setEditableLineItems(updated)
  }

  const handleFillLineItem = (index: number) => {
    const item = editableLineItems[index]
    const target = item.remainingAmount ?? item.invoiceAmount ?? item.amount
    handleLineItemChange(index, target)
  }

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
      amount: parsed,
      lineItems: editableLineItems.map(li => ({
        id: li.id,
        name: li.name,
        label: li.label || li.name,
        amount: Number(li.amount) || 0,
        amountPaid: Number(li.amount) || 0,
      }))
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
                  Amount to Settle (Total)
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
                    handleTotalAmountChange(parsed)
                  }}
                />
              </div>
              <p className="proof-input-help">
                Editing the total will distribute it across the line items below, or you can edit each line item directly.
              </p>
            </div>

            {/* 4. Editable Line Item Allocation Breakdown */}
            {editableLineItems.length > 0 && (
              <div className="proof-card">
                <div className="proof-card__header">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[var(--clay)]" />
                    <span>Payment Allocation Breakdown</span>
                  </div>
                  <span className="proof-card__header-hint">Editable per line item</span>
                </div>
                <div className="proof-card__body">
                  {editableLineItems.map((item, idx) => {
                    return (
                      <div className="proof-lineitem-row" key={idx}>
                        <div className="proof-lineitem-meta">
                          <span className="proof-lineitem-name">{item.name || item.label || 'Rent'}</span>
                          {(item.invoiceAmount !== undefined || item.remainingAmount !== undefined) && (
                            <span className="proof-lineitem-sub">
                              {item.invoiceAmount !== undefined && `Inv: ${formatCurrency(item.invoiceAmount, currency)}`}
                              {item.remainingAmount !== undefined && ` · Due: ${formatCurrency(item.remainingAmount, currency)}`}
                            </span>
                          )}
                        </div>

                        <div className="proof-lineitem-input-wrap">
                          <span className="proof-lineitem-currency">₦</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="proof-lineitem-input"
                            placeholder="0"
                            disabled={isPending}
                            value={item.amount > 0 ? formatCurrencyInput(item.amount) : ''}
                            onChange={(e) => {
                              const parsed = parseCurrencyInput(e.target.value)
                              handleLineItemChange(idx, parsed)
                            }}
                          />
                          {item.remainingAmount !== undefined && item.remainingAmount > item.amount && (
                            <button
                              type="button"
                              className="proof-lineitem-max-btn"
                              title="Fill remaining balance"
                              onClick={() => handleFillLineItem(idx)}
                              disabled={isPending}
                            >
                              Max
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <div className="proof-lineitem-summary-row">
                    <span>Allocated Sum:</span>
                    <strong style={{ color: 'var(--text)' }}>
                      {formatCurrency(editableLineItems.reduce((acc, it) => acc + (it.amount || 0), 0), currency)}
                    </strong>
                  </div>
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
          justify-content: space-between;
          padding: 8px 14px;
          background: var(--surface2, #f8fafc);
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .proof-card__header-hint {
          font-size: 10px;
          color: var(--clay);
          font-weight: 600;
          text-transform: none;
        }

        .proof-card__body {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
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

        .proof-lineitem-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 0;
          border-bottom: 1px dashed var(--border);
        }

        .proof-lineitem-row:last-of-type {
          border-bottom: none;
        }

        .proof-lineitem-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .proof-lineitem-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .proof-lineitem-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .proof-lineitem-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .proof-lineitem-currency {
          position: absolute;
          left: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          pointer-events: none;
        }

        .proof-lineitem-input {
          width: 130px;
          height: 36px;
          padding: 0 10px 0 24px;
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          outline: none;
          text-align: right;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .proof-lineitem-input:focus {
          border-color: var(--clay);
          box-shadow: 0 0 0 2px var(--clay-faint);
        }

        .proof-lineitem-max-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--clay);
          cursor: pointer;
          transition: all 0.15s;
        }

        .proof-lineitem-max-btn:hover:not(:disabled) {
          background: var(--clay-faint);
          border-color: var(--clay);
        }

        .proof-lineitem-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
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

