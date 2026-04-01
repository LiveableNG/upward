'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type DashboardData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
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
  BarChart3,
  Target,
} from 'lucide-react'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { PayRentCard, PayRentPage } from '@/components/dashboard/PayRentFlow'
import ActionCarousel from '@/components/dashboard/ActionCarousel'
import RentSavingsCard from '@/components/dashboard/RentSavingsCard'

// ─── Savings Goal Setup Modal ──────────────────────────────────────────────────
function SavingsGoalModal({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [goal, setGoal] = useState('')
  const [autoSave, setAutoSave] = useState(true)
  const [step, setStep] = useState<'goal' | 'auto'>('goal')

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onSkip}>
      <div className="modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-card__header">
          <div>
            <span className="modal-card__badge">Savings Setup</span>
            <h3 className="modal-card__title">
              {step === 'goal' ? 'Set Your Rent Goal' : 'Auto-Save Plan'}
            </h3>
          </div>
          <button className="modal-card__close" onClick={onSkip}><X size={18} /></button>
        </div>
        <div className="modal-card__body">
          {step === 'goal' ? (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Saving regularly toward your rent improves your <strong>Discipline Score</strong> and helps you always be ready when rent is due.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[150000, 250000, 500000, 1000000].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setGoal(String(preset))}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                      border: `1px solid ${goal === String(preset) ? 'var(--clay)' : 'var(--border-solid)'}`,
                      background: goal === String(preset) ? 'var(--clay-faint)' : 'var(--surface)',
                      color: goal === String(preset) ? 'var(--clay)' : 'var(--text-secondary)',
                    }}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 0 20px', background: 'none', border: 'none' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                <input
                  type="number"
                  placeholder="Enter your goal amount"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: '12px', padding: '14px 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }}
                />
              </div>
              <button className="btn btn--primary btn--full" disabled={!goal || Number(goal) < 1000} onClick={() => setStep('auto')}>
                Continue
              </button>
              <button className="btn btn--secondary btn--full" style={{ marginTop: '10px' }} onClick={onSkip}>
                Skip for now
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Would you like Upward to automatically set aside a portion of savings monthly toward your rent goal of <strong>₦{Number(goal).toLocaleString()}</strong>?
              </p>
              <div
                onClick={() => setAutoSave(!autoSave)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: autoSave ? 'var(--clay-faint)' : 'var(--surface)', border: `1px solid ${autoSave ? 'var(--clay)' : 'var(--border-solid)'}`, borderRadius: '14px', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s' }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '6px', border: `2px solid ${autoSave ? 'var(--clay)' : 'var(--border-solid)'}`, background: autoSave ? 'var(--clay)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                  {autoSave && <Check size={14} color="#fff" />}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Enable Auto-Save</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Automatically save each month toward your goal</p>
                </div>
                <Zap size={18} color={autoSave ? 'var(--clay)' : 'var(--text-muted)'} style={{ marginLeft: 'auto', flexShrink: 0 }} fill={autoSave ? 'var(--clay)' : 'none'} />
              </div>
              <button className="btn btn--primary btn--full" onClick={onDone}>
                Save Goal &amp; Continue
              </button>
              <button className="btn btn--secondary btn--full" style={{ marginTop: '10px' }} onClick={() => setStep('goal')}>
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isNative, setIsNative] = useState(false)
  const [dismissedAppBanner, setDismissedAppBanner] = useState(false)
  const [showPayRent, setShowPayRent] = useState(false)
  const [showKYCAlert, setShowKYCAlert] = useState(true)
  const [rentReminders] = useState<any[]>([])
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false)
  const [savingsGoalSet, setSavingsGoalSet] = useState(false)
  const [notifications, setNotifications] = useState<{id:string, text:string, icon: React.ReactNode}[]>([])
  const [news, setNews] = useState([
    { id: 'news-1', text: 'New: Securely verify your rent history with landlords.', icon: <Zap size={14} color="var(--clay)" /> },
  ])

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
      setData(result)
      // Seed notifications based on real data
      if (!result.tenant.hasCompletedOnboarding) {
        const notifs = []
        if (result.pendingPayments.length > 0) {
          notifs.push({
            id: 'notif-pending',
            text: `You have a pending payment from ${result.pendingPayments[0].company_name}. Pay now to start building your score.`,
            icon: <Clock size={14} color="var(--clay)" />,
          })
        } else {
          notifs.push({ id: 'notif-1', text: 'Welcome! Make your first rent payment to start building your Rent Credibility Score.', icon: <Sparkles size={14} color="var(--clay)" /> })
        }
        // notifs.push({ id: 'notif-savings', text: 'Set a savings goal to track your rent progress and earn points toward your Discipline Score.', icon: <Target size={14} color="var(--clay)" /> })
        setNotifications(notifs)
      }
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
    return (
      <PayRentPage
        onBack={() => setShowPayRent(false)}
        pendingPayments={data.pendingPayments}
        savedLandlords={data.savedLandlords || []}
        savingsBalance={data.tenant.savingsBalance}
      />
    )
  }

  const tenant = data.tenant
  const firstName = tenant.fullName?.split(' ')[0] || 'Tenant'
  const totalPaid = data.completedPayments.reduce((sum: number, p) => sum + p.amount, 0)
  const currency = data.completedPayments[0]?.currency || 'NGN'

  // ─── User scenario ─────────────────────────────────────────────────────────
  const isNewUser = !tenant.hasCompletedOnboarding

  // ─── Notification count ───────────────────────────────────────────────────
  const notifCount = isNewUser
    ? notifications.length + data.pendingPayments.length
    : (data.pendingPayments.length || 0) + (showKYCAlert ? 1 : 0) + activeReminders.length + news.length

  // ─── Rent credibility data ────────────────────────────────────────────────
  const credScore = isNewUser ? 0 : 882
  const credPercentage = isNewUser ? 0 : 88.2

  return (
    <div className="dashboard dashboard--nav-offset">

      {/* ── MODALS ── */}
      {showSavingsGoalModal && (
        <SavingsGoalModal
          onDone={() => { setShowSavingsGoalModal(false); setSavingsGoalSet(true) }}
          onSkip={() => setShowSavingsGoalModal(false)}
        />
      )}

      {/* ── MOBILE HEADER ── */}
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
            title="Notifications"
            onClick={() => router.push('/dashboard/notifications')}
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--clay)', color: '#fff', fontSize: '9px',
                padding: '2px 5px', borderRadius: '10px', minWidth: '16px', border: '2px solid var(--bg)'
              }}>{notifCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
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
          <button
            className="dashboard__icon-btn"
            title="Notifications"
            onClick={() => router.push('/dashboard/notifications')}
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--clay)', color: '#fff', fontSize: '9px',
                padding: '2px 5px', borderRadius: '10px', minWidth: '16px', border: '2px solid var(--bg)'
              }}>{notifCount}</span>
            )}
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



      {/* ── STAT STRIP ── */}
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

          {/* ── APP BANNER: New users only, same width as all other banners ── */}
          {isNewUser && !isNative && !dismissedAppBanner && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border-solid)',
              borderRadius: '14px',
              marginBottom: '12px',
              animation: 'fadeInUp 0.3s ease-out',
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--clay-faint)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)', flexShrink: 0 }}>
                <Smartphone size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '1px' }}>Get the Upward App</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Track payments &amp; savings on the go.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  className="btn btn--primary btn--sm"
                  style={{ padding: '6px 12px', height: 'auto', fontSize: '12px', fontWeight: 700 }}
                >
                  Download
                </button>
                <button
                  onClick={() => setDismissedAppBanner(true)}
                  style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── NEW USER: Savings goal banner bar ── */}
          {isNewUser && !savingsGoalSet && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              background: 'var(--clay-faint)',
              border: '1px solid rgba(217,119,87,0.2)',
              borderRadius: '14px',
              marginBottom: '16px',
              animation: 'fadeInUp 0.4s ease-out',
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217,119,87,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)', flexShrink: 0 }}>
                <Target size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Set your savings goal</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Build your Discipline Score and always be rent-ready</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  className="btn btn--primary btn--sm"
                  style={{ padding: '7px 12px', height: 'auto', fontSize: '12px' }}
                  onClick={() => setShowSavingsGoalModal(true)}
                >
                  Set Goal
                </button>
                <button
                  onClick={() => setSavingsGoalSet(true)}
                  style={{ padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── NEW USER: Dismissable notification toasts ── */}
          {isNewUser && notifications.map(notif => (
            <div key={notif.id} className="dashboard__announcement-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {notif.icon}
                <p>{notif.text}</p>
              </div>
              <button
                className="dashboard__announcement-close"
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* ── SARAH: News bar ── */}
          {!isNewUser && news.map(item => (
            <div key={item.id} className="dashboard__announcement-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.icon}
                <p>{item.text}</p>
              </div>
              <button
                className="dashboard__announcement-close"
                onClick={() => setNews(prev => prev.filter(n => n.id !== item.id))}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* ── ACTIVITY CENTER: Sarah only (when real items exist) ── */}
          {!isNewUser && (data.pendingPayments.length > 0 || showKYCAlert || activeReminders.length > 0) && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Activity Center</h3>
                <button
                  onClick={() => router.push('/dashboard/notifications')}
                  style={{
                    fontSize: '11px', fontWeight: 600, color: 'var(--clay)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  See all
                  {notifCount > 0 && (
                    <span style={{ background: 'var(--clay)', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '10px', minWidth: '16px', textAlign: 'center' }}>{notifCount}</span>
                  )}
                </button>
              </div>
              <ActionCarousel
                pendingPayments={data.pendingPayments}
                showKYC={showKYCAlert}
                rentReminders={activeReminders}
              />
            </div>
          )}

          {/* ── RENT SAVINGS CARD ── */}
          <RentSavingsCard
            isNewUser={isNewUser}
            savingsBalance={tenant.savingsBalance}
            savingsGoal={tenant.savingsGoal}
            autoSave={!isNewUser}
            onConfigureGoal={() => setShowSavingsGoalModal(true)}
          />

          {/* ── RENT CREDIBILITY SCORE ── */}
          <section className="score-card">
            <div className="score-card__header">
              <h3 className="score-card__title">Rent Credibility Score</h3>
              <div style={{ textAlign: 'right' }}>
                {isNewUser ? (
                  <span className="score-card__badge" style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border-solid)' }}>Not Built Yet</span>
                ) : (
                  <span className="score-card__badge" style={{ background: 'var(--clay-faint)', color: 'var(--clay)', border: '1px solid rgba(217,119,87,0.15)' }}>Top Rated</span>
                )}
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{isNewUser ? 'Start building today' : 'Updated today'}</p>
              </div>
            </div>

            <div className="score-visual">
              <div
                className="score-gauge"
                style={{
                  background: isNewUser
                    ? 'conic-gradient(var(--border-solid) 0% 100%)'
                    : `conic-gradient(var(--clay) 0% ${credPercentage}%, var(--border-solid) ${credPercentage}% 100%)`,
                  boxShadow: isNewUser ? 'none' : '0 0 30px rgba(217,119,87,0.1)'
                }}
              >
                <div className="score-value">
                  <span className="score-num" style={{ color: isNewUser ? 'var(--text-muted)' : 'var(--text)', fontSize: '42px' }}>
                    {isNewUser ? '0' : `${credPercentage}%`}
                  </span>
                  <span className="score-label">{isNewUser ? 'No Score Yet' : `${credScore} Score`}</span>
                </div>
              </div>
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                {isNewUser ? (
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Start building your profile — make your first <span style={{ color: 'var(--clay)' }}>savings deposit</span> or <span style={{ color: 'var(--clay)' }}>rent payment</span>
                  </p>
                ) : (
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    You are in the <span style={{ color: 'var(--clay)' }}>top 1.2%</span> of tenants nationwide.
                  </p>
                )}
              </div>
            </div>

            {!isNewUser && (
              <>
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
              </>
            )}

            {isNewUser && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    icon: <TrendingUp size={14} color="var(--clay)" />,
                    text: 'Make your first rent payment',
                    action: () => setShowPayRent(true),
                  },
                  {
                    icon: <Target size={14} color="var(--clay)" />,
                    text: 'Set up an auto-savings plan',
                    action: () => setShowSavingsGoalModal(true),
                  },
                  {
                    icon: <FileText size={14} color="var(--clay)" />,
                    text: 'Upload your lease contract',
                    action: () => router.push('/dashboard/contracts'),
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    onClick={step.action}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface2)', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clay-faint)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--clay-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {step.icon}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, flex: 1 }}>{step.text}</span>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── SHARE CREDIBILITY: Sarah only ── */}
          {!isNewUser && (
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
          )}

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