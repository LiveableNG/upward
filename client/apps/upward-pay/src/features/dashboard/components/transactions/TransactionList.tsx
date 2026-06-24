'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Filter,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
} from 'lucide-react'
import { TransactionSkeleton } from './TransactionSkeleton'
import { TransactionsPageShell } from './TransactionsPageShell'
import { useDashboard } from '../../hooks/useDashboard'
import {
  formatCurrency,
  groupTransactionsByMonth,
  formatTime,
  formatDate,
} from '@/lib/utils'
import { type CompletedPayment } from '../../types'

function getTypeBadgeLabel(tx: CompletedPayment): string {
  if (tx.transactionType === 'FUTURE_CREDIT') return 'Future Credit'
  if (tx.isManual) return 'Manual'
  return tx.type || 'debit'
}

function getTypeBadgeClass(tx: CompletedPayment, isCredit: boolean): string {
  if (tx.transactionType === 'FUTURE_CREDIT') return 'tx-page__badge--future'
  if (tx.isManual) return 'tx-page__badge--manual'
  return isCredit ? 'tx-page__badge--credit' : 'tx-page__badge--debit'
}

function formatMonthLabel(monthKey: string): string {
  return monthKey.toUpperCase()
}

export function TransactionList() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')

  const handleBack = () => router.push('/dashboard')

  const handleTxClick = (tx: CompletedPayment) => {
    router.push(`/dashboard/receipts?id=${tx.uuid}`)
  }

  if (loading) return <TransactionSkeleton />

  if (error || !data) {
    return (
      <TransactionsPageShell title="Transactions" onBack={handleBack}>
        <div className="pay-page__error">
          <div className="pay-page__error-icon">
            <AlertTriangle size={32} />
          </div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" type="button" onClick={reload}>
            Retry
          </button>
        </div>
      </TransactionsPageShell>
    )
  }

  const transactions = data.completedPayments
  const hasFilters = Boolean(search || filterDate)

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

  const grouped = groupTransactionsByMonth(filteredTransactions)
  const months = Object.keys(grouped).sort((a, b) => {
    const dateA = new Date(grouped[a][0]?.paid_at || 0).getTime()
    const dateB = new Date(grouped[b][0]?.paid_at || 0).getTime()
    return dateB - dateA
  })

  const debitPayments = transactions.filter((tx) => tx.type !== 'credit')
  const totalPaid = debitPayments.reduce((sum, tx) => sum + tx.amount, 0)
  const paymentCurrency = debitPayments[0]?.currency || transactions[0]?.currency || 'NGN'
  const paymentCount = debitPayments.length

  const dateFilter = (
    <div className={`tx-page__filter ${filterDate ? 'tx-page__filter--active' : ''}`}>
      <input
        type="date"
        className="tx-page__filter-input"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        aria-label="Filter by date"
      />
      <div className="tx-page__filter-btn" aria-hidden>
        <Filter size={16} />
      </div>
    </div>
  )

  return (
    <TransactionsPageShell title="Transactions" onBack={handleBack} rightElement={dateFilter}>
      <div className="tx-page__search">
        <div className="tx-page__search-wrap">
          <Search size={16} className="tx-page__search-icon" />
          <input
            type="text"
            className="tx-page__search-field"
            placeholder="Search name, channel, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="tx-page__search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
      </div>

      {transactions.length > 0 && !hasFilters ? (
        <div className="tx-page__stats">
          <div className="tx-page__stat">
            <div className="tx-page__stat-label">Total Paid</div>
            <div className="tx-page__stat-value">{formatCurrency(totalPaid, paymentCurrency)}</div>
          </div>
          <div className="tx-page__stat">
            <div className="tx-page__stat-label">Payments</div>
            <div className="tx-page__stat-value">
              {paymentCount} {paymentCount === 1 ? 'payment' : 'payments'}
            </div>
          </div>
        </div>
      ) : null}

      {transactions.length === 0 ? (
        <div className="dash-home__activity-empty">
          <div className="dash-home__activity-empty-icon">
            <Receipt size={24} />
          </div>
          <div className="dash-home__activity-empty-title">No transactions yet</div>
          <div className="dash-home__activity-empty-desc">
            Your payment history will appear here once you make your first payment.
          </div>
          <button
            type="button"
            className="dash-home__activity-empty-btn"
            onClick={() => router.push('/dashboard/pay-rent')}
          >
            Pay Rent Now
          </button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="tx-page__empty-filters">
          <p>No transactions found{search ? ` for "${search}"` : ''}.</p>
          <button
            type="button"
            className="tx-page__clear-btn"
            onClick={() => {
              setSearch('')
              setFilterDate('')
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {months.map((month) => (
            <div key={month} className="tx-page__month-group">
              <h2 className="tx-page__month-label">{formatMonthLabel(month)}</h2>
              <div className="dash-home__activity-card">
                {grouped[month].map((tx) => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <button
                      key={tx.uuid}
                      type="button"
                      className="dash-home__activity-item"
                      onClick={() => handleTxClick(tx)}
                    >
                      <span
                        className={`dash-home__activity-item-icon ${isCredit ? 'dash-home__activity-item-icon--credit' : 'dash-home__activity-item-icon--debit'}`}
                      >
                        {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </span>
                      <span className="dash-home__activity-item-info">
                        <div className="dash-home__activity-item-title">{tx.company_name}</div>
                        {tx.property_address ? (
                          <div className="tx-page__location">{tx.property_address}</div>
                        ) : null}
                        <div className="dash-home__activity-item-meta">
                          {tx.channel || 'Paystack'} · {formatDate(tx.paid_at)} ·{' '}
                          {formatTime(tx.paid_at)}
                        </div>
                        <div className="tx-page__row-badges">
                          <span className={`tx-page__badge ${getTypeBadgeClass(tx, isCredit)}`}>
                            {getTypeBadgeLabel(tx)}
                          </span>
                        </div>
                      </span>
                      <span className="tx-page__row-right">
                        <span
                          className={`tx-page__row-amount ${isCredit ? 'tx-page__row-amount--credit' : ''}`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                        {tx.status ? (
                          <div className="tx-page__row-status">{tx.status.toLowerCase()}</div>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {!hasFilters ? (
            <p className="tx-page__footer">That&apos;s everything so far — keep it up.</p>
          ) : null}
        </>
      )}
    </TransactionsPageShell>
  )
}
