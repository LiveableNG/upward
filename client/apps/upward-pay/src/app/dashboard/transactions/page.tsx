'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate, getStatusColor, groupTransactionsByDate } from '@/lib/utils'
import { ArrowLeft, Filter, Receipt, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

type Transaction = DashboardData['completedPayments'][0] & { type?: 'debit' | 'credit' }

export default function TransactionsPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDate, setFilterDate] = useState('')

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

  const filteredTransactions = filterDate
    ? transactions.filter(tx => tx.paid_at && tx.paid_at.startsWith(filterDate))
    : transactions

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
            <Filter size={20} className="dashboard__filter-icon" />
          </div>
        </div>
      </header>

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
                      style={{ borderLeft: `3px solid ${isCredit ? 'var(--clay)' : 'var(--border-solid)'}` }}
                      onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                    >
                      <div className="dashboard__transaction-left">
                        <div
                          style={{
                            background: isCredit ? 'var(--clay-faint)' : 'var(--surface2)',
                            color: isCredit ? 'var(--clay)' : 'var(--text-muted)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            flexShrink: 0,
                            border: `1px solid ${isCredit ? 'rgba(217,119,87,0.15)' : 'var(--border-solid)'}`
                          }}
                        >
                          {isCredit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div className="dashboard__transaction-info">
                          <span className="dashboard__transaction-company">{tx.company_name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="dashboard__transaction-channel">{tx.channel || 'Card Payment'}</span>
                            <span style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isCredit ? 'var(--clay-faint)' : 'var(--surface2)',
                              color: isCredit ? 'var(--clay)' : 'var(--text-muted)',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              border: `1px solid ${isCredit ? 'rgba(217,119,87,0.15)' : 'var(--border-solid)'}`
                            }}>
                              {tx.type || 'debit'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '15px',
                            fontWeight: 700,
                            color: isCredit ? 'var(--clay)' : 'var(--text)',
                          }}
                        >
                          {isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                        <button
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            height: 'auto',
                            border: '1px solid var(--border-solid)',
                            background: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
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
          {filteredTransactions.length === 0 && filterDate && (
            <div className="dashboard__empty">
              <p>No transactions found for this date.</p>
              <button className="btn btn--link btn--sm" onClick={() => setFilterDate('')}>Clear Filter</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}