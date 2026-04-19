'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, TrendingUp, Flame, ShieldCheck, Zap, Receipt, ArrowDownRight, ArrowUpRight, Smartphone, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { StatStrip } from '@/features/dashboard/components/StatStrip'
import { AppInstallBanner } from '@/features/dashboard/components/AppInstallBanner'
import { AnnouncementBanner } from '@/features/dashboard/components/AnnouncementBanner'
import { UpcomingFeaturesWidget } from '@/features/dashboard/components/UpcomingFeaturesWidget'
import { RentCredibilityScore } from '@/features/dashboard/components/RentCredibilityScore'
import { ShareCredibility } from '@/features/dashboard/components/ShareCredibility'
import { ActionCarousel } from '@/features/dashboard/components/ActionCarousel'
import { RecentActivityWidget } from '@/features/dashboard/components/RecentActivityWidget'
import FallbackSuspense from '@/components/FallbackSuspense'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const { data, loading, error, reload } = useDashboard()
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })
  const { data: scoreProfile } = useScoreProfile()

  const [localDismissedBanner, setLocalDismissedBanner] = useState(false)
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('app_banner_dismissed') === 'true'
      setLocalDismissedBanner(dismissed)
    }
  }, [])

  const handleDismissBanner = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_banner_dismissed', 'true')
      setLocalDismissedBanner(true)
    }
  }

  useEffect(() => {
    if (error && (error.toLowerCase().includes('expired') || error.toLowerCase().includes('auth'))) {
      router.push('/login')
    }
  }, [error, router])


  if (loading) return <FallbackSuspense message="Loading dashboard…" />

  if (error || !data) {
    if (error?.toLowerCase().includes('expired') || error?.toLowerCase().includes('auth')) {
      return <FallbackSuspense message="Session expired. Redirecting..." />
    }
    return (
      <div className="dashboard dashboard--error">
        <div className="pay-page__error">
          <div className="pay-page__error-icon"><AlertTriangle size={32} /></div>
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={reload}>Retry</button>
        </div>
      </div>
    )
  }

  const { user, pendingPayments: rawPending, completedPayments } = data
  const pendingPayments = [...(rawPending || [])].sort((a, b) => {
    const now = new Date()
    const aDate = a.due_date || a.dueDate
    const bDate = b.due_date || b.dueDate
    const aOverdue = aDate && new Date(aDate) < now ? 1 : 0
    const bOverdue = bDate && new Date(bDate) < now ? 1 : 0
    if (aOverdue !== bOverdue) return bOverdue - aOverdue
    // Secondary sort: soonest due date first
    return new Date(aDate || 0).getTime() - new Date(bDate || 0).getTime()
  })
  const firstName = user.firstName || 'User'

  const hasProperties = user.properties && user.properties.length > 0
  const firstProp = hasProperties ? user?.properties?.[0] : null
  const isProfileComplete = hasProperties &&
    firstProp?.location?.area &&
    firstProp?.location?.state &&
    firstProp?.location?.country &&
    firstProp?.rentEndDate

  const isNewUser = !isProfileComplete
  const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const currency = completedPayments[0]?.currency || 'NGN'

  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNative
  const shouldShowAppBanner = !isCapacitor && !localDismissedBanner

  const backendNotifCount = notifData?.unreadCount || 0
  const pendingCount = pendingPayments.length || 0
  const notifCount = backendNotifCount + pendingCount

  const scoreData = scoreProfile?.data
  const credScore = scoreData?.score || 0
  const rank = scoreData?.rank || 'N/A'
  const band = scoreData?.band || 'unranked'
  const isScorable = scoreData?.isScorable || false
  const onTime = Math.round(scoreData?.metrics?.ptPercentage || 0)
  const streak = scoreData?.metrics?.longestStreak || 0
  const profileCompletion = scoreData?.profile?.profileCompletion || 0
  const credPercentage = isScorable ? (credScore / 800) * 100 : (400 / 800) * 100
  
  const propertyReminders = (user.properties || [])
    .filter(prop => !!prop.rentEndDate)
    .filter(prop => {
      // Deduplicate: If there's an active pending payment for this property, don't show the generic reminder
      const hasPending = pendingPayments.some((p: any) => p.userPropertyUuid === prop.uuid)
      return !hasPending
    })
    .map(prop => {
      const d = new Date(prop.rentEndDate!)
      const now = new Date()
      const isOverdue = d <= now
      
      // Calculate days until due
      const diff = d.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      
      // Only show as reminder if overdue
      if (!isOverdue) return null

      return {
        type: 'rent_reminder',
        id: prop.uuid,
        title: 'Rent Overdue',
        property_address: prop.location ? [prop.location.address, prop.location.area, prop.location.state, prop.location.country].filter(Boolean).join(', ') : (prop.address || 'Property'),
        rentEndDate: prop.rentEndDate,
        desc: `Rent for ${prop.location?.address || prop.location?.area || 'your property'} was due on ${formatDate(prop.rentEndDate!)}.`,
        actionLabel: 'Pay Overdue Rent',
        action: () => router.push(`/dashboard/pay-rent?propertyUuid=${prop.uuid}`),
        isCritical: isOverdue,
        bg: 'var(--error)'
      }
    })
    .filter(Boolean)

  const anyOverdue = pendingPayments.some(p => {
    const dateStr = p.due_date || p.dueDate
    return dateStr && new Date(dateStr) < new Date()
  }) || propertyReminders.some((r: any) => r?.isCritical)

  const getRankColor = () => {
    if (!isScorable) return 'var(--text-muted)'
    if (rank === 'A') return 'var(--clay)'
    if (rank === 'B') return 'var(--success)'
    if (rank === 'C') return 'var(--info)'
    if (rank === 'D') return 'var(--warning)'
    return 'var(--error)'
  }

  const recentThree = completedPayments.slice(0, 3)
  const firstPending = pendingPayments[0]

  return (
    <div className="dashboard dashboard--nav-offset">
      {/* Mobile sticky header — isolated so banner removal doesn't shift it */}
      <div className="mobile-only mobile-header-sticky">
        <DashboardHeader
          firstName={firstName}
          notifCount={notifCount}
          profilePic={user.profilePic}
        />
      </div>
      {/* App install banner renders in normal flow, below the sticky header */}
      {shouldShowAppBanner && (
        <div className="mobile-only">
          <AppInstallBanner onDismiss={handleDismissBanner} />
        </div>
      )}

      <StatStrip
        completedPaymentsCount={completedPayments.length}
        totalPaid={totalPaid}
        currency={currency}
        pendingCount={pendingPayments.length}
      />

      {/* ── MOBILE LAYOUT (unchanged) ── */}
      <div className="dash-mobile">
        <div className="dashboard__main-grid">
          <div className="dashboard__col dashboard__col--left">
            {(pendingPayments.length > 0 || isNewUser || propertyReminders.length > 0) && (
              <div className={`activity-center ${anyOverdue ? 'activity-center--critical' : ''}`} style={{ marginBottom: '24px' }}>
                <div className="activity-center__header">
                  <h3 className="activity-center__title">
                    {anyOverdue ? 'CRITICAL ACTIONS' : 'Activity Center'}
                  </h3>
                  <button className="activity-center__see-all" onClick={() => router.push('/dashboard/notifications')}>
                    See all {notifCount > 0 && <span className="activity-center__badge">{notifCount}</span>}
                  </button>
                </div>
                <ActionCarousel pendingPayments={pendingPayments} showKYC={isNewUser} rentReminders={propertyReminders} />
              </div>
            )}
            <RentCredibilityScore user={user} onShowPayRent={() => router.push('/dashboard/pay-rent')} />
          </div>
          <div className="dashboard__col dashboard__col--right">
            <div className="right-stack">
              <AnnouncementBanner />
              <RecentActivityWidget payments={completedPayments} />
              <ShareCredibility profileSlug={user.profileSlug} />
              <div className="desktop-only"><UpcomingFeaturesWidget /></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP BENTO LAYOUT ── */}
      <div className="dash-desktop">
        <div className="bento-grid">

          {/* CELL 1: Hero — Pending Payment or Score Hero */}
          {(() => {
            const heroSlides = [
              ...pendingPayments.map(p => ({ ...p, type: 'payment' })),
              ...propertyReminders.map(r => ({ ...r, type: 'property' }))
            ].sort((a: any, b: any) => {
              // Priority 1: Payments vs Reminders
              if (a.type !== b.type) return a.type === 'payment' ? -1 : 1
              
              const aDate = a.due_date || a.dueDate
              const bDate = b.due_date || b.dueDate
              const aCritical = a.isCritical || (aDate && new Date(aDate) < new Date()) ? 1 : 0
              const bCritical = b.isCritical || (bDate && new Date(bDate) < new Date()) ? 1 : 0
              if (aCritical !== bCritical) return bCritical - aCritical
              return 0
            })

            const hasSlides = heroSlides.length > 0
            const currentIdx = hasSlides ? heroSlideIndex % heroSlides.length : 0
            const currentHero = hasSlides ? heroSlides[currentIdx] : null
            const heroItem = currentHero as any
            const heroDate = heroItem?.due_date || heroItem?.dueDate
            const isOverdue = heroItem?.isCritical || (heroDate && new Date(heroDate) < new Date())
            
            const targetPaymentIdx = heroSlides.findIndex((s: any) => s.type === 'payment')
            const shouldBeamPrev = heroItem?.type === 'property' && targetPaymentIdx !== -1 && targetPaymentIdx < currentIdx
            const shouldBeamNext = heroItem?.type === 'property' && targetPaymentIdx !== -1 && targetPaymentIdx > currentIdx


            // Calculate days for wording
            const d = new Date(heroItem?.due_date || heroItem?.dueDate || heroItem?.rentEndDate || Date.now())
            const diff = d.getTime() - new Date().getTime()
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

            const beamClass = hasSlides ? (isOverdue ? 'animate-beam-red' : 'animate-beam-clay') : ''

            return (
              <div className={`bento-cell bento-cell--hero ${hasSlides ? 'has-pending' : ''} ${isOverdue ? 'is-overdue' : ''}`}>
                {hasSlides && (
                  <div className="bento-hero-pending__top">
                    <div className="bento-hero-pending__badge">
                      {isOverdue 
                        ? (heroItem.type === 'payment' 
                            ? 'ACTION REQUIRED' 
                            : 'RENT OVERDUE')
                        : (heroItem.type === 'payment' 
                            ? ((heroItem.amountPaid || 0) > 0 ? 'PARTIAL PAYMENT' : 'PAYMENT REQUEST') 
                            : 'RENT DUE SOON')
                      }
                    </div>
                    
                    {heroSlides.length > 1 && (
                      <div className="bento-hero-nav">
                        <button 
                          className={`bento-hero-nav-btn ${shouldBeamPrev ? 'bento-hero-nav-btn--beam' : ''}`} 
                          onClick={(e) => { e.stopPropagation(); setHeroSlideIndex(prev => (prev - 1 + heroSlides.length) % heroSlides.length); }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="bento-hero-nav-info">{currentIdx + 1} / {heroSlides.length}</span>
                        <button 
                          className={`bento-hero-nav-btn ${shouldBeamNext ? 'bento-hero-nav-btn--beam' : ''}`} 
                          onClick={(e) => { e.stopPropagation(); setHeroSlideIndex(prev => (prev + 1) % heroSlides.length); }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="bento-hero-main">
                  {hasSlides ? (
                    <div className="bento-hero-pending">
                      
                      <h2 className={`bento-hero-pending__title ${isOverdue && heroItem.type === 'payment' ? 'animate-text-zoom' : ''}`}>
                        {isOverdue ? 'Action Required' : (daysLeft <= 7 ? 'Payment Due' : 'Rent Payment')} <br />
                        <span className="bento-hero-pending__accent">
                          {heroItem.company_name || heroItem.property_address || heroItem.title || 'Soon'}
                        </span>
                      </h2>

                      {heroItem.type === 'payment' ? (
                        <>
                          <div className="bento-hero-pending__amount">
                            {formatCurrency(heroItem.total_amount - (heroItem.amountPaid || 0), heroItem.currency)}
                            {(heroItem.amountPaid || 0) > 0 && <span className="bento-hero-pending__total"> of {formatCurrency(heroItem.total_amount, heroItem.currency)}</span>}
                          </div>
                          <p className={`bento-hero-pending__desc ${isOverdue && heroItem.type === 'payment' ? 'animate-text-zoom-subtle' : ''}`}>
                            {isOverdue
                              ? `Your credit standing is currently being affected. Pay immediately to protect your credibility score.`
                              : ((heroItem.amountPaid || 0) > 0
                                  ? `Settling balance for ${heroItem.property_address || 'your property'}.`
                                  : `Invoice generated by ${heroItem.company_name || 'your manager'} for ${heroItem.property_address || 'your property'}.`)
                            }
                          </p>
                          <div className="bento-hero-pending__actions">
                            <button
                              className="btn btn--primary bento-hero-btn"
                              onClick={() => router.push(`/pay/${heroItem.uuid}`)}
                            >
                              Pay Now <ArrowRight size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="bento-hero-pending__desc">
                            {heroItem.type === 'property' && isOverdue ? (
                              <>
                                Rent for {heroItem.property_address || 'your property'} was due on{' '}
                                <span className="bento-hero-date-hl">{formatDate(heroItem.rentEndDate!)}</span>.
                              </>
                            ) : heroItem.desc}
                          </p>
                          <div className="bento-hero-pending__actions">
                            <button
                              className="btn btn--primary bento-hero-btn"
                              onClick={heroItem.action}
                            >
                              {heroItem.actionLabel} <ArrowRight size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : isNewUser ? (
                    <div className="bento-hero-score">
                       <div className="bento-hero-score__label" style={{ color: 'var(--clay)' }}>Setup Required</div>
                       <h2 className="bento-hero-score__title">Complete your<br />Profile</h2>
                       <p className="bento-hero-score__desc">Add your property details to start building your credibility score.</p>
                       <button className="btn btn--primary bento-hero-btn" onClick={() => router.push('/dashboard/me?view=personal')}>
                         Get Started <ArrowRight size={16} />
                       </button>
                    </div>
                  ) : !isScorable ? (
                    <div className="bento-hero-score">
                      <div className="bento-hero-score__label" style={{ color: 'var(--clay)' }}>Unlock Your Score</div>
                      <h2 className="bento-hero-score__title">Welcome,<br /><span style={{ color: 'var(--clay)' }}>{firstName}</span></h2>
                      <p className="bento-hero-score__desc">Make your first rent payment to start boosting your credibility standing.</p>
                      <button className="btn btn--primary bento-hero-btn" onClick={() => router.push('/dashboard/pay-rent')}>
                        Pay Rent <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="bento-hero-score">
                      <div className="bento-hero-score__label">All Payments Up to Date</div>
                      <h2 className="bento-hero-score__title">Great standing,<br /><span style={{ color: 'var(--clay)' }}>{firstName}</span></h2>
                      <p className="bento-hero-score__desc">Keep paying on time to maintain your credibility score.</p>
                      <button className="btn btn--primary bento-hero-btn" onClick={() => router.push('/dashboard/pay-rent')}>
                        Pay Rent <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bento-hero-score-widget">
                  <svg className="bento-score-svg" viewBox="0 0 100 100">
                    <circle className="bento-score-bg" cx="50" cy="50" r="45" />
                    <circle 
                      className="bento-score-fill" 
                      cx="50" cy="50" r="45" 
                      style={{ 
                        strokeDasharray: `${credPercentage * 2.83} 283`,
                        stroke: getRankColor()
                      }} 
                    />
                  </svg>
                  <div className="bento-score-inner">
                    <span className="bento-score-num" style={{ color: getRankColor() }}>{credScore}</span>
                    <span className="bento-score-lbl">UPWARD SCORE</span>
                  </div>
                  <div className="bento-score-rank" style={{ borderColor: getRankColor() }}>
                    <span className="bento-score-rank-letter" style={{ color: getRankColor() }}>{rank}</span>
                    <span className="bento-score-rank-band">{band.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* CELL 2: Reliability Rating */}
          <div className="bento-cell bento-cell--metric">
            <div className="bento-metric">
              <div className="bento-metric__icon bento-metric__icon--clay">
                <ShieldCheck size={20} />
              </div>
              <div className="bento-metric__pct">{onTime}%</div>
              <div className="bento-metric__title">Reliability Rating</div>
              <div className="bento-metric__desc">Based on on-time payments</div>
              <div className="bento-metric__bar">
                <div className="bento-metric__bar-fill" style={{ width: `${onTime}%`, background: 'var(--clay)' }} />
              </div>
              <button className="bento-metric__link" onClick={() => router.push('/dashboard/pay-rent')}>
                Boost Your Score <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* CELL 3: Profile Completion */}
          <div className="bento-cell bento-cell--metric">
            <div className="bento-metric">
              <div className="bento-metric__icon bento-metric__icon--green">
                <Zap size={20} />
              </div>
              <div className="bento-metric__pct" style={{ color: profileCompletion >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                {profileCompletion}%
              </div>
              <div className="bento-metric__title">Profile Completion</div>
              <div className="bento-metric__desc">Verify identity for better rates</div>
              <div className="bento-metric__bar">
                <div className="bento-metric__bar-fill" style={{ width: `${profileCompletion}%`, background: 'var(--success)' }} />
              </div>
              <button className="bento-metric__link" style={{ color: 'var(--success)' }} onClick={() => router.push('/dashboard/me?view=personal')}>
                Complete Profile <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* CELL 4: Recent Activity */}
          <div className="bento-cell bento-cell--activity">
            <div className="bento-section-header">
              <div className="bento-section-header__left">
                <Receipt size={15} className="bento-section-header__icon" />
                <h3 className="bento-section-header__title">Recent Activity</h3>
              </div>
              <button className="bento-see-all" onClick={() => router.push('/dashboard/transactions')}>
                View All <ArrowRight size={13} />
              </button>
            </div>
            <div className="bento-activity-list">
              {recentThree.length === 0 ? (
                <div className="bento-empty">No transactions yet</div>
              ) : (
                recentThree.map((tx: any) => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <div
                      key={tx.uuid}
                      className="bento-tx-item"
                      onClick={() => router.push(`/dashboard/receipts?id=${tx.uuid}`)}
                    >
                      <div className={`bento-tx-item__icon ${isCredit ? 'bento-tx-item__icon--credit' : 'bento-tx-item__icon--debit'}`}>
                        {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div className="bento-tx-item__info">
                        <span className="bento-tx-item__name">{tx.company_name}</span>
                        <span className="bento-tx-item__meta">{tx.channel || 'Paystack'} · {formatTime(tx.paid_at)}</span>
                      </div>
                      <span className={`bento-tx-item__amount ${isCredit ? 'bento-tx-item__amount--credit' : ''}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* CELL 5: Streak Stat */}
          <div className="bento-cell bento-cell--streak">
            <div className="bento-streak">
              <Flame size={28} className={streak > 0 ? 'bento-streak__icon--active' : 'bento-streak__icon--muted'} />
              <div className="bento-streak__num">{streak}</div>
              <div className="bento-streak__label">Payment Streak</div>
              <div className="bento-streak__sub">Consecutive on-time payments</div>
            </div>
          </div>

          {/* CELL 6: App Install Banner (Fixed on desktop) */}
          <div className="bento-cell bento-cell--app">
            <div className="bento-app-banner">
              <div className="bento-app-banner__icon">
                <Smartphone size={22} />
              </div>
              <h4 className="bento-app-banner__title">Get the Upward App</h4>
              <p className="bento-app-banner__desc">Manage your lease and build credit on the go. Available for iOS and Android.</p>
              <div className="bento-app-banner__btns">
                <button className="bento-app-btn">App Store<br /><strong>Download</strong></button>
                <button className="bento-app-btn">Play Store<br /><strong>Download</strong></button>
              </div>
            </div>
          </div>

          {/* CELL 7: Upcoming Features */}
          <div className="bento-cell bento-cell--upcoming">
            <UpcomingFeaturesWidget />
          </div>

          {/* CELL 8: Share Credibility */}
          <div className="bento-cell bento-cell--share">
            <ShareCredibility profileSlug={user.profileSlug} />
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Show/hide zones */
        .dash-mobile { display: block; }
        .dash-desktop { display: none; }

        @media (min-width: 1024px) {
          .dash-mobile { display: none; }
          .dash-desktop { display: block; }
        }

        /* ── BENTO GRID ── */
        .bento-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr 1fr;
          grid-template-rows: auto auto auto;
          gap: 16px;
          width: 100%;
        }

        /* Cell base */
        .bento-cell {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }

        .bento-cell:hover {
          border-color: rgba(217, 119, 87, 0.25);
        }

        /* Grid placement */
        .bento-cell--hero {
          grid-column: 1;
          grid-row: 1 / 3;
          background: var(--surface);
          position: relative;
          min-height: 360px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 2rem;
          overflow: hidden;
        }


        .bento-hero-main {
          margin-top: auto;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .bento-hero-date-hl {
          border-bottom: 2px dashed rgba(255,255,255,0.4);
          padding-bottom: 2px;
          font-weight: 700;
        }

        .bento-hero-nav-btn--beam {
          animation: navBeam 1.5s infinite;
          background: white !important;
          color: var(--error) !important;
          box-shadow: 0 0 20px rgba(255,255,255,0.8);
          border-color: white !important;
        }

        @keyframes navBeam {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.8; }
        }

        .bento-cell--metric {
          grid-row: span 1;
          padding: 1.5rem;
          background: var(--surface);
        }

        .bento-cell--activity {
          grid-column: 1;
          grid-row: 3;
          padding: 1.5rem;
          background: var(--surface);
        }

        .bento-cell--streak {
          grid-column: 2;
          grid-row: 2;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bento-cell--app {
          grid-column: 3;
          grid-row: 2;
          background: var(--surface);
          border-color: var(--border-solid);
        }

        .bento-cell--upcoming {
          grid-column: 2;
          grid-row: 3;
        }

        .bento-cell--share {
          grid-column: 3;
          grid-row: 3;
          background: var(--surface);
          padding: 0;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
        }

        .bento-cell--share :global(.share-cred) {
          border: none;
          background: transparent;
          margin: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-radius: 0;
          padding: 2rem;
        }

        .bento-cell--share :global(.share-cred__badge) {
          margin-bottom: 24px;
        }

        .bento-cell--share :global(.share-cred__title) {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 12px;
          line-height: 1.2;
        }

        .bento-cell--share :global(.share-cred__desc) {
          font-size: 0.9rem;
          margin-bottom: 24px;
          max-width: 90%;
        }

        /* ── Hero Cell ── */
        .bento-hero-pending,
        .bento-hero-score {
          position: relative;
          z-index: 2;
        }

        .bento-cell--hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, var(--surface) 0%, var(--surface2) 100%);
          border-radius: 24px;
          z-index: 0;
        }

        /* Pending (non-overdue) hero — amber/clay attention treatment */
        .bento-cell--hero.has-pending:not(.is-overdue) {
          background: linear-gradient(155deg, #fffbeb 0%, #fef3c7 40%, var(--bg) 100%);
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.15), 0 8px 32px rgba(245, 158, 11, 0.12);
          animation: pendingBeam 2.5s ease-in-out infinite;
        }

        /* Dark mode pending */
        @media (prefers-color-scheme: dark) {
          .bento-cell--hero.has-pending:not(.is-overdue) {
            background: linear-gradient(155deg, #1c1400 0%, #241a00 40%, var(--bg) 100%);
            border-color: rgba(245, 158, 11, 0.4);
            box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2), 0 8px 32px rgba(245, 158, 11, 0.1);
          }
        }

        .bento-cell--hero.has-pending:not(.is-overdue)::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(245, 158, 11, 0.08) 50%,
            transparent 100%
          );
          animation: pendingShimmer 2.5s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }

        /* Overdue stays red */
        .bento-cell--hero.is-overdue {
          background: var(--error);
          border-color: rgba(239, 68, 68, 0.3);
          animation: alertBeamRed 2s ease-in-out infinite;
        }

        .bento-cell--hero.is-overdue::before {
          background: linear-gradient(165deg, #991b1b 0%, #ef4444 80%);
        }

        @keyframes pendingBeam {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.15), 0 8px 24px rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.3);
          }
          50% {
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3), 0 12px 40px rgba(245, 158, 11, 0.22);
            border-color: rgba(245, 158, 11, 0.55);
          }
        }

        @keyframes pendingShimmer {
          0% { left: -60%; }
          100% { left: 160%; }
        }

        /* Badge turns amber for pending */
        .bento-cell--hero.has-pending:not(.is-overdue) .bento-hero-pending__badge {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
        }

        .bento-cell--hero.has-pending:not(.is-overdue) .bento-hero-pending__accent {
          color: #d97706;
        }

        .bento-cell--hero.has-pending:not(.is-overdue) .bento-hero-pending__amount {
          color: #92400e;
        }

        @media (prefers-color-scheme: dark) {
          .bento-cell--hero.has-pending:not(.is-overdue) .bento-hero-pending__amount {
            color: #fcd34d;
          }
          .bento-cell--hero.has-pending:not(.is-overdue) .bento-hero-pending__accent {
            color: #fbbf24;
          }
        }

        .bento-cell--hero.is-overdue .bento-hero-pending__title,
        .bento-cell--hero.is-overdue .bento-hero-pending__desc,
        .bento-cell--hero.is-overdue .bento-hero-pending__amount,
        .bento-cell--hero.is-overdue .bento-hero-pending__total {
          color: white;
        }
        
        .bento-cell--hero.is-overdue .bento-hero-pending__accent {
          color: #fee2e2;
        }
        
        .bento-cell--hero.is-overdue .bento-hero-pending__badge {
          background: white;
          color: var(--error);
        }
        
        .bento-cell--hero.is-overdue .bento-hero-pending__badge-dot {
          background: var(--error);
        }
        
        .bento-cell--hero.is-overdue .btn--primary {
          background: white;
          color: var(--error);
          box-shadow: 0 10px 24px rgba(0,0,0,0.15);
        }

        .bento-hero-pending__badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--clay);
          color: white;
          font-size: 11px;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 100px;
          letter-spacing: 0.03em;
        }

        .bento-hero-pending__top {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
          margin-bottom: 2rem;
          position: relative;
          z-index: 10;
        }

        .bento-hero-main {
          margin-top: auto;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          position: relative;
          z-index: 2;
        }

        .bento-hero-date-hl {
          border-bottom: 2px dashed rgba(255,255,255,0.4);
          padding-bottom: 2px;
          font-weight: 700;
        }

        .bento-hero-nav-btn--beam {
          animation: navBeam 1.5s infinite;
          background: white !important;
          color: var(--error) !important;
          box-shadow: 0 0 20px rgba(255,255,255,0.8);
          border-color: white !important;
        }

        @keyframes navBeam {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.8; }
        }

        .bento-hero-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--surface);
          padding: 4px 8px;
          border-radius: 100px;
          border: 1px solid var(--border-solid);
        }

        .bento-hero-nav-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .bento-hero-nav-btn:hover {
          color: var(--clay);
        }

        .bento-hero-nav-info {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          min-width: 30px;
          text-align: center;
        }

        .bento-hero-pending__badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
          animation: pulseDot 1.5s ease-in-out infinite;
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        .bento-hero-pending__title {
          font-size: 2rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1.1;
          margin: 0 0 0.75rem;
          letter-spacing: -0.03em;
        }

        .bento-hero-pending__accent {
          color: var(--clay);
        }
        
        .bento-hero-pending__amount {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .bento-hero-pending__total {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          opacity: 0.6;
        }

        .bento-hero-pending__desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 1.5rem;
          max-width: 300px;
        }

        .bento-hero-score__label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--success);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .bento-hero-score__title {
          font-size: 2rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1.1;
          margin: 0 0 0.75rem;
          letter-spacing: -0.03em;
        }

        .bento-hero-score__desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          max-width: 280px;
        }

        .bento-hero-pending__actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .bento-hero-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
        }

        /* Score widget top-right of hero */
        .bento-hero-score-widget {
          position: absolute;
          top: 1.75rem;
          right: 1.75rem;
          width: 130px;
          height: 130px;
          z-index: 3;
        }

        .bento-score-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .bento-score-bg {
          fill: none;
          stroke: var(--border-solid);
          stroke-width: 7;
        }

        .bento-score-fill {
          fill: none;
          stroke-width: 7;
          stroke-linecap: round;
          transition: stroke-dasharray 1.2s ease;
        }

        .bento-score-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }

        .bento-score-num {
          display: block;
          font-size: 1.75rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1;
        }

        .bento-score-lbl {
          display: block;
          font-size: 0.45rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          margin-top: 2px;
        }

        .bento-score-rank {
          position: absolute;
          bottom: -4px;
          right: -4px;
          min-width: 44px;
          height: 44px;
          padding: 4px 6px;
          background: var(--bg);
          border: 2px solid;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 4;
        }

        .bento-score-rank-letter {
          font-size: 1.1rem;
          font-weight: 900;
          line-height: 1;
        }

        .bento-score-rank-band {
          font-size: 0.35rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        /* ── Metric Cells ── */
        .bento-metric__icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .bento-metric__icon--clay {
          background: var(--clay-faint);
          color: var(--clay);
        }

        .bento-metric__icon--green {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success, #22c55e);
        }

        .bento-metric__pct {
          font-size: 2.25rem;
          font-weight: 900;
          color: var(--clay);
          line-height: 1;
          margin-bottom: 0.35rem;
          letter-spacing: -0.03em;
        }

        .bento-metric__title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.2rem;
        }

        .bento-metric__desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .bento-metric__bar {
          height: 6px;
          background: var(--border-solid);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .bento-metric__bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease;
        }

        .bento-metric__link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--clay);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: gap 0.2s ease;
        }

        .bento-metric__link:hover {
          gap: 7px;
        }

        /* ── Activity Cell ── */
        .bento-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .bento-section-header__left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bento-section-header__icon {
          color: var(--clay);
        }

        .bento-section-header__title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .bento-see-all {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--clay);
          background: none;
          border: none;
          cursor: pointer;
          transition: gap 0.2s;
        }

        .bento-see-all:hover { gap: 7px; }

        .bento-activity-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bento-empty {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-align: center;
          padding: 1.5rem 0;
        }

        .bento-tx-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bento-tx-item:hover {
          background: var(--surface2);
        }

        .bento-tx-item__icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bento-tx-item__icon--credit {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success, #22c55e);
        }

        .bento-tx-item__icon--debit {
          background: var(--clay-faint);
          color: var(--clay);
        }

        .bento-tx-item__info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .bento-tx-item__name {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bento-tx-item__meta {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .bento-tx-item__amount {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text);
          white-space: nowrap;
        }

        .bento-tx-item__amount--credit {
          color: var(--success, #22c55e);
        }

        /* ── Streak Cell ── */
        .bento-streak {
          text-align: center;
        }

        .bento-streak__icon--active {
          color: #FF8C00;
          margin-bottom: 0.5rem;
        }

        .bento-streak__icon--muted {
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .bento-streak__num {
          font-size: 3rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1;
          margin-bottom: 0.25rem;
          letter-spacing: -0.04em;
        }

        .bento-streak__label {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.2rem;
        }

        .bento-streak__sub {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* ── App Banner Cell ── */
        .bento-app-banner {
          padding: 1.5rem;
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .bento-app-banner__icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
          margin-bottom: 1rem;
        }

        .bento-app-banner__title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 0.4rem;
        }

        .bento-app-banner__desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 1.25rem;
          flex: 1;
        }

        .bento-app-banner__btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .bento-app-btn {
          background: var(--bg);
          border: 1px solid var(--border-solid);
          color: var(--text);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 0.7rem;
          line-height: 1.5;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
        }

        .bento-app-btn strong {
          display: block;
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--clay);
        }

        .bento-app-btn:hover {
          background: var(--clay-faint);
          border-color: var(--clay);
        }

        .bento-app-banner__close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--surface2);
          border: none;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bento-app-banner__close:hover {
          background: var(--border);
          color: var(--text);
        }

        /* ── Upcoming Cell ── */
        .bento-cell--upcoming {
          padding: 0;
          overflow: hidden;
        }

        /* Fix upcoming widget to fill cell */
        .bento-cell--upcoming :global(.upcoming-widget),
        .bento-cell--upcoming :global(> *) {
          border-radius: 0;
          border: none;
          height: 100%;
        }
        /* ── 1280px wider grid ── */
        @media (min-width: 1280px) {
          .bento-grid {
            gap: 20px;
          }
          .bento-hero-pending__title,
          .bento-hero-score__title {
            font-size: 2.4rem;
          }
        }
      `}</style>
    </div>
  )
}