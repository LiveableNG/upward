'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn, logout } from '@/lib/auth'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import {
  FileStack,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Smartphone,
  X,
  AlertTriangle,
  HelpCircle,
  Bell,
  Check,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isNative, setIsNative] = useState(false)
  const [dismissedAppBanner, setDismissedAppBanner] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard')
      return
    }
    loadDashboard()

    const checkPlatform = async () => {
      const { Capacitor } = await import('@capacitor/core')
      setIsNative(Capacitor.isNativePlatform())
    }
    checkPlatform()
  }, [router])

  async function loadDashboard() {
    try {
      const result = await api.getMe()
      setData(result)

      const noRedirect = searchParams.get('noRedirect')
      if (noRedirect) { }
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
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
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
  const totalPaid = data.completedPayments.reduce((sum, p) => sum + p.amount, 0)
  const currency = data.completedPayments[0]?.currency || 'NGN'

  return (
    <div className="dashboard dashboard--nav-offset">

      {/* ── MOBILE HEADER (hidden on desktop) ── */}
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
          <div className="dashboard__avatar">{firstName[0]?.toUpperCase()}</div>
          <h2 className="dashboard__greeting">Hey, {firstName}</h2>
        </div>
        <div className="dashboard__header-right">
          <button className="dashboard__icon-btn" title="Help" onClick={() => router.push('/dashboard/help')}>
            <HelpCircle size={20} />
          </button>
          <button className="dashboard__icon-btn" title="Notifications" onClick={() => router.push('/dashboard/notifications')}>
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* ── DESKTOP HEADER (hidden on mobile) ── */}
      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Overview</h1>
          <p className="dashboard__desktop-subtitle">Welcome back, {firstName}</p>
        </div>
        <div className="dashboard__desktop-header-right">
          <button className="dashboard__icon-btn" title="Notifications" onClick={() => router.push('/dashboard/notifications')}>
            <Bell size={20} />
          </button>
          <button className="dashboard__icon-btn" title="Help" onClick={() => router.push('/dashboard/help')}>
            <HelpCircle size={20} />
          </button>
          <div className="dashboard__desktop-profile" onClick={() => router.push('/dashboard/settings')}>
            <div className="dashboard__avatar dashboard__avatar--sm">{firstName[0]?.toUpperCase()}</div>
            <span className="dashboard__desktop-profile-name">{tenant.fullName}</span>
          </div>
        </div>
      </header>

      {/* ── APP BANNER (mobile only) ── */}
      {!isNative && !dismissedAppBanner && (
        <section className="dashboard__section dashboard__section--mobile-only">
          <div className="dashboard__app-banner">
            <div className="dashboard__app-banner-info">
              <div className="dashboard__app-banner-icon"><Smartphone size={24} /></div>
              <div>
                <p>Get the Upward App</p>
                <span>Track payments on the go.</span>
              </div>
            </div>
            <div className="dashboard__app-banner-actions">
              <button className="btn btn--primary btn--sm">Download</button>
              <button className="dashboard__app-banner-close" onClick={() => setDismissedAppBanner(true)}><X size={16} /></button>
            </div>
          </div>
        </section>
      )}

      {/* ── DESKTOP STAT STRIP ── */}
      <div className="dashboard__stat-strip">
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--green">
            <Check size={16} />
          </div>
          <div>
            <p className="dashboard__stat-value">{data.completedPayments.length}</p>
            <p className="dashboard__stat-label">Payments Made</p>
          </div>
        </div>
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--clay">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="dashboard__stat-value">{formatCurrency(totalPaid, currency)}</p>
            <p className="dashboard__stat-label">Total Paid</p>
          </div>
        </div>
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--blue">
            <Clock size={16} />
          </div>
          <div>
            <p className="dashboard__stat-value">{data.pendingPayments.length}</p>
            <p className="dashboard__stat-label">Pending</p>
          </div>
        </div>
        <div className="dashboard__stat-card dashboard__stat-card--action" onClick={() => router.push('/dashboard/rent-credit')}>
          <div className="dashboard__stat-icon dashboard__stat-icon--purple">
            <BarChart3 size={16} />
          </div>
          <div>
            <p className="dashboard__stat-value">View</p>
            <p className="dashboard__stat-label">Rent Credit</p>
          </div>
          <ArrowUpRight size={14} className="dashboard__stat-arrow" />
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="dashboard__main-grid">

        {/* LEFT COLUMN */}
        <div className="dashboard__col dashboard__col--left">

          {/* Pending / Success card */}
          {data.pendingPayments.length > 0 ? (
            <section className="dashboard__section dashboard__section--pending">
              <div className="dashboard__section-header">
                <h3 className="dashboard__section-title">Pending Payments</h3>
              </div>
              <div style={{ padding: '0 20px' }}>
                {data.pendingPayments.map((p) => (
                  <div key={p.uuid} className="dashboard__payment-card dashboard__payment-card--pending" style={{ animation: 'fadeInUp 0.5s ease-out backwards' }}>
                    <div className="dashboard__payment-card-top">
                      <div className="dashboard__payment-card-company">
                        <img src={p.company_logo} alt="" width={32} height={32} className="dashboard__payment-card-logo" />
                        <div>
                          <span className="dashboard__payment-card-name">{p.company_name}</span>
                          <span className="dashboard__payment-card-invoice" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="status-beep"></span>
                            Pending • {p.invoice_number}
                          </span>
                        </div>
                      </div>
                      <span className="dashboard__payment-card-amount">{formatCurrency(p.total_amount, p.currency)}</span>
                    </div>
                    {p.notes && <p className="dashboard__payment-card-notes">{p.notes}</p>}
                    <button className="btn btn--primary btn--full btn--sm" onClick={() => router.push(`/pay?token=${p.payment_link_token}`)}>
                      Pay Now
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : data.completedPayments.length > 0 ? (
            <div className="dashboard__success-card dashboard__section--success" style={{ animation: 'fadeInUp 0.5s ease-out backwards' }}>
              <div className="dashboard__success-card-content">
                <div className="dashboard__success-icon"><Check size={24} /></div>
                <h3 className="dashboard__success-title">Rent Paid Successfully!</h3>
                <p className="dashboard__success-text">Your last payment was successful. Keep building your credit score.</p>
                <div className="dashboard__success-details" onClick={() => router.push(`/dashboard/receipts?id=${data.completedPayments[0].uuid}`)}>
                  <div>
                    <div className="dashboard__success-amount">{formatCurrency(data.completedPayments[0].amount, data.completedPayments[0].currency)}</div>
                    <div className="dashboard__success-date">Paid on {formatDate(data.completedPayments[0].paid_at)}</div>
                  </div>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          ) : null}

          {/* Recent Transactions */}
          <section className="dashboard__section dashboard__section--transactions">
            <div className="dashboard__section-header">
              <h3 className="dashboard__section-title">Recent Transactions</h3>
              <span className="dashboard__view-all" onClick={() => router.push('/dashboard/transactions')}>View All</span>
            </div>
            {data.completedPayments.length === 0 ? (
              <div className="dashboard__empty">
                <span className="dashboard__empty-icon"><FileStack size={32} /></span>
                <p>No transactions yet.</p>
              </div>
            ) : (
              <div className="dashboard__transactions-list">
                {data.completedPayments.slice(0, 5).map((tx, idx) => (
                  <div
                    key={tx.uuid}
                    className="dashboard__transaction-item"
                    style={{ animation: `fadeInUp 0.4s ease-out ${idx * 0.1}s backwards` }}
                    onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                  >
                    <div className="dashboard__transaction-left">
                      <div className="dashboard__transaction-status-dot" style={{ backgroundColor: getStatusColor(tx.status) }} />
                      <div className="dashboard__transaction-info">
                        <span className="dashboard__transaction-company">{tx.company_name}</span>
                        <span className="dashboard__transaction-channel">{tx.channel || 'Card Payment'}</span>
                      </div>
                    </div>
                    <div className="dashboard__transaction-right">
                      <span className="dashboard__transaction-amount">{formatCurrency(tx.amount, tx.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="dashboard__col dashboard__col--right">

          {/* Quick Access */}
          <section className="dashboard__quick-access" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div className="dashboard__quick-item" onClick={() => router.push('/dashboard/receipts')}>
              <div className="dashboard__quick-icon"><Receipt size={22} /></div>
              <span className="dashboard__quick-label">Receipts</span>
            </div>
            <div className="dashboard__quick-item" onClick={() => router.push('/dashboard/contracts')}>
              <div className="dashboard__quick-icon"><FileText size={22} /></div>
              <span className="dashboard__quick-label">Contracts</span>
            </div>
            <div className="dashboard__quick-item" onClick={() => router.push('/dashboard/rent-credit')}>
              <div className="dashboard__quick-icon"><BarChart3 size={22} /></div>
              <span className="dashboard__quick-label">Analytics</span>
            </div>
            <div className="dashboard__quick-item" onClick={() => router.push('/dashboard/ai-planner')}>
              <div className="dashboard__quick-icon" style={{ background: 'var(--clay-faint)' }}><Sparkles size={22} color="var(--clay)" /></div>
              <span className="dashboard__quick-label">AI Planner</span>
            </div>
          </section>

          {/* Adverts */}
          <section className="dashboard__section dashboard__section--adverts">
            <div className="dashboard__adverts">
              <div className="dashboard__ad-card dashboard__ad-card--primary" onClick={() => router.push('/dashboard/properties')}>
                <div className="dashboard__ad-badge">New</div>
                <h4 className="dashboard__ad-title">See Property Details</h4>
                <p className="dashboard__ad-desc">Track your lease history and see all property-related information.</p>
                <div className="dashboard__ad-icon"><Smartphone size={40} /></div>
              </div>
              <div className="dashboard__ad-card dashboard__ad-card--secondary" onClick={() => router.push('/dashboard/articles')}>
                <div className="dashboard__ad-badge dashboard__ad-badge--blue">Insight</div>
                <h4 className="dashboard__ad-title">The Africa Housing Market</h4>
                <p className="dashboard__ad-desc">Read about how we are tackling the housing crisis across Africa.</p>
                <div className="dashboard__ad-link">Read full article <ChevronRight size={14} /></div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard">
          <div className="pay-page__splash">
            <div className="pay-page__logo-pulse">
              <UpwardLogo size={28} color="#fff" />
            </div>
            <p className="pay-page__splash-text">Loading...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}