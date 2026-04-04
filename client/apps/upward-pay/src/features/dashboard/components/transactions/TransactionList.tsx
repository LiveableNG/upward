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
} from 'lucide-react'
import { useDashboard } from '../../hooks/useDashboard'
import { formatCurrency, groupTransactionsByDate } from '@/lib/utils'
import { type CompletedPayment } from '../../types'

export function TransactionList() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')

  if (loading) return null // Handled by page-level suspense or initial loading state
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
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
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
                    <div
                      key={tx.uuid}
                      className={`transaction-item ${isCredit ? 'transaction-item--credit' : 'transaction-item--debit'}`}
                      onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                    >
                      <div
                        className={`transaction-item__icon-wrap ${isCredit ? 'transaction-item__icon-wrap--credit' : 'transaction-item__icon-wrap--debit'}`}
                      >
                        {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>

                      <div className="transaction-item__info">
                        <div className="transaction-item__name">{tx.company_name}</div>
                        <div className="transaction-item__meta">
                          <span className="transaction-item__channel">{tx.channel || 'Card'}</span>
                          <span
                            className={`transaction-item__type-badge ${isCredit ? 'transaction-item__type-badge--credit' : 'transaction-item__type-badge--debit'}`}
                          >
                            {tx.type || 'debit'}
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
                          className="transaction-item__receipt-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/receipts?id=${tx.uuid}`)
                          }}
                        >
                          View Receipt
                        </button>
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
    </div>
  )
}
