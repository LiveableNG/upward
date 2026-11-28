'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  TrendingUp,
  Wallet,
  Home,
  XCircle,
  Search,
  X,
} from 'lucide-react'
import { TransactionSkeleton } from './TransactionSkeleton'
import { TransactionsPageShell } from './TransactionsPageShell'
import { useDashboard } from '../../hooks/useDashboard'
import { useToast } from '@/components/common/Toast'
import { useAllGtTransactions, type GtHistoryRow } from '@/features/my-home/hooks/useMyHome'
import { useQueryClient } from '@tanstack/react-query'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import {
  formatCurrency,
  groupTransactionsByMonth,
  formatTime,
} from '@/lib/utils'
import { type CompletedPayment } from '../../types'

type TxCategoryFilter = 'ALL' | 'RENT' | 'SAVINGS'

type TxListItem = Omit<CompletedPayment, 'source'> & {
  source?: 'gt' | 'upward' | 'RENT_SAVINGS' | 'PAYMENT'
}

function isSuccessfulTxStatus(status?: string): boolean {
  const s = String(status || '').trim().toUpperCase()
  return s === 'SUCCESS' || s === 'PAID' || s === 'COMPLETED' || s === 'SETTLED'
}

function isPendingTxStatus(status?: string): boolean {
  const s = String(status || '').trim().toUpperCase()
  return s === 'PENDING' || s === 'PROCESSING' || s === 'INITIATED'
}

function isSavingsLedgerTx(tx: TxListItem): boolean {
  if (tx.source === 'RENT_SAVINGS') return true
  return Boolean(tx.transactionType && tx.transactionType.startsWith('SAVINGS'))
}

function formatCompactDateTime(dateStr?: string): string {
  if (!dateStr) return ''
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return ''
  const dayMonth = parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  return `${dayMonth}, ${formatTime(dateStr)}`
}

