'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  History,
  Info,
  AlertCircle,
  ShieldCheck,
  Flame,
  Target,
  Plus,
  Clock,
  Share2,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useScoreProfile } from '../services/scoreService'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { Capacitor } from '@capacitor/core'

function ScoreBreakdownSkeleton() {
  return (
    <div className="score-page score-page--loading animate-pulse" aria-hidden="true">
      <div className="score-page__hero score-page__hero--skeleton">
        <div className="score-page__gauge-skeleton" />
        <div className="score-page__hero-copy-skeleton">
          <div className="score-page__skel-line score-page__skel-line--title" />
          <div className="score-page__skel-line score-page__skel-line--body" />
          <div className="score-page__skel-line score-page__skel-line--body score-page__skel-line--short" />
        </div>
      </div>
      <div>
        <div className="score-page__skel-line score-page__skel-line--label" />
        <div className="score-page__factor-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="score-page__factor-card score-page__factor-card--skeleton">
              <div className="score-page__factor-top">
                <div className="score-page__skel-box" />
                <div className="score-page__skel-num" />
              </div>
              <div className="score-page__skel-line score-page__skel-line--sub" />
              <div className="score-page__skel-line score-page__skel-line--desc" />
            </div>
          ))}
        </div>
      </div>
      <div className="score-page__history-card score-page__history-card--skeleton">
        <div className="score-page__skel-line score-page__skel-line--title" />
        <div className="score-page__skel-line score-page__skel-line--table" />
      </div>
    </div>
  )
}

export function ScoreBreakdownScreen() {
  const router = useRouter()
  const { data: scoreProfile, isLoading } = useScoreProfile()
  const { success, error: toastError } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    const p = scoreProfile?.data?.profile
    const identifier = p?.profileSlug || p?.uuid
    if (!identifier) {
      router.push('/dashboard/kyc')
      return
    }
    const defaultWebUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const baseUrl = Capacitor.isNativePlatform()
      ? defaultWebUrl
      : typeof window !== 'undefined'
        ? window.location.origin
        : defaultWebUrl

    const url = `${baseUrl}/profile/${identifier}`

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      success('Profile link copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toastError('Failed to copy link')
    }
  }

  if (isLoading || !scoreProfile) {
    return (
      <PayPageShell title="Score Breakdown" showBack onBack={() => router.push('/dashboard')}>
        <ScoreBreakdownSkeleton />
      </PayPageShell>
    )
  }

  const {
    isScorable,
    score,
    rank,
    band,
    metrics,
    cycles = [],
    properties = [],
    profile,
    maxScore,
  } = scoreProfile.data
  const paidPaymentsCount = cycles.filter(
    (c: any) => c.status && (c.status.includes('PAID') || c.status.includes('PARTIAL')),
  ).length
  const hasVerifiedPmProperty = properties.some(
    (p: any) =>
      p.isVerified &&
      (p.isPmVerified || p.isPlatformLinked || p.pm?.isVerified || !!p.company?.platformId),
  )
  const verificationOn = profile?.verificationOn ?? true
  const isVerified =
    ((verificationOn === false || !!profile?.isIdentityVerified) &&
      paidPaymentsCount > 0 &&
      hasVerifiedPmProperty) ||
    properties.some((p: any) => p.isVerified)

  const getRankColor = () => {
    if (!isScorable || !isVerified) return '#928e89'
    if (rank === 'A') return 'var(--clay)'
    if (rank === 'B') return 'var(--success)'
    if (rank === 'C') return 'var(--info)'
    if (rank === 'D') return 'var(--warning)'
    return 'var(--error)'
  }

  const getStatusColor = (status: string) => {
    if (status === 'PAID_ON_TIME' || status === 'PAID_BEFORE_DUE') return 'var(--clay)'
    if (status === 'PAID_LATE' || status === 'PARTIAL_LATE' || status === 'MISSED')
      return 'var(--error)'
    if (status === 'PENDING') return 'var(--warning)'
    return 'var(--text-muted)'
  }

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [cycles],
  )

  // Circular gauge parameters
  const safeMaxScore = maxScore > 0 ? maxScore : 1000
  const scorePct = Math.min(100, Math.max(0, (score / safeMaxScore) * 100))
  const radius = 62
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (scorePct / 100) * circumference

  const scoreFactors = [
    {
      label: 'Payment Timeliness',
      value: `${Math.round(metrics?.ptPercentage || 0)}%`,
      icon: Clock,
      desc: 'How often you pay on or before the due date.',
    },
    {
      label: 'Payment Consistency',
      value: `${metrics?.longestStreak || 0} cycles`,
      icon: Flame,
      desc: 'Your longest continuous streak of on-time rent cycles.',
    },
    {
      label: 'Financial Discipline',
      value: `${Math.round(metrics?.discipline || 0)}%`,
      icon: Target,
      desc: 'The ratio of full payments vs partial payments.',
    },
    {
      label: 'Tenure',
      value: `${metrics?.historyYears || 0} yrs`,
      icon: History,
      desc: 'Length of your verified rent payment history.',
    },
    {
      label: 'Savings Bonus',
      value: `+${metrics?.savingsBonus || 0} pts`,
      icon: TrendingUp,
      desc: 'Bonus points awarded for your rent preparation savings.',
      highlight: true,
    },
  ]

  const renderImpact = (cycle: any) => {
    if (cycle.excluded) {
      return (
        <span className="score-page__impact score-page__impact--neutral">
          <Info size={13} />
          <span>No Impact</span>
        </span>
      )
    }
    if (cycle.status === 'PAID_ON_TIME') {
      return (
        <span className="score-page__impact score-page__impact--positive">
          <TrendingUp size={13} />
          <span>Positive</span>
        </span>
      )
    }
    if (cycle.status === 'PARTIAL_ON_TIME') {
      return (
        <span className="score-page__impact score-page__impact--neutral">
          <History size={13} />
          <span>Neutral</span>
        </span>
      )
    }
    if (
      cycle.status === 'PAID_LATE' ||
      cycle.status === 'PARTIAL_LATE' ||
      cycle.status === 'MISSED'
    ) {
      return (
        <span className="score-page__impact score-page__impact--negative">
          <AlertCircle size={13} />
          <span>Negative</span>
        </span>
      )
    }
    if (cycle.ptValue >= 0.85) {
      return (
        <span className="score-page__impact score-page__impact--positive">
          <TrendingUp size={13} />
          <span>Positive</span>
        </span>
      )
    }
    if (cycle.ptValue > 0) {
      return (
        <span className="score-page__impact score-page__impact--neutral">
          <History size={13} />
          <span>Neutral</span>
        </span>
      )
    }
    return (
      <span className="score-page__impact score-page__impact--negative">
        <AlertCircle size={13} />
        <span>Negative</span>
      </span>
    )
  }

  return (
    <PayPageShell
      title="Score Breakdown"
      subtitle="How your payment behavior shapes your rent credibility score."
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <div className="score-page">
        {/* Hero Glass Card with Apple-style Ring Gauge */}
        <section className="score-page__hero">
          <div
            className="score-page__gauge-wrap"
            style={{ '--rank-color': getRankColor() } as React.CSSProperties}
          >
            <div className="score-page__gauge">
              <svg className="score-page__gauge-svg" viewBox="0 0 148 148" width="148" height="148">
                <defs>
                  <linearGradient id="scoreRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--clay)" />
                    <stop offset="100%" stopColor="#f08c69" />
                  </linearGradient>
                </defs>
                {/* Background Ring */}
                <circle
                  cx="74"
                  cy="74"
                  r={radius}
                  className="score-page__gauge-track"
                  strokeWidth="9"
                  fill="none"
                />
                {/* Foreground Animated Ring */}
                <circle
                  cx="74"
                  cy="74"
                  r={radius}
                  className="score-page__gauge-arc"
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                  stroke={isVerified && isScorable ? 'url(#scoreRingGrad)' : 'var(--rank-color)'}
                  strokeDasharray={circumference}
                  strokeDashoffset={isScorable ? strokeDashoffset : circumference}
                  transform="rotate(-90 74 74)"
                />
              </svg>

              <div className="score-page__gauge-content">
                <span className="score-page__score">{score}</span>
                <span className="score-page__score-label">
                  {isVerified ? 'Upward Score' : 'Potential Score'}
                </span>
                <span className="score-page__score-max">/ {safeMaxScore}</span>
              </div>
            </div>

            <div className="score-page__rank-pill">
              <div className="score-page__rank-dot" />
              <strong>{rank || '—'}</strong>
              <span>{band ? band.toUpperCase() : 'NOT SCORABLE'}</span>
            </div>
          </div>

          <div className="score-page__hero-copy">
            <div className="score-page__hero-copy-head">
              <div>
                <h2>How your score works</h2>
                <p className="score-page__hero-sub">Algorithmically verified rent credibility</p>
              </div>
              <button
                type="button"
                className="score-page__share-btn"
                onClick={handleCopyLink}
                aria-label="Share public score link"
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copied ? 'Copied!' : 'Share Score'}</span>
              </button>
            </div>

            {!isVerified && (
              <div className="score-page__notice">
                <div className="score-page__notice-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="score-page__notice-text">
                  <strong>Verification Needed</strong>
                  <span>
                    Connect with an Upward partner landlord to verify records and activate your live
                    score.
                  </span>
                </div>
              </div>
            )}

            <p className="score-page__hero-desc">
              Your score reflects payment timeliness, streak consistency, financial discipline,
              tenure history, and rent preparation savings. Every recorded cycle directly improves
              this rating.
            </p>
          </div>
        </section>

        {/* Key Factors Glass Grid */}
        <section className="score-page__section">
          <div className="score-page__section-header">
            <p className="score-page__section-label">Key Factors</p>
            <span className="score-page__section-badge">5 Metrics</span>
          </div>

          <div className="score-page__factor-grid">
            {scoreFactors.map((factor, idx) => {
              const Icon = factor.icon
              return (
                <article
                  key={idx}
                  className={`score-page__factor-card${factor.highlight ? ' score-page__factor-card--highlight' : ''}`}
                >
                  <div className="score-page__factor-top">
                    <div className="score-page__factor-icon">
                      <Icon size={18} />
                    </div>
                    <span className="score-page__factor-value">{factor.value}</span>
                  </div>
                  <strong className="score-page__factor-title">{factor.label}</strong>
                  <p className="score-page__factor-desc">{factor.desc}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* Cycle History Card */}
        <section className="score-page__history-card">
          <div className="score-page__history-head">
            <div>
              <h3>Cycle History</h3>
              <p>Every logged payment affects your score in real time.</p>
            </div>
            {sortedCycles.length > 0 && (
              <span className="score-page__history-count">
                {sortedCycles.length} {sortedCycles.length === 1 ? 'Cycle' : 'Cycles'}
              </span>
            )}
          </div>

          {/* Mobile Inset Card List (Clean iOS view) */}
          <div className="score-page__cycle-list">
            {sortedCycles.length === 0 ? (
              <div className="score-page__empty-state">
                <div className="score-page__empty-icon">
                  <History size={26} />
                </div>
                <p className="score-page__empty-title">No cycle history yet</p>
                <p className="score-page__empty-desc">
                  Recorded rent payments and landlord-verified cycles will show up here
                  automatically.
                </p>
              </div>
            ) : (
              sortedCycles.map((cycle, idx) => (
                <div key={idx} className="score-page__cycle-item">
                  <div className="score-page__cycle-top-row">
                    <div className="score-page__cycle-date-block">
                      <strong>
                        {new Date(cycle.dueDate).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                      <span>
                        Due{' '}
                        {new Date(cycle.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <div className="score-page__cycle-amount-block">
                      <span className="score-page__cycle-amount">
                        {formatCurrency(cycle.amount, 'NGN')}
                      </span>
                    </div>
                  </div>

                  <div className="score-page__cycle-bottom-row">
                    <span
                      className={`score-page__source-tag score-page__source-tag--${cycle.source.toLowerCase()}`}
                    >
                      {cycle.source.replace(/_/g, ' ')}
                    </span>

                    <div className="score-page__cycle-tags">
                      <span
                        className="score-page__status-badge"
                        style={
                          { '--status-color': getStatusColor(cycle.status) } as React.CSSProperties
                        }
                      >
                        <span className="score-page__status-dot" />
                        {getStatusLabel(cycle.status)}
                      </span>
                      {renderImpact(cycle)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="score-page__table-wrap">
            <table className="score-page__table">
              <thead>
                <tr>
                  <th>Cycle Date</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {sortedCycles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="score-page__empty-row">
                      No payment history found yet.
                    </td>
                  </tr>
                ) : (
                  sortedCycles.map((cycle, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="score-page__cycle-date">
                          <strong>
                            {new Date(cycle.dueDate).toLocaleDateString('en-GB', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </strong>
                          <span>Due: {new Date(cycle.dueDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`score-page__source-tag score-page__source-tag--${cycle.source.toLowerCase()}`}
                        >
                          {cycle.source.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="score-page__td-amount">
                        {formatCurrency(cycle.amount, 'NGN')}
                      </td>
                      <td>
                        <span
                          className="score-page__status-badge"
                          style={
                            {
                              '--status-color': getStatusColor(cycle.status),
                            } as React.CSSProperties
                          }
                        >
                          <span className="score-page__status-dot" />
                          {getStatusLabel(cycle.status)}
                        </span>
                      </td>
                      <td>{renderImpact(cycle)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Missing Past Records Glass Banner */}
        <section className="score-page__records-card">
          <div className="score-page__records-info">
            <div className="score-page__records-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>Missing past records?</h3>
              <p>
                Add rent payments from previous tenancies to improve your tenure and consistency
                score.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="score-page__records-btn"
            onClick={() => router.push('/dashboard/request-records')}
          >
            <Plus size={16} />
            <span>Request Past Records</span>
            <ChevronRight size={14} className="score-page__records-arrow" />
          </button>
        </section>
      </div>
    </PayPageShell>
  )
}
