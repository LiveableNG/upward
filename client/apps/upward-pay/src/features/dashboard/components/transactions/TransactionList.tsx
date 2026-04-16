'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Filter,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  Download,
} from 'lucide-react'
import { TransactionSkeleton } from './TransactionSkeleton'
import { useDashboard } from '../../hooks/useDashboard'
import { formatCurrency, groupTransactionsByDate, formatTime } from '@/lib/utils'
import { type CompletedPayment } from '../../types'

export function TransactionList() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  const handleTxClick = (tx: CompletedPayment) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setExpandedTxId(expandedTxId === tx.uuid ? null : tx.uuid)
    } else {
      router.push(`/dashboard/receipts?id=${tx.uuid}`)
    }
  }

  if (loading) return <TransactionSkeleton />
  if (error || !data)
    return (
      <div className="dashboard dashboard--error">
        <div className="pay-page__error">
          <div className="pay-page__error-icon">
            <AlertTriangle size={32} />
          </div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    )

  const transactions = data.completedPayments

  const filteredTransactions = transactions.filter((tx) => {
    const matchesDate = filterDate ? tx.paid_at?.startsWith(filterDate) : true
    const q = search.toLowerCase()
    const matchesSearch = q
      ? tx.company_name?.toLowerCase().includes(q) ||
        tx.channel?.toLowerCase().includes(q) ||
        tx.paystack_reference?.toLowerCase().includes(q) ||
        formatCurrency(tx.amount, tx.currency).toLowerCase().includes(q) ||
        ((tx.type || 'debit') as string).toLowerCase().includes(q)
      : true
    return matchesDate && matchesSearch
  })

  const grouped = groupTransactionsByDate(filteredTransactions)
  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div className="transactions-list-page dashboard--nav-offset">
      <header className="dashboard__header" style={{ marginBottom: 32 }}>
        <div className="dashboard__header-left">
          <button className="dashboard__back mobile-only" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="dashboard__title">Transactions</h2>
        </div>
        <div className="dashboard__header-right">
          <div className="dashboard__filter">
            <input
              type="date"
              className="dashboard__filter-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <div className="dashboard__filter-icon">
              <Filter size={18} />
            </div>
          </div>
        </div>
      </header>

      <div className="transaction-search">
        <div className="transaction-search__input-wrap">
          <Search size={16} className="transaction-search__icon" />
          <input
            type="text"
            className="transaction-search__field"
            placeholder="Search name, channel, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="transaction-search__clear" onClick={() => setSearch('')}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon">
            <Receipt size={32} />
          </span>
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div className="dashboard__transactions-list">
          {dates.map((date) => (
            <div key={date} className="dashboard__transaction-group">
              <h4 className="dashboard__transaction-group-date">{date}</h4>
              <div className="dashboard__transaction-items">
                {grouped[date].map((tx: CompletedPayment) => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <div key={tx.uuid} className={`transaction-wrapper ${expandedTxId === tx.uuid ? 'is-expanded' : ''}`}>
                      <div
                        className={`transaction-item ${isCredit ? 'transaction-item--credit' : 'transaction-item--debit'}`}
                        onClick={() => handleTxClick(tx)}
                      >
                        <div
                          className={`transaction-item__icon-wrap ${isCredit ? 'transaction-item__icon-wrap--credit' : 'transaction-item__icon-wrap--debit'}`}
                        >
                          {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>

                        <div className="transaction-item__info">
                          <div className="transaction-item__name">{tx.company_name}</div>
                          {tx.property_address && (
                            <div className="transaction-item__location" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {tx.property_address}
                            </div>
                          )}
                          <div className="transaction-item__meta">
                            <span className="transaction-item__channel">
                              {tx.channel || 'Paystack'} · {formatTime(tx.paid_at)}
                            </span>
                            <span
                              className={`transaction-item__type-badge ${isCredit ? 'transaction-item__type-badge--credit' : (tx.transactionType === 'FUTURE_CREDIT' ? 'transaction-item__type-badge--future' : 'transaction-item__type-badge--debit')}`}
                            >
                              {tx.transactionType === 'FUTURE_CREDIT' ? 'Future Credit' : (tx.type || 'debit')}
                            </span>
                          </div>
                        </div>

                        <div className="transaction-item__right">
                          <span
                            className={`transaction-item__amount ${isCredit ? 'transaction-item__amount--credit' : ''}`}
                          >
                            {isCredit ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.currency)}
                          </span>

                            <button
                              className="transaction-item__receipt-btn mobile-only"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/receipts?id=${tx.uuid}`)
                              }}
                            >
                              View Receipt
                            </button>
                          </div>
                        </div>

                        {expandedTxId === tx.uuid && (
                          <div className="transaction-inline-details desktop-only animate-fade-in">
                          <div className="tid-receipt-header">
                            <h5 className="tid-receipt-title">Payment Receipt Breakdown</h5>
                            <span className="tid-receipt-number">Ref: {tx.paystack_reference || 'N/A'}</span>
                          </div>

                          <div className="tid-breakdown">
                            {(tx.lineItems && tx.lineItems.length > 0) ? (
                              tx.lineItems.map((item: any, idx: number) => (
                                <div key={idx} className="tid-breakdown-row">
                                  <span className="tid-breakdown-lbl">{item.label}</span>
                                  <span className="tid-breakdown-val">{formatCurrency(item.amount, tx.currency)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="tid-breakdown-row">
                                <span className="tid-breakdown-lbl">{tx.transactionType === 'FUTURE_CREDIT' ? 'Future Credit Balance' : 'Total Amount Paid'}</span>
                                <span className="tid-breakdown-val">{formatCurrency(tx.amount, tx.currency)}</span>
                              </div>
                            )}
                            <div className="tid-breakdown-divider" />
                            <div className="tid-breakdown-row tid-breakdown-row--total">
                              <span className="tid-breakdown-lbl">Total Verified Payment</span>
                              <span className="tid-breakdown-val">{formatCurrency(tx.amount, tx.currency)}</span>
                            </div>
                          </div>

                          <div className="tid-grid tid-grid--footer">
                            <div className="tid-item">
                              <span className="tid-lbl">Date Paid</span>
                              <span className="tid-val">{new Date(tx.paid_at).toLocaleDateString()}</span>
                            </div>
                            <div className="tid-item">
                              <span className="tid-lbl">Time</span>
                              <span className="tid-val">{formatTime(tx.paid_at)}</span>
                            </div>
                            <div className="tid-item">
                              <span className="tid-lbl">Paid To</span>
                              <span className="tid-val">{tx.company_name}</span>
                            </div>
                            <div className="tid-item">
                              <span className="tid-lbl">Status</span>
                              <span className="tid-val" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                Verified Verified
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="dashboard__empty">
              <p>No transactions found{search ? ` for "${search}"` : ''}.</p>
              {(search || filterDate) && (
                <button
                  className="btn btn--secondary btn--sm"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setSearch('')
                    setFilterDate('')
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .transaction-item__type-badge--future {
          background: #fff8e1;
          color: #ffa000;
        }

        /* Desktop Optimization for Transaction Page */
        @media (min-width: 1024px) {
          .transactions-list-page {
            max-width: 800px;
            margin: 40px auto;
            background: var(--bg);
            border-radius: 24px;
            border: 1px solid var(--border-solid);
            box-shadow: var(--shadow-md);
            padding: 32px 40px;
            min-height: auto;
          }

          /* Show and style back button for desktop parity */
          .dashboard__back {
            /* Inherits from global dashboard.css */
          }

          .dashboard__header {
            margin-bottom: 12px;
            padding: 0;
            border-bottom: none;
          }

          .dashboard__title {
            font-size: 24px;
            font-weight: 800;
          }

          .transaction-search {
            margin-bottom: 24px;
          }

          .transaction-search__input-wrap {
            height: 48px;
            border-radius: 12px;
          }

          .dashboard__transactions-list {
            padding: 0;
          }
          
          .dashboard__transaction-group-date {
            font-size: 14px;
            padding-left: 0;
            margin-bottom: 16px;
            margin-top: 32px;
          }

          .transaction-item {
            padding: 20px 24px;
            margin-bottom: 0;
            border-radius: 16px;
            background: var(--surface);
            border: 1px solid var(--border-solid);
            cursor: pointer;
            transition: all 0.2s;
          }

          .transaction-wrapper {
            margin-bottom: 12px;
          }

          .transaction-wrapper.is-expanded .transaction-item {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            border-bottom-color: transparent;
            background: var(--surface2);
          }

          .transaction-inline-details {
            background: var(--surface2);
            border: 1px solid var(--clay);
            border-top: none;
            border-bottom-left-radius: 16px;
            border-bottom-right-radius: 16px;
            padding: 24px;
            box-shadow: var(--shadow-sm);
          }

          .tid-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .tid-grid--footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed var(--border);
          }

          .tid-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .tid-receipt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .tid-receipt-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--text);
            margin: 0;
          }

          .tid-receipt-number {
            font-size: 11px;
            color: var(--text-muted);
            font-family: monospace;
          }

          .tid-breakdown {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: var(--bg);
            padding: 16px;
            border-radius: 12px;
            border: 1px solid var(--border-solid);
          }

          .tid-breakdown-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .tid-breakdown-lbl {
            font-size: 13px;
            color: var(--text-muted);
          }

          .tid-breakdown-val {
            font-size: 13px;
            font-weight: 700;
            color: var(--text);
          }

          .tid-breakdown-divider {
            height: 1px;
            background: var(--border-solid);
            margin: 4px 0;
          }

          .tid-breakdown-row--total .tid-breakdown-lbl {
            font-weight: 700;
            color: var(--text);
          }

          .tid-breakdown-row--total .tid-breakdown-val {
            font-size: 15px;
            color: var(--clay);
          }

          .tid-lbl {
            font-size: 10px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .tid-val {
            font-size: 13px;
            font-weight: 600;
            color: var(--text);
          }

          .transaction-item__actions-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .transaction-item__download-btn {
            background: var(--clay);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(217, 119, 87, 0.2);
          }

          .transaction-item__download-btn:hover {
            background: var(--clay-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(217, 119, 87, 0.3);
          }

          .transaction-item__download-btn svg {
            flex-shrink: 0;
          }

          .transaction-item:hover {
            border-color: var(--clay);
            background: var(--surface2);
          }
        }
      `}</style>
    </div>
  )
}
