'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate, getStatusColor, groupTransactionsByDate } from '@/lib/utils'
import { ArrowLeft, Filter, Smartphone, X, Receipt, AlertTriangle } from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

type Transaction = DashboardData['completedPayments'][0]

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
  
  // Filter by date if filterDate is set
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
                {grouped[date].map((tx) => (
                  <div 
                    key={tx.uuid} 
                    className="dashboard__transaction-item"
                    onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                  >
                    <div className="dashboard__transaction-left">
                      <div 
                        className="dashboard__transaction-status-dot" 
                        style={{ backgroundColor: getStatusColor(tx.status) }} 
                      />
                      <div className="dashboard__transaction-info">
                        <span className="dashboard__transaction-company">{tx.company_name}</span>
                        <span className="dashboard__transaction-channel">{tx.channel || 'Card Payment'}</span>
                      </div>
                    </div>
                    <div className="dashboard__transaction-right">
                      <span className="dashboard__transaction-amount">
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>
                  </div>
                ))}
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
