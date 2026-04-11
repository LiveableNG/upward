'use client'

import { useRouter } from 'next/navigation'
import { Receipt, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'
import { type CompletedPayment } from '../types'

interface RecentActivityWidgetProps {
  payments: CompletedPayment[]
}

export function RecentActivityWidget({ payments }: RecentActivityWidgetProps) {
  const router = useRouter()
  const recent = payments.slice(0, 3)

  if (payments.length === 0) {
    return null
  }

  return (
    <div className="recent-activity desktop-only">
      <div className="recent-activity__header">
        <div className="recent-activity__title">
          <Receipt size={16} className="text--clay" />
          <h3>Recent Activity</h3>
        </div>
        <button className="recent-activity__see-all" onClick={() => router.push('/dashboard/transactions')}>
          <span>See all</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="recent-activity__list">
        {recent.map((tx) => {
          const isCredit = tx.type === 'credit'
          return (
            <div key={tx.uuid} className="recent-item" onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}>
              <div className={`recent-item__icon ${isCredit ? 'recent-item__icon--credit' : 'recent-item__icon--debit'}`}>
                {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
              <div className="recent-item__info">
                <h4>{tx.company_name}</h4>
                <p>{tx.channel || 'Paystack'} · {formatTime(tx.paid_at)}</p>
              </div>
              <div className={`recent-item__amount ${isCredit ? 'text--success' : ''}`}>
                {isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .recent-activity {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          animation: fadeInRight 0.4s ease-out;
        }

        .recent-activity__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .recent-activity__title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .recent-activity__title h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .recent-activity__see-all {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--clay);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .recent-activity__see-all:hover {
          background: var(--clay-faint);
        }

        .recent-activity__list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .recent-item:hover {
          background: var(--surface2);
          transform: translateX(4px);
        }

        .recent-item__icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .recent-item__icon--credit {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }

        .recent-item__icon--debit {
          background: var(--clay-faint);
          color: var(--clay);
        }

        .recent-item__info {
          flex: 1;
          min-width: 0;
        }

        .recent-item__info h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recent-item__info p {
          font-size: 11px;
          color: var(--text-muted);
          margin: 0;
        }

        .recent-item__amount {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }

        .text--clay {
          color: var(--clay);
        }

        .text--success {
          color: var(--success);
        }

        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
