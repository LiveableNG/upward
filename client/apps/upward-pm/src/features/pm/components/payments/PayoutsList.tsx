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
  ArrowRight
} from 'lucide-react'
import { usePayouts, usePayoutBreakdown } from '../../hooks/usePayments'
import { DataTable, Column } from '@/components/common/DataTable'
import { Modal } from '@/components/ui/Modal/Modal'
import { Spinner } from '@/components/common/Spinner'

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
