'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn, logout } from '@/lib/auth'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard')
      return
    }
    loadDashboard()
  }, [router])

  async function loadDashboard() {
    try {
      const result = await api.getMe()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
          <p className="pay-page__splash-text">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="dashboard">
        <div className="pay-page__error">
          <div className="pay-page__error-icon">⚠️</div>
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const tenant = data.tenant
  const firstName = tenant.fullName?.split(' ')[0] || 'Tenant'

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <div className="dashboard__avatar">{firstName[0]?.toUpperCase()}</div>
          <div>
            <h2 className="dashboard__greeting">Hey, {firstName} 👋</h2>
            <span className="dashboard__email">{tenant.email}</span>
          </div>
        </div>
        <button className="dashboard__logout" onClick={logout} title="Logout">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      {/* Pending Payments */}
      {data.pendingPayments.length > 0 && (
        <section className="dashboard__section">
          <h3 className="dashboard__section-title">
            <span className="dashboard__section-dot dashboard__section-dot--pending" />
            Pending Payments
          </h3>
          {data.pendingPayments.map((p) => (
            <div key={p.uuid} className="dashboard__payment-card dashboard__payment-card--pending">
              <div className="dashboard__payment-card-top">
                <div className="dashboard__payment-card-company">
                  <img
                    src={p.company_logo}
                    alt=""
                    width={32}
                    height={32}
                    className="dashboard__payment-card-logo"
                  />
                  <div>
                    <span className="dashboard__payment-card-name">{p.company_name}</span>
                    <span className="dashboard__payment-card-invoice">{p.invoice_number}</span>
                  </div>
                </div>
                <span className="dashboard__payment-card-amount">
                  {formatCurrency(p.total_amount, p.currency)}
                </span>
              </div>
              {p.notes && <p className="dashboard__payment-card-notes">{p.notes}</p>}
              <button
                className="btn btn--primary btn--full btn--sm"
                onClick={() => router.push(`/pay/${p.payment_link_token}`)}
              >
                Pay Now
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Payment History */}
      <section className="dashboard__section">
        <h3 className="dashboard__section-title">
          <span className="dashboard__section-dot dashboard__section-dot--history" />
          Payment History
        </h3>
        {data.completedPayments.length === 0 ? (
          <div className="dashboard__empty">
            <span className="dashboard__empty-icon">📋</span>
            <p>No payments yet. Your payment history will appear here.</p>
          </div>
        ) : (
          <div className="dashboard__history-list">
            {data.completedPayments.map((tx) => (
              <div key={tx.uuid} className="dashboard__history-item">
                <div className="dashboard__history-left">
                  <div
                    className="dashboard__history-dot"
                    style={{ backgroundColor: getStatusColor(tx.status) }}
                  />
                  <div>
                    <span className="dashboard__history-company">{tx.company_name}</span>
                    <span className="dashboard__history-date">
                      {tx.paid_at ? formatDate(tx.paid_at) : '—'}
                    </span>
                  </div>
                </div>
                <div className="dashboard__history-right">
                  <span className="dashboard__history-amount">
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <span className="dashboard__history-channel">{tx.channel || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions Placeholder */}
      <section className="dashboard__section">
        <h3 className="dashboard__section-title">
          <span className="dashboard__section-dot dashboard__section-dot--actions" />
          Quick Actions
        </h3>
        <div className="dashboard__actions-grid">
          <div
            className="dashboard__action-card"
            onClick={() => router.push('/dashboard/receipts')}
          >
            <span className="dashboard__action-icon">🧾</span>
            <span className="dashboard__action-label">Receipts</span>
          </div>
          <div
            className="dashboard__action-card"
            onClick={() => router.push('/dashboard/contracts')}
          >
            <span className="dashboard__action-icon">📄</span>
            <span className="dashboard__action-label">Contracts</span>
          </div>
          <div
            className="dashboard__action-card"
            onClick={() => router.push('/dashboard/rent-credit')}
          >
            <span className="dashboard__action-icon">📊</span>
            <span className="dashboard__action-label">Rent Credit</span>
          </div>
          <div className="dashboard__action-card">
            <span className="dashboard__action-icon">⚙️</span>
            <span className="dashboard__action-label">Settings</span>
          </div>
        </div>
      </section>

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}
