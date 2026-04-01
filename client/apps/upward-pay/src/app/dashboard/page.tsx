'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import {
  FileText,
  AlertTriangle,
  HelpCircle,
  Bell,
  Check,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Smartphone,
  X,
  Share,
  Award,
  Zap,
  Sparkles,
  ShieldCheck,
  ChevronUp,
  BarChart3,
  Send,
} from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { PayRentCard, PayRentPage } from '@/components/dashboard/PayRentFlow'
import ActionCarousel from '@/components/dashboard/ActionCarousel'
import RentSavingsCard from '@/components/dashboard/RentSavingsCard'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isNative, setIsNative] = useState(false)
  const [dismissedAppBanner, setDismissedAppBanner] = useState(false)
  const [showPayRent, setShowPayRent] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [showKYCAlert, setShowKYCAlert] = useState(true)
  const [rentReminders, setRentReminders] = useState<any[]>([])
  const [hasCompletedActions, setHasCompletedActions] = useState(false)

  const activeReminders = rentReminders.filter(r => {
    const dueDate = new Date(r.dueDate)
    const today = new Date()
    const diffInMonths = (dueDate.getFullYear() - today.getFullYear()) * 12 + (dueDate.getMonth() - today.getMonth())
    return diffInMonths <= 3 && diffInMonths >= 0
  })

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

      if (result.pendingPayments.length === 0) {
        result.pendingPayments.push({
          uuid: 'mock-greenland',
          total_amount: 15000000,
          currency: 'NGN',
          status: 'pending',
          payment_link_token: 'mock-greenland-token',
          invoice_number: 'INV-2024-GL',
          notes: 'Rent + Utility · March 2026 for Building A4-201',
          company_name: 'Greenland Estates Ltd',
          company_logo: 'https://placehold.co/100x100/d97757/ffffff?text=GE'
        })
      }

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
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={loadDashboard}>Retry</button>
        </div>
      </div>
    )
  }

  if (showPayRent) {
    return <PayRentPage onBack={() => setShowPayRent(false)} />
  }

  const tenant = data.tenant
  const firstName = tenant.fullName?.split(' ')[0] || 'Tenant'
  const totalPaid = data.completedPayments.reduce((sum: number, p) => sum + p.amount, 0)
  const currency = data.completedPayments[0]?.currency || 'NGN'

  return (
    <div className="dashboard dashboard--nav-offset">

      <header className="dashboard__header dashboard__header--mobile">
        <div
          className="dashboard__header-left"
          onClick={() => router.push('/dashboard/me')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard__avatar">{firstName[0]?.toUpperCase()}</div>
          <div>
            <h2 className="dashboard__greeting" style={{ marginBottom: 0 }}>Hey, {firstName}</h2>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>View Profile</span>
          </div>
        </div>
        <div className="dashboard__header-right">
          <button
            className="dashboard__icon-btn"
            title="View Contract"
            onClick={() => router.push('/dashboard/contracts')}
            style={{ color: 'var(--clay)', background: 'var(--clay-faint)' }}
          >
            <FileText size={18} />
          </button>
          <button className="dashboard__icon-btn" title="Help" onClick={() => router.push('/dashboard/help')}>
            <HelpCircle size={20} />
          </button>
          <button
            className="dashboard__icon-btn"
            title="Activity Hub"
            onClick={() => router.push('/dashboard/notifications')}
          >
            <Bell size={20} />
          </button>
        </div>
      </header>

      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Overview</h1>
          <p className="dashboard__desktop-subtitle">Welcome back, {firstName}</p>
        </div>
        <div className="dashboard__desktop-header-right">
          <button
            className="btn btn--secondary btn--sm"
            style={{ marginRight: '12px', padding: '8px 16px', height: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => router.push('/dashboard/contracts')}
          >
            <FileText size={16} />
            View Contract
          </button>
          <button className="dashboard__icon-btn" title="Activity Hub" onClick={() => router.push('/dashboard/notifications')}>
            <Bell size={20} />
          </button>
          <button className="dashboard__icon-btn" title="Help" onClick={() => router.push('/dashboard/help')}>
            <HelpCircle size={20} />
          </button>
          <div className="dashboard__desktop-profile" onClick={() => router.push('/dashboard/me')}>
            <div className="dashboard__avatar dashboard__avatar--sm">{firstName[0]?.toUpperCase()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span className="dashboard__desktop-profile-name" style={{ lineHeight: 1.2 }}>{tenant.fullName}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>My Account</span>
            </div>
          </div>
        </div>
      </header>

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

      {/* STAT STRIP */}
      <div className="dashboard__stat-strip">
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--clay"><Check size={16} /></div>
          <div>
            <p className="dashboard__stat-value">{data.completedPayments.length}</p>
            <p className="dashboard__stat-label">Payments Made</p>
          </div>
        </div>
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--clay"><TrendingUp size={16} /></div>
          <div>
            <p className="dashboard__stat-value">{formatCurrency(totalPaid, currency)}</p>
            <p className="dashboard__stat-label">Total Paid</p>
          </div>
        </div>
        <div
          className="dashboard__stat-card dashboard__stat-card--action"
          onClick={() => router.push('/dashboard/notifications')}
          style={{ cursor: data.pendingPayments.length > 0 ? 'pointer' : 'default' }}
        >
          <div
            className="dashboard__stat-icon dashboard__stat-icon--clay"
            style={data.pendingPayments.length > 0 ? { animation: 'pulse 2s infinite' } : {}}
          >
            <Clock size={16} />
          </div>
          <div>
            <p className="dashboard__stat-value">{data.pendingPayments.length}</p>
            <p className="dashboard__stat-label">Pending</p>
          </div>
          {data.pendingPayments.length > 0 && <ArrowUpRight size={14} className="dashboard__stat-arrow" />}
        </div>
        <div className="dashboard__stat-card dashboard__stat-card--action" onClick={() => router.push('/dashboard/contracts')}>
          <div className="dashboard__stat-icon dashboard__stat-icon--clay"><FileText size={16} /></div>
          <div>
            <p className="dashboard__stat-value">View</p>
            <p className="dashboard__stat-label">Lease Files</p>
          </div>
          <ArrowUpRight size={14} className="dashboard__stat-arrow" />
        </div>
      </div>

      <div className="dashboard__main-grid">

        <div className="dashboard__col dashboard__col--left" />

        <div className="dashboard__col dashboard__col--right">

          {!hasCompletedActions && (data.pendingPayments.length > 0 || showKYCAlert || activeReminders.length > 0) ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Activity Center</h3>
                <button
                  onClick={() => router.push('/dashboard/notifications')}
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  See all
                </button>
              </div>

              <ActionCarousel
                pendingPayments={data.pendingPayments}
                showKYC={showKYCAlert}
                rentReminders={activeReminders}
              />
            </div>
          ) : null}

          {hasCompletedActions && (
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <button
                onClick={() => setHasCompletedActions(false)}
                style={{ padding: '8px 12px', fontSize: '10px', color: 'var(--clay)', border: '1px solid var(--clay-faint)', borderRadius: '8px', background: 'var(--clay-faint)', cursor: 'pointer' }}
              >
                Reset Dashboard View
              </button>
            </div>
          )}

          {!hasCompletedActions && (data.pendingPayments.length > 0 || showKYCAlert || activeReminders.length > 0) && (
            <button
              onClick={() => setHasCompletedActions(true)}
              style={{ padding: '8px 12px', fontSize: '10px', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', background: 'none', marginBottom: '24px', cursor: 'pointer' }}
            >
              Simulate Actions Completed (Demo)
            </button>
          )}

          <RentSavingsCard />

          <section className="score-card">
            <div className="score-card__header">
              <h3 className="score-card__title">Rent Credibility Score</h3>
              <div style={{ textAlign: 'right' }}>
                <span className="score-card__badge" style={{ background: 'var(--clay-faint)', color: 'var(--clay)', border: '1px solid rgba(217,119,87,0.15)' }}>Top Rated</span>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Updated today</p>
              </div>
            </div>

            <div className="score-visual">
              <div
                className="score-gauge"
                style={{
                  background: 'conic-gradient(var(--clay) 0% 88.2%, var(--border-solid) 88.2% 100%)',
                  boxShadow: '0 0 30px rgba(217,119,87,0.1)'
                }}
              >
                <div className="score-value">
                  <span className="score-num" style={{ color: 'var(--text)', fontSize: '42px' }}>88.2%</span>
                  <span className="score-label">882 Score</span>
                </div>
              </div>
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  You are in the <span style={{ color: 'var(--clay)' }}>top 1.2%</span> of tenants nationwide.
                </p>
              </div>
            </div>

            <div className="score-breakdown" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--clay)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Payment Discipline</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--clay)' }}>100%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--clay-hover)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Lease Longevity</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>4.2 Years</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Housing Stability</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>High</span>
              </div>
            </div>

            <div className="achievement-list" style={{ marginTop: '32px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="achievement-item" style={{ background: 'var(--surface2)', border: 'none' }}>
                <span className="achievement-item__val" style={{ color: 'var(--clay)' }}>12</span>
                <span className="achievement-item__label">On-time Streaks</span>
              </div>
              <div className="achievement-item" style={{ background: 'var(--surface2)', border: 'none' }}>
                <span className="achievement-item__val" style={{ color: 'var(--clay)' }}>+24 pts</span>
                <span className="achievement-item__label">Monthly Growth</span>
              </div>
            </div>
          </section>

          <section className="share-cred" style={{ margin: '0 0 24px 0', animation: 'fadeInUp 0.8s ease-out' }}>
            <div className="share-cred__badge" style={{ display: 'inline-flex', padding: '6px 12px', background: 'rgba(217,119,87,0.1)', borderRadius: '99px', marginBottom: '16px' }}>
              <Award size={14} color="var(--clay)" style={{ marginRight: '6px' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--clay)', textTransform: 'uppercase' }}>Tenant Legacy</span>
            </div>
            <h3 className="share-cred__title">Share Your Rent Credibility</h3>
            <p className="share-cred__desc">
              Showcase your commitment to housing excellence. Sharing your credibility helps you unlock better deals and housing opportunities.
            </p>
            <div className="share-cred__btn" onClick={() => router.push('/dashboard/kyc')}>
              <Share size={18} />
              <span>Share My Report</span>
            </div>
          </section>

        </div>
      </div>

      {showAnnouncement && (
        <div className="modal-overlay" onClick={() => setShowAnnouncement(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header">
              <div>
                <span className="modal-card__badge">Announcement</span>
                <h3 className="modal-card__title">Welcome to Upward Pay</h3>
              </div>
              <button className="modal-card__close" onClick={() => setShowAnnouncement(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-card__body">
              <p className="modal-card__text">
                Experience the new way of managing your rent and payments. We've updated our dashboard to give you a better overview of your housing finances.
              </p>
              <button className="btn btn--primary btn--full" onClick={() => setShowAnnouncement(false)}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
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