'use client'

import React, { useState } from 'react'
import { 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Receipt, 
  ChevronRight,
  Home,
  User,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Check
} from 'lucide-react'
import { usePayouts, usePayoutBreakdown, useUnresolvedTransactions, useResolveTransaction } from '../../hooks/usePayments'
import { DataTable, Column } from '@/components/common/DataTable'
import { Modal } from '@/components/ui/Modal/Modal'
import { Spinner } from '@/components/common/Spinner'
import { useToast } from '@/components/common/Toast'

function PendingResolutionsList() {
  const { data: unresolved, isLoading } = useUnresolvedTransactions()
  const resolveMutation = useResolveTransaction()
  const { success, error } = useToast()

  if (isLoading) return null
  if (!unresolved || unresolved.length === 0) return null

  const handleResolve = (uuid: string, action: 'REFUND' | 'ACCEPT') => {
    resolveMutation.mutate({ uuid, action }, {
      onSuccess: (res) => {
        success(res.message || `Successfully processed ${action.toLowerCase()}`)
      },
      onError: (err: any) => {
        error(err.message || `Failed to process ${action.toLowerCase()}`)
      }
    })
  }

  return (
    <div className="pending-resolutions">
      <div className="section-header">
        <AlertCircle size={18} color="var(--error)" />
        <h3>Payments Pending Resolution</h3>
      </div>
      <p className="section-desc">
        The following payments are underpaid, duplicate, or failed our automated validation rules. You can manually refund the tenant or accept the payment.
      </p>

      <div className="resolutions-grid">
        {unresolved.map((tx: any) => (
          <div key={tx.id} className="resolution-card">
            <div className="resolution-card__main">
              <div className="resolution-card__tenant">
                <span className="tenant-name">{tx.user?.firstName} {tx.user?.lastName}</span>
                <span className="tenant-email">{tx.user?.email}</span>
              </div>
              <div className="resolution-card__property">
                <strong>Property:</strong> {tx.paymentRequest?.userProperty?.location?.address || 'N/A'} • Unit {tx.paymentRequest?.userProperty?.pmUnit?.unitName || 'N/A'}
              </div>
              <div className="resolution-card__amount">
                <span className="amount-paid">Paid: ₦{tx.amount.toLocaleString()}</span>
                {tx.paymentRequest && (
                  <span className="amount-owed">Owed: ₦{tx.paymentRequest.amount.toLocaleString()}</span>
                )}
              </div>
              <div className="resolution-card__reason">
                <span className="reason-badge">
                  {tx.paymentRequest ? 'Underpayment / Validation Conflict' : 'Duplicate Payment'}
                </span>
              </div>
            </div>
            
            <div className="resolution-card__actions">
              <button 
                className="btn btn--secondary btn--sm" 
                onClick={() => handleResolve(tx.uuid, 'REFUND')}
                disabled={resolveMutation.isPending}
                style={{ borderColor: 'var(--error-faint)', color: 'var(--error)' }}
              >
                <RotateCcw size={14} style={{ marginRight: 6 }} />
                Refund Tenant
              </button>
              <button 
                className="btn btn--primary btn--sm" 
                onClick={() => handleResolve(tx.uuid, 'ACCEPT')}
                disabled={resolveMutation.isPending}
              >
                <Check size={14} style={{ marginRight: 6 }} />
                Accept Payment
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .pending-resolutions {
          background: var(--bg-soft);
          border: 1px dashed var(--error);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .section-header h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .section-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .resolutions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .resolution-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .resolution-card__main {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .resolution-card__tenant {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tenant-name {
          font-weight: 700;
          font-size: 14px;
          color: var(--text);
        }
        .tenant-email {
          font-size: 12px;
          color: var(--text-muted);
        }
        .resolution-card__property {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .resolution-card__amount {
          display: flex;
          gap: 12px;
          font-size: 13px;
        }
        .amount-paid {
          font-weight: 600;
          color: var(--text);
        }
        .amount-owed {
          color: var(--text-muted);
          text-decoration: line-through;
        }
        .resolution-card__reason {
          margin-top: 4px;
        }
        .reason-badge {
          display: inline-block;
          padding: 2px 8px;
          background: var(--error-faint);
          color: var(--error);
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
        }
        .resolution-card__actions {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  )
}


export function PayoutsList() {
  const { data: payouts, isLoading } = usePayouts()
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr))
  }

  const columns: Column<any>[] = [
    {
      header: 'Batch Reference',
      render: (payout) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="payout-icon">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>BATCH-{payout.uuid.slice(-8).toUpperCase()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(payout.createdAt)}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Total Amount',
      render: (payout) => (
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
          ₦{payout.totalAmount.toLocaleString()}
        </div>
      )
    },
    {
      header: 'Transactions',
      render: (payout) => (
        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Receipt size={14} color="var(--text-muted)" />
          {payout._count?.transactions || 0} items
        </div>
      )
    },
    {
      header: 'Status',
      render: (payout) => {
        const status = payout.status.toLowerCase()
        return (
          <span className={`status-chip status-chip--${status}`}>
            {payout.status}
          </span>
        )
      }
    },
    {
      header: '',
      align: 'right',
      render: (payout) => (
        <button 
          className="btn-text" 
          onClick={() => setSelectedBatch(payout.uuid)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--clay)', fontWeight: 600, fontSize: 13 }}
        >
          View Breakdown
          <ChevronRight size={16} />
        </button>
      )
    }
  ]

  return (
    <div className="payouts-list">
      <PendingResolutionsList />
      
      <DataTable
        columns={columns}
        data={payouts || []}
        isLoading={isLoading}
        emptyMessage="No payouts found yet."
        pageSize={10}
      />

      {selectedBatch && (
        <PayoutBreakdownModal 
          uuid={selectedBatch} 
          onClose={() => setSelectedBatch(null)} 
        />
      )}

      <style jsx>{`
        .payout-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--clay-faint);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}


function PayoutBreakdownModal({ uuid, onClose }: { uuid: string, onClose: () => void }) {
  const { data: batch, isLoading } = usePayoutBreakdown(uuid)

  return (
    <Modal isOpen={true} onClose={onClose} title="Payout Breakdown" maxWidth={720}>
      {isLoading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </div>
      ) : batch ? (
        <div className="breakdown-modal">
          <div className="breakdown-header">
            <div className="batch-info">
              <span className="label">Reference</span>
              <span className="value">BATCH-{batch.uuid.slice(-8).toUpperCase()}</span>
            </div>
            <div className="batch-info">
              <span className="label">Total Settled</span>
              <span className="value value--large">₦{batch.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="transactions-list">
            <h4 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Included Transactions ({batch.transactions?.length || 0})
            </h4>
            
            <div className="tx-grid">
              {batch.transactions?.map((tx: any) => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-item__main">
                    <div className="tx-item__property">
                      <Home size={14} />
                      {tx.paymentRequest?.userProperty?.location?.address || 'Property Payment'}
                    </div>
                    <div className="tx-item__tenant">
                      <User size={14} />
                      Unit {tx.paymentRequest?.userProperty?.unitName || 'N/A'} • Ref: {tx.reference.slice(-8).toUpperCase()}
                    </div>
                  </div>
                  <div className="tx-item__amount">
                    <div className="amount-gross">₦{tx.amount.toLocaleString()}</div>
                    <div className="amount-net">
                      Settled: ₦{(tx.amount - 2000).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: 20, textAlign: 'center' }}>Failed to load breakdown.</div>
      )}

      <style jsx>{`
        .breakdown-modal {
          padding: 4px;
        }
        .breakdown-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          background: var(--bg-soft);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid var(--border);
        }
        .batch-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .value {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .value--large {
          font-size: 20px;
          color: var(--clay);
        }
        .tx-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tx-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .tx-item:hover {
          border-color: var(--clay-faint);
          background: var(--bg-soft);
        }
        .tx-item__main {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tx-item__property {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: var(--text);
        }
        .tx-item__tenant {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .tx-item__amount {
          text-align: right;
        }
        .amount-gross {
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
        }
        .amount-net {
          font-size: 11px;
          font-weight: 600;
          color: var(--success);
          margin-top: 2px;
        }
      `}</style>
    </Modal>
  )
}
