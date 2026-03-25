'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type RentCreditData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'

export default function RentCreditPage() {
  const router = useRouter()
  const [credit, setCredit] = useState<RentCreditData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard/rent-credit')
      return
    }
    loadCredit()
  }, [router])

  async function loadCredit() {
    try {
      const data = await api.getMyDocuments()
      setCredit(data.rentCredit)
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 750) return '#22c55e'
    if (score >= 600) return '#f59e0b'
    if (score >= 450) return '#f97316'
    return '#ef4444'
  }

  function getGradeEmoji(grade: string): string {
    if (grade === 'Excellent') return '🏆'
    if (grade === 'Good') return '⭐'
    if (grade === 'Fair') return '📈'
    return '🌱'
  }

  if (loading) {
    return (
      <div className="subpage">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
        </div>
      </div>
    )
  }

  if (!credit) {
    return (
      <div className="subpage">
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon">📊</span>
          <p>Unable to load rent credit data.</p>
        </div>
      </div>
    )
  }

  const scorePercent = (credit.score / credit.maxScore) * 100
  const circumference = 2 * Math.PI * 90
  const offset = circumference - (scorePercent / 100) * circumference

  return (
    <div className="subpage">
      <header className="subpage__header">
        <button className="subpage__back" onClick={() => router.push('/dashboard')}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="subpage__title">Rent Credit</h1>
        <div style={{ width: 36 }} />
      </header>

      {/* Score Ring */}
      <div className="credit-score">
        <div className="credit-score__ring">
          <svg viewBox="0 0 200 200" className="credit-score__svg">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="var(--border-solid)"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={getScoreColor(credit.score)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            />
          </svg>
          <div className="credit-score__inner">
            <span className="credit-score__number">{credit.score}</span>
            <span className="credit-score__max">/ {credit.maxScore}</span>
          </div>
        </div>

        <div className="credit-score__grade" style={{ color: getScoreColor(credit.score) }}>
          {getGradeEmoji(credit.grade)} {credit.grade}
        </div>
        <p className="credit-score__desc">
          Your rent credit score reflects your payment reliability. A higher score helps you secure
          better apartments.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="credit-stats">
        <div className="credit-stat">
          <span className="credit-stat__icon">📊</span>
          <span className="credit-stat__value">{credit.totalPayments}</span>
          <span className="credit-stat__label">Payments Made</span>
        </div>
        <div className="credit-stat">
          <span className="credit-stat__icon">🔥</span>
          <span className="credit-stat__value">{credit.streak}</span>
          <span className="credit-stat__label">On-time Streak</span>
        </div>
        <div className="credit-stat">
          <span className="credit-stat__icon">⏱️</span>
          <span className="credit-stat__value">{credit.monthsTracked}mo</span>
          <span className="credit-stat__label">Tracked</span>
        </div>
        <div className="credit-stat">
          <span className="credit-stat__icon">✅</span>
          <span className="credit-stat__value">{credit.onTimeRate}%</span>
          <span className="credit-stat__label">On-time Rate</span>
        </div>
      </div>

      {/* Total Paid */}
      <div className="credit-total">
        <span className="credit-total__label">Total Verified Rent Paid</span>
        <span className="credit-total__amount">
          {formatCurrency(credit.totalAmountPaid, 'NGN')}
        </span>
      </div>

      {/* How it works */}
      <div className="credit-info">
        <h3 className="credit-info__title">How Rent Credit Works</h3>
        <div className="credit-info__list">
          <div className="credit-info__item">
            <span className="credit-info__step">1</span>
            <div>
              <strong>Pay on time</strong>
              <p>Each verified on-time payment increases your score</p>
            </div>
          </div>
          <div className="credit-info__item">
            <span className="credit-info__step">2</span>
            <div>
              <strong>Build history</strong>
              <p>Longer track records strengthen your profile</p>
            </div>
          </div>
          <div className="credit-info__item">
            <span className="credit-info__step">3</span>
            <div>
              <strong>Unlock benefits</strong>
              <p>High scores help you secure apartments faster</p>
            </div>
          </div>
        </div>
      </div>

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}