function formatFilterDateLabel(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getTxDisplay(tx: TxListItem): {
  title: string
  subtitle?: string
  tag?: { label: string; variant: 'reward' | 'savings' | 'neutral' | 'future' }
} {
  if (tx.transactionType === 'SAVINGS_CASHBACK') {
    return {
      title: 'Rent Savings Cashback',
      tag: { label: 'Cashback', variant: 'reward' },
    }
  }
  if (tx.transactionType === 'SAVINGS_YIELD') {
    return {
      title: 'Daily Interest',
      tag: { label: 'Interest', variant: 'reward' },
    }
  }
  if (tx.transactionType === 'SAVINGS_DEPOSIT') {
    return {
      title: 'Rent Savings Deposit',
      tag: { label: 'Savings', variant: 'savings' },
    }
  }
  if (tx.transactionType === 'SAVINGS_SETTLEMENT') {
    return {
      title: 'Rent Paid from Savings',
      subtitle: tx.property_address || undefined,
      tag: { label: 'From Savings', variant: 'savings' },
    }
  }
  if (tx.transactionType === 'SAVINGS_WITHDRAWAL') {
    return {
      title: 'Savings Withdrawal',
      tag: { label: 'Savings', variant: 'neutral' },
    }
  }
  if (tx.transactionType === 'SAVINGS_SURPLUS') {
    return {
      title: 'Rent Savings Surplus',
      subtitle: 'Held in your Upward DVA balance',
      tag: { label: 'Surplus', variant: 'reward' },
    }
  }
  if (tx.transactionType === 'DVA_HELD_INFLOW') {
    return {
      title: 'DVA Account Deposit',
      subtitle:
        tx.routingStatus === 'ROUTED'
          ? 'Moved into your Rent Savings plan'
          : 'Held on DVA for your next rent plan',
      tag: {
        label: tx.routingStatus === 'ROUTED' ? 'Routed' : 'Held on DVA',
        variant: 'savings',
      },
    }
  }
  if (tx.transactionType === 'DVA_ARM_FALLBACK') {
    return {
      title: 'Rent Savings Deposit',
      subtitle:
        tx.routingStatus === 'ROUTED'
          ? 'Investment sync completed'
          : 'Held safely on your DVA pending sync',
      tag: {
        label: tx.routingStatus === 'ROUTED' ? 'Synced' : 'Held on DVA',
        variant: 'future',
      },
    }
  }
  if (tx.transactionType === 'DVA_WALLET_DEPOSIT') {
    return {
      title: 'Upward Account Deposit',
      tag: { label: 'DVA Balance', variant: 'savings' },
    }
  }

  const rawTitle = (tx.company_name || 'Rent Payment').trim()
  let title = rawTitle
  let subtitle = tx.property_address || undefined

  if (rawTitle.includes(' — ')) {
    const [head, ...rest] = rawTitle.split(' — ')
    title = head.trim()
    if (!subtitle && rest.length > 0) {
      subtitle = rest.join(' — ').trim()
    }
  }

  let tag: { label: string; variant: 'reward' | 'savings' | 'neutral' | 'future' } | undefined
  if (tx.transactionType === 'FUTURE_CREDIT') {
    tag = { label: 'Future Credit', variant: 'future' }
  } else if (tx.isManual) {
    tag = { label: 'Manual', variant: 'neutral' }
  }

  return { title, subtitle, tag }
}

function parseGtAmount(value: string) {
  return parseFloat(value.replace(/,/g, '')) || 0
}

function gtPaidAt(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toISOString()
}

function gtToListItem(tx: GtHistoryRow): TxListItem {
  return {
    uuid: `gt-${tx.propertyUuid}-${tx.reference || tx.date}-${tx.category}-${tx.amount}`,
    amount: parseGtAmount(tx.amount),
    currency: 'NGN',
    status: tx.status,
    channel: tx.payment_method || tx.payment_gateway || '',
    paid_at: gtPaidAt(tx.date),
    paystack_reference: tx.reference || '',
    company_name: tx.category,
    type: tx.type,
    property_address: tx.additional_information || tx.unitName || tx.propertyLabel,
    source: 'gt',
  }
}

function formatMonthLabel(monthKey: string): string {
  return monthKey.toUpperCase()
}

export function TransactionList() {
  const router = useRouter()
  const toast = useToast()
  const { data, loading, error, reload } = useDashboard()
  const { transactions: gtTransactions, isLoading: gtLoading } = useAllGtTransactions()
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<TxCategoryFilter>('ALL')
  const queryClient = useQueryClient()
  const handleBack = () => router.push('/dashboard')

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['gt-transactions'] }),
      reload?.(),
    ])
  }

  const handleTxClick = (tx: TxListItem) => {
    if (tx.source === 'gt') {
      toast.info('Receipts not available for this transaction.')
      return
    }
    if (
      tx.transactionType === 'SAVINGS_YIELD' ||
      tx.transactionType === 'SAVINGS_CASHBACK'
    ) {
      toast.info('Recorded on your Rent Savings ledger.')
      return
    }
    if (
      !isSuccessfulTxStatus(tx.status) &&
      !(tx.transactionType === 'SAVINGS_WITHDRAWAL' && isPendingTxStatus(tx.status))
    ) {
      toast.info('Receipts are only available for successful payments.')
      return
    }
    router.push(`/dashboard/receipts?id=${tx.uuid}`)
  }

  if (loading || gtLoading) return <TransactionSkeleton />

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

  const transactions: TxListItem[] = [
    ...data.completedPayments.map((tx) => ({
      ...tx,
      source: (tx.source === 'RENT_SAVINGS' ? 'RENT_SAVINGS' : 'upward') as TxListItem['source'],
    })),
    ...gtTransactions.map(gtToListItem),
  ]

  const rentTransactions = transactions.filter(
    (tx) => !isSavingsLedgerTx(tx) || tx.transactionType === 'SAVINGS_SETTLEMENT',
  )
  const savingsTransactions = transactions.filter((tx) => isSavingsLedgerTx(tx))

  const hasFilters = Boolean(search || filterDate || category !== 'ALL')

  const filteredTransactions = transactions.filter((tx) => {
    if (category === 'RENT' && isSavingsLedgerTx(tx) && tx.transactionType !== 'SAVINGS_SETTLEMENT') {
      return false
    }
    if (category === 'SAVINGS' && !isSavingsLedgerTx(tx)) {
      return false
    }
    const matchesDate = filterDate ? tx.paid_at?.startsWith(filterDate) : true
    const q = search.trim().toLowerCase()
    const display = getTxDisplay(tx)
    const matchesSearch = q
      ? display.title.toLowerCase().includes(q) ||
        (display.subtitle || '').toLowerCase().includes(q) ||
        tx.company_name?.toLowerCase().includes(q) ||
        tx.channel?.toLowerCase().includes(q) ||
        tx.paystack_reference?.toLowerCase().includes(q) ||
        tx.property_address?.toLowerCase().includes(q) ||
        formatCurrency(tx.amount, tx.currency).toLowerCase().includes(q)
      : true
    return matchesDate && matchesSearch
  })

  const grouped = groupTransactionsByMonth(filteredTransactions)
  const months = Object.keys(grouped).sort((a, b) => {
    const dateA = new Date(grouped[a][0]?.paid_at || 0).getTime()
    const dateB = new Date(grouped[b][0]?.paid_at || 0).getTime()
    return dateB - dateA
  })

  const successfulRentDebits = transactions.filter(
    (tx) =>
      tx.type !== 'credit' &&
      isSuccessfulTxStatus(tx.status) &&
      tx.transactionType !== 'SAVINGS_WITHDRAWAL',
  )
  const totalPaid = successfulRentDebits.reduce((sum, tx) => sum + tx.amount, 0)
  const paymentCurrency =
    successfulRentDebits[0]?.currency || transactions[0]?.currency || 'NGN'
  const paymentCount = successfulRentDebits.length

  const totalRewardsEarned = transactions
    .filter(
      (tx) =>
        isSuccessfulTxStatus(tx.status) &&
        (tx.transactionType === 'SAVINGS_CASHBACK' || tx.transactionType === 'SAVINGS_YIELD'),
    )
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalSavedCredits = savingsTransactions
    .filter((tx) => isSuccessfulTxStatus(tx.status) && tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0)

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
        <Calendar size={17} />
      </div>
    </div>
  )

  const renderTxIcon = (tx: TxListItem, isCredit: boolean, isFailed: boolean) => {
    if (isFailed) {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--failed">
          <XCircle size={17} />
        </span>
      )
    }
    if (tx.transactionType === 'SAVINGS_CASHBACK') {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--reward">
          <Gift size={17} />
        </span>
      )
    }
    if (tx.transactionType === 'SAVINGS_YIELD') {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--reward">
          <TrendingUp size={17} />
        </span>
      )
    }
    if (
      tx.transactionType === 'SAVINGS_DEPOSIT' ||
      tx.transactionType === 'DVA_HELD_INFLOW' ||
      tx.transactionType === 'DVA_ARM_FALLBACK' ||
      tx.transactionType === 'DVA_WALLET_DEPOSIT'
    ) {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--savings">
          <Wallet size={17} />
        </span>
      )
    }
    if (tx.transactionType === 'SAVINGS_SURPLUS') {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--reward">
          <Wallet size={17} />
        </span>
      )
    }
    if (tx.transactionType === 'SAVINGS_SETTLEMENT') {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--rent">
          <Home size={17} />
        </span>
      )
    }
    if (tx.transactionType === 'SAVINGS_WITHDRAWAL') {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--rent">
          <ArrowUpRight size={17} />
        </span>
      )
    }
    if (isCredit) {
      return (
        <span className="tx-page__row-icon tx-page__row-icon--reward">
          <ArrowUpRight size={17} />
        </span>
      )
    }
    return (
      <span className="tx-page__row-icon tx-page__row-icon--rent">
        <ArrowDownRight size={17} />
      </span>
    )
  }

  return (
    <TransactionsPageShell title="Transactions" onBack={handleBack} rightElement={dateFilter}>
      <PullToRefresh onRefresh={handleRefresh}>
        {transactions.length > 0 && !search && !filterDate ? (
          <section className="tx-page__summary" aria-label="Transaction summary">
            <div className="tx-page__summary-top">
              <div>
                <div className="tx-page__summary-label">
                  {category === 'SAVINGS' ? 'Total Saved & Earned' : 'Total Rent Paid'}
                </div>
                <div className="tx-page__summary-amount">
                  {formatCurrency(
                    category === 'SAVINGS' ? totalSavedCredits : totalPaid,
                    paymentCurrency,
                  )}
                </div>
              </div>
              <span className="tx-page__summary-pill">
                {category === 'SAVINGS'
                  ? `${savingsTransactions.length} ${savingsTransactions.length === 1 ? 'entry' : 'entries'}`
                  : `${paymentCount} ${paymentCount === 1 ? 'payment' : 'payments'}`}
              </span>
            </div>

            {totalRewardsEarned > 0 ? (
              <div className="tx-page__summary-meta">
                <span className="tx-page__summary-meta-item">
                  <Gift size={13} aria-hidden />
                  <span>
                    {`+${formatCurrency(totalRewardsEarned, paymentCurrency)} cashback & interest`}
                  </span>
                </span>
              </div>
            ) : null}
          </section>
        ) : null}

        {transactions.length > 0 ? (
          <div className="tx-page__controls">
            <div className="tx-page__search-wrap">
              <Search size={15} className="tx-page__search-icon" />
              <input
                type="text"
                className="tx-page__search-field"
                placeholder="Search rent, savings, or reference..."
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
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="tx-page__tabs" role="tablist" aria-label="Filter transactions">
              <button
                type="button"
                role="tab"
                aria-selected={category === 'ALL'}
                className={`tx-page__tab ${category === 'ALL' ? 'tx-page__tab--active' : ''}`}
                onClick={() => setCategory('ALL')}
              >
                <span>All</span>
                <span className="tx-page__tab-count">{transactions.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'RENT'}
                className={`tx-page__tab ${category === 'RENT' ? 'tx-page__tab--active' : ''}`}
                onClick={() => setCategory('RENT')}
              >
                <span>Rent</span>
                <span className="tx-page__tab-count">{rentTransactions.length}</span>
              </button>
              {savingsTransactions.length > 0 ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === 'SAVINGS'}
                  className={`tx-page__tab ${category === 'SAVINGS' ? 'tx-page__tab--active' : ''}`}
                  onClick={() => setCategory('SAVINGS')}
                >
                  <span>Savings</span>
                  <span className="tx-page__tab-count">{savingsTransactions.length}</span>
                </button>
              ) : null}
            </div>

            {filterDate ? (
              <div className="tx-page__date-chip">
                <Calendar size={12} aria-hidden />
                <span>{formatFilterDateLabel(filterDate)}</span>
                <button
                  type="button"
                  className="tx-page__date-chip-clear"
                  onClick={() => setFilterDate('')}
                  aria-label="Clear date filter"
                >
                  <X size={11} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {transactions.length === 0 ? (
          <div className="dash-home__activity-empty">
            <div className="dash-home__activity-empty-icon">
              <Receipt size={24} />
            </div>
            <div className="dash-home__activity-empty-title">No transactions yet</div>
            <div className="dash-home__activity-empty-desc">
              Your rent payments and savings activity will appear here.
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
                setCategory('ALL')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {months.map((month) => (
              <div key={month} className="tx-page__month-group">
                <div className="tx-page__month-head">
                  <h2 className="tx-page__month-label">{formatMonthLabel(month)}</h2>
                  <span className="tx-page__month-count">
                    {grouped[month].length} {grouped[month].length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="tx-page__card">
                  {grouped[month].map((tx) => {
                    const isCredit = tx.type === 'credit'
                    const isSuccess = isSuccessfulTxStatus(tx.status)
                    const isPending = isPendingTxStatus(tx.status)
                    const isFailed = Boolean(tx.status) && !isSuccess && !isPending
                    const display = getTxDisplay(tx)
                    const channelLabel =
                      tx.channel || (tx.source === 'gt' ? 'Recorded' : 'Paystack')
                    const compactWhen = formatCompactDateTime(tx.paid_at)

                    return (
                      <button
                        key={tx.uuid}
                        type="button"
                        className={`tx-page__row ${isFailed ? 'tx-page__row--failed' : ''}`}
                        onClick={() => handleTxClick(tx)}
                      >
                        {renderTxIcon(tx, isCredit, isFailed)}

                        <span className="tx-page__row-info">
                          <span className="tx-page__row-title">{display.title}</span>
                          {display.subtitle ? (
                            <span className="tx-page__row-sub">{display.subtitle}</span>
                          ) : null}
                          <span className="tx-page__row-meta">
                            <span>
                              {channelLabel}
                              {compactWhen ? ` · ${compactWhen}` : ''}
                            </span>
                            {display.tag ? (
                              <span
                                className={`tx-page__tag tx-page__tag--${display.tag.variant}`}
                              >
                                {display.tag.label}
                              </span>
                            ) : null}
                          </span>
                        </span>

                        <span className="tx-page__row-right">
                          <span
                            className={`tx-page__row-amount ${
                              isFailed
                                ? 'tx-page__row-amount--failed'
                                : isCredit
                                  ? 'tx-page__row-amount--credit'
                                  : ''
                            }`}
                          >
                            {isFailed ? '' : isCredit ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.currency)}
                          </span>
                          {isFailed ? (
                            <span className="tx-page__row-status--failed">Failed</span>
                          ) : isPending ? (
                            <span className="tx-page__row-status--pending">Pending</span>
                          ) : (
                            <span className="tx-page__row-status">Success</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {!hasFilters ? (
              <p className="tx-page__footer">That&apos;s everything so far.</p>
            ) : null}
          </>
        )}
      </PullToRefresh>
    </TransactionsPageShell>
  )
}
