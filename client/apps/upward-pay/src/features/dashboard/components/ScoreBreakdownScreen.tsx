'use client'

import React, { useMemo } from 'react'
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
} from 'lucide-react'
import { useScoreProfile } from '../services/scoreService'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency } from '@/lib/utils'
import FallbackSuspense from '@/components/FallbackSuspense'

export function ScoreBreakdownScreen() {
  const router = useRouter()
  const { data: scoreProfile, isLoading } = useScoreProfile()

  if (isLoading || !scoreProfile) {
    return (
      <PayPageShell title="Score Breakdown" showBack onBack={() => router.push('/dashboard')}>
        <FallbackSuspense />
      </PayPageShell>
    )
  }

  const { isScorable, score, rank, band, metrics, cycles, properties = [] } = scoreProfile.data
  const isVerified = properties.some((p: any) => p.isVerified)

  const getRankColor = () => {
    if (!isScorable) return 'var(--text-muted)'
    if (rank === 'A') return 'var(--clay)'
    if (rank === 'B') return 'var(--success)'
    if (rank === 'C') return 'var(--info)'
    if (rank === 'D') return 'var(--warning)'
    return 'var(--error)'
  }

  const getStatusColor = (status: string) => {
    if (status === 'PAID_ON_TIME' || status === 'PAID_BEFORE_DUE') return 'var(--clay)'
    if (status === 'PAID_LATE' || status === 'PARTIAL_LATE' || status === 'MISSED') return 'var(--error)'
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

  const scoreFactors = [
    { label: 'Payment Timeliness', value: `${Math.round(metrics.ptPercentage)}%`, icon: Clock, desc: 'How often you pay on or before the due date.' },
    { label: 'Payment Consistency', value: `${metrics.longestStreak} cycles`, icon: Flame, desc: 'Your longest continuous streak of on-time rent cycles.' },
    { label: 'Financial Discipline', value: `${Math.round(metrics.discipline)}%`, icon: Target, desc: 'The ratio of full payments vs partial payments.' },
    { label: 'Tenure', value: `${metrics.historyYears} yrs`, icon: History, desc: 'Length of your verified rent payment history.' },
    { label: 'Savings Bonus', value: `+${metrics.savingsBonus || 0} pts`, icon: TrendingUp, desc: 'Bonus points awarded for your rent preparation savings.' },
  ]

  return (
    <PayPageShell
      title="Score Breakdown"
      subtitle="How your payment behavior shapes your rent credibility score."
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <div className="score-page">
        <section className="score-page__hero">
          <div className="score-page__gauge-wrap" style={{ '--rank-color': isVerified ? getRankColor() : '#a9a096' } as React.CSSProperties}>
            <div className="score-page__gauge">
              <span className="score-page__score">{score}</span>
              <span className="score-page__score-label">{isVerified ? 'Upward Score' : 'Potential Score'}</span>
            </div>
            <div className="score-page__rank-pill">
              <strong>{rank}</strong>
              <span>{band.toUpperCase()}</span>
            </div>
          </div>

          <div className="score-page__hero-copy">
            <div className="score-page__hero-copy-head">
              <h2>How your score works</h2>
              <button
                type="button"
                className="score-page__share-btn"
                onClick={() => router.push('/dashboard/kyc')}
              >
                <Share2 size={14} />
                <span>Share Score</span>
              </button>
            </div>
            {!isVerified ? (
              <div className="score-page__notice">
                <ShieldCheck size={16} />
                <span>Connect with an Upward partner landlord to verify and activate your live score.</span>
              </div>
            ) : null}
            <p>
              Your score reflects payment timeliness, consistency, discipline, tenancy history, and rent savings habits.
              Every recorded cycle and savings deposit can improve this rating.
            </p>
          </div>
        </section>

        <section>
          <p className="score-page__section-label">Key Factors</p>
          <div className="score-page__factor-grid">
            {scoreFactors.map((factor, idx) => {
              const Icon = factor.icon
              return (
                <article key={idx} className="score-page__factor-card">
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

        <section className="score-page__history-card">
          <div className="score-page__history-head">
            <h3>Cycle History</h3>
            <p>Every logged payment affects your score in real time.</p>
          </div>

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
                        <span className={`score-page__source-tag score-page__source-tag--${cycle.source.toLowerCase()}`}>
                          {cycle.source.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{formatCurrency(cycle.amount, 'NGN')}</td>
                      <td>
                        <span
                          className="score-page__status-badge"
                          style={{ '--status-color': getStatusColor(cycle.status) } as React.CSSProperties}
                        >
                          <span className="score-page__status-dot" />
                          {getStatusLabel(cycle.status)}
                        </span>
                      </td>
                      <td>
                        <div className="score-page__impact-cell">
                          {(() => {
                            if (cycle.excluded) {
                              return (
                                <>
                                  <Info size={16} className="score-page__text-muted" />
                                  <span className="score-page__text-muted">No Impact</span>
                                </>
                              )
                            }
                            if (cycle.status === 'PAID_ON_TIME') {
                              return (
                                <>
                                  <TrendingUp size={16} className="score-page__text-clay" />
                                  <span>Positive</span>
                                </>
                              )
                            }
                            if (cycle.status === 'PARTIAL_ON_TIME') {
                              return (
                                <>
                                  <History size={16} className="score-page__text-info" />
                                  <span>Neutral</span>
                                </>
                              )
                            }
                            if (
                              cycle.status === 'PAID_LATE' ||
                              cycle.status === 'PARTIAL_LATE' ||
                              cycle.status === 'MISSED'
                            ) {
                              return (
                                <>
                                  <AlertCircle size={16} className="score-page__text-error" />
                                  <span>Negative</span>
                                </>
                              )
                            }
                            if (cycle.ptValue >= 0.85) {
                              return (
                                <>
                                  <TrendingUp size={16} className="score-page__text-clay" />
                                  <span>Positive</span>
                                </>
                              )
                            }
                            if (cycle.ptValue > 0) {
                              return (
                                <>
                                  <History size={16} className="score-page__text-info" />
                                  <span>Neutral</span>
                                </>
                              )
                            }
                            return (
                              <>
                                <AlertCircle size={16} className="score-page__text-error" />
                                <span>Negative</span>
                              </>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="score-page__records-card">
          <div>
            <h3>Missing past records?</h3>
            <p>Add payments from previous years to improve tenure and streak metrics.</p>
          </div>
          <button type="button" className="btn btn--primary score-page__records-btn" onClick={() => router.push('/dashboard/request-records')}>
            <Plus size={16} />
            <span>Request Past Records</span>
          </button>
        </section>
      </div>
    </PayPageShell>
  )
}
