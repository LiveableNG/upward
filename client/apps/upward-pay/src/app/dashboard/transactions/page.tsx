'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate, getStatusColor, groupTransactionsByDate } from '@/lib/utils'
import { ArrowLeft, Filter, Receipt, AlertTriangle, ArrowUpRight, ArrowDownRight, Search, X } from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

interface Transaction {
  uuid: string
  amount: number
  currency: string
  status: string
  channel: string
  paid_at: string
  paystack_reference: string
  company_name: string
  type?: 'debit' | 'credit'
}

export default function TransactionsPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard/transactions')
      return
    }
    loadData()
  }, [router])

  async function loadData() {
    try {
      const result = await api.getMe()

      const mockCredits: Transaction[] = [
        {
          uuid: 'mock-credit-1',
          amount: 5000000,
          currency: 'NGN',
          status: 'completed',
          paid_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          paystack_reference: 'RSV-7SH92KL',
          company_name: 'Rent Savings Wallet',
          channel: 'Auto-Deduction',
          type: 'credit'
        },
        {
          uuid: 'mock-credit-2',
          amount: 2500000,
          currency: 'NGN',
          status: 'completed',
          paid_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          paystack_reference: 'RSV-6XJ21PL',
          company_name: 'Rent Savings Wallet',
          channel: 'Manual Deposit',
          type: 'credit'
        }
      ]

      const debits = result.completedPayments.map(p => ({ ...p, type: 'debit' as const }))
      result.completedPayments = [...debits, ...mockCredits] as any

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard dashboard--loading">
        <div className="pay-page__logo-pulse"><UpwardLogo size={28} color="#fff" /></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="dashboard dashboard--error">
        <div className="pay-page__error">
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={loadData}>Retry</button>
        </div>
      </div>
    )
  }

  const transactions = data.completedPayments

  const filteredTransactions = (transactions as unknown as Transaction[]).filter((tx: Transaction) => {
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
    <div className="dashboard dashboard--nav-offset">
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

      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 14px',
            background: 'var(--surface)', border: '1px solid var(--border-solid)',
            borderRadius: 'var(--radius-md)', transition: 'border-color 0.2s',
          }}
          onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'}
          onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search name, channel, reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              padding: '11px 0', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--text)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0, flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon"><Receipt size={32} /></span>
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div className="dashboard__transactions-list">
          {dates.map((date) => (
            <div key={date} className="dashboard__transaction-group">
              <h4 className="dashboard__transaction-group-date">{date}</h4>
              <div className="dashboard__transaction-items">
                {grouped[date].map((tx: Transaction) => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <div
                      key={tx.uuid}
                      className="dashboard__transaction-item"
                      style={{
                        borderLeft: `3px solid ${isCredit ? 'var(--clay)' : 'var(--border-solid)'}`,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        gap: 0,
                      }}
                      onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                    >
                      <div style={{
                        background: isCredit ? 'var(--clay-faint)' : 'var(--surface2)',
                        color: isCredit ? 'var(--clay)' : 'var(--text-muted)',
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginRight: 10,
                        border: `1px solid ${isCredit ? 'rgba(217,119,87,0.15)' : 'var(--border-solid)'}`
                      }}>
                        {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          marginBottom: 3,
                        }}>
                          {tx.company_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            fontSize: 11, color: 'var(--text-muted)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: 90,
                          }}>
                            {tx.channel || 'Card'}
                          </span>
                          <span style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 4,
                            background: isCredit ? 'var(--clay-faint)' : 'var(--surface2)',
                            color: isCredit ? 'var(--clay)' : 'var(--text-muted)',
                            fontWeight: 700, textTransform: 'uppercase' as const,
                            border: `1px solid ${isCredit ? 'rgba(217,119,87,0.15)' : 'var(--border-solid)'}`,
                            flexShrink: 0, whiteSpace: 'nowrap' as const,
                          }}>
                            {tx.type || 'debit'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isCredit ? 'var(--clay)' : 'var(--text)',
                          whiteSpace: 'nowrap',
                        }}>
                          {isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                        <button
                          style={{
                            fontSize: 10, fontWeight: 700,
                            padding: '3px 8px', borderRadius: 5,
                            display: 'inline-flex', alignItems: 'center',
                            whiteSpace: 'nowrap' as const,
                            border: '1px solid var(--border-solid)',
                            background: 'var(--surface)', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontFamily: 'var(--font)',
                          }}
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
                  onClick={() => { setSearch(''); setFilterDate('') }}
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