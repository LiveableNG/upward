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
import { formatCurrency, groupTransactionsByDate, formatTime, formatDate } from '@/lib/utils'
import { type CompletedPayment } from '../../types'

export function TransactionList() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')
  const handleTxClick = (tx: CompletedPayment) => {
    router.push(`/dashboard/receipts?id=${tx.uuid}`)
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
      <div className="transactions-list__header">
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
      </div>

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
                    <div key={tx.uuid} className="transaction-wrapper">
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
                              {tx.channel || 'Paystack'} · {formatDate(tx.paid_at)} · {formatTime(tx.paid_at)}
                            </span>

                            <span
                              className={`transaction-item__type-badge ${isCredit ? 'transaction-item__type-badge--credit' : (tx.transactionType === 'FUTURE_CREDIT' ? 'transaction-item__type-badge--future' : (tx.isManual ? 'transaction-item__type-badge--manual' : 'transaction-item__type-badge--debit'))}`}
                            >
                              {tx.transactionType === 'FUTURE_CREDIT' ? 'Future Credit' : (tx.isManual ? 'Manual' : (tx.type || 'debit'))}
                            </span>
                          </div>
                        </div>

                        <div className="transaction-item__right">
                          <div className="transaction-item__amount-wrap">
                            <span
                              className={`transaction-item__amount ${isCredit ? 'transaction-item__amount--credit' : ''}`}
                            >
                              {isCredit ? '+' : '-'}
                              {formatCurrency(tx.amount, tx.currency)}
                            </span>
                          </div>
                          <div className="transaction-item__action-hint">
                            View Receipt
                          </div>
                        </div>
                      </div>
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
        .transactions-list__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-5);
          margin-bottom: var(--space-2);
          border-bottom: 1px solid var(--border-solid);
        }

        .transaction-item__type-badge--future {
          background: #fff8e1;
          color: #ffa000;
        }

        .transaction-item__type-badge--manual {
          background: var(--clay-faint);
          color: var(--clay);
        }

        /* Desktop Optimization for Transaction Page */
        @media (min-width: 1024px) {
          .transactions-list-page {
            max-width: 800px;
            margin: 20px auto;
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

          .transactions-list__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
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

          .transaction-item:hover {
            border-color: var(--clay);
            background: var(--surface2);
            transform: translateY(-2px);
            box-shadow: var(--shadow-sm);
          }

          .transaction-item:hover .transaction-item__action-hint {
            opacity: 1;
            color: var(--clay);
          }

          .transaction-item__amount-wrap {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }

          .transaction-item__action-hint {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            opacity: 0.6;
            transition: all 0.2s;
            margin-top: 4px;
            text-align: right;
          }

          @media (max-width: 1023px) {
            .transaction-item__action-hint {
              display: none;
            }
          }
        }
      `}</style>
    </div>
  )
}
