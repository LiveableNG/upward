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

      {/* STAT STRIP - Subtly updated with Contract icon access */}
      <div className="dashboard__stat-strip">
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--green"><Check size={16} /></div>
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
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--blue"><Clock size={16} /></div>
          <div>
            <p className="dashboard__stat-value">{data.pendingPayments.length}</p>
            <p className="dashboard__stat-label">Pending</p>
          </div>
        </div>
        <div className="dashboard__stat-card dashboard__stat-card--action" onClick={() => router.push('/dashboard/contracts')}>
          <div className="dashboard__stat-icon dashboard__stat-icon--purple"><FileText size={16} /></div>
          <div>
            <p className="dashboard__stat-value">View</p>
            <p className="dashboard__stat-label">Lease Files</p>
          </div>
          <ArrowUpRight size={14} className="dashboard__stat-arrow" />
        </div>
      </div>

      <div className="dashboard__main-grid">

        <div className="dashboard__col dashboard__col--left">

        </div>

        <div className="dashboard__col dashboard__col--right">
          
          {showKYCAlert && (
            <div className="kyc-alert" style={{ marginBottom: '24px' }} onClick={() => router.push('/dashboard/kyc')}>
              <div className="kyc-alert__content">
                <div className="kyc-alert__icon"><ShieldCheck size={20} /></div>
                <div className="kyc-alert__text">
                  <p>Landlord KYC Request</p>
                  <span>Verification request for LivableNG/HQ-9-24</span>
                </div>
              </div>
              <button className="kyc-alert__btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* CENTER ACTION SLOT (Pending OR Pay Rent) */}
<div style={{ marginBottom: '24px' }}>
  {data.pendingPayments.length > 0 ? (
    <div className="dashboard__payment-card dashboard__payment-card--pending" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {(() => {
        const p = data.pendingPayments[0] // only show the first one in this slot

        return (
          <>
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
                  <span
                    className="dashboard__payment-card-invoice"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '2px',
                    }}
                  >
                    <span className="status-beep" />
                    Pending · {p.invoice_number}
                  </span>
                </div>
              </div>

              <span className="dashboard__payment-card-amount">
                {formatCurrency(p.total_amount, p.currency)}
              </span>
            </div>

            {p.notes && (
              <p className="dashboard__payment-card-notes">{p.notes}</p>
            )}

            <button
              className="btn btn--primary btn--full btn--sm"
              onClick={() => router.push(`/pay?token=${p.payment_link_token}`)}
            >
              Pay Now
            </button>
          </>
        )
      })()}
    </div>
  ) : (
    <PayRentCard onOpen={() => setShowPayRent(true)} />
  )}
</div>

          <section className="score-card">
            <div className="score-card__header">
              <h3 className="score-card__title">Rent Credibility Score</h3>
              <span className="score-card__badge">Excellent</span>
            </div>
            
            <div className="score-visual">
              <div className="score-gauge" style={{ background: 'conic-gradient(var(--clay) 0% 88%, var(--border-solid) 88% 100%)' }}>
                <div className="score-value">
                  <span className="score-num">882</span>
                  <span className="score-label">of 1,000</span>
                </div>
              </div>
            </div>

            <div className="achievement-list">
              <div className="achievement-item">
                <span className="achievement-item__val">12</span>
                <span className="achievement-item__label">On-time Streaks</span>
              </div>
              <div className="achievement-item">
                <span className="achievement-item__val">Top 1%</span>
                <span className="achievement-item__label">Market Rank</span>
              </div>
              <div className="achievement-item">
                <span className="achievement-item__val">Gold</span>
                <span className="achievement-item__label">Tenant Tier</span>
              </div>
              <div className="achievement-item">
                <span className="achievement-item__val"><TrendingUp size={16} /></span>
                <span className="achievement-item__label">+24 pts last mo.</span>
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
              <div className="share-cred__btn">
                <Share size={18} />
                <span>Share My Report</span>
              </div>
          </section>

          {/* CONTRACTS - Better placed on the right sidebar */}
          <section className="dashboard__section">
            <div className="dashboard__section-header">
              <h3 className="dashboard__section-title" style={{ fontSize: '15px' }}>Active Documents</h3>
            </div>
            <div>
              <div className="update-item" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }} onClick={() => router.push('/dashboard/contracts')}>
                <div className="update-item__icon" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}><FileText size={20} /></div>
                <div className="update-item__content">
                  <div className="update-item__title">Tenancy Agreement</div>
                  <p className="update-item__desc">Livableng/Ikoyi/A4 · Expires Oct 2026</p>
                </div>
              </div>
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