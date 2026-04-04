'use client'

import { TrendingUp, Target, FileText, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RentCredibilityScoreProps {
  isNewUser: boolean
  credScore: number
  credPercentage: number
  onShowPayRent: () => void
  onShowSavingsGoal: () => void
}

export function RentCredibilityScore({
  isNewUser,
  credScore,
  credPercentage,
  onShowPayRent,
  onShowSavingsGoal,
}: RentCredibilityScoreProps) {
  const router = useRouter()

  const SUGGESTED_STEPS = [
    {
      icon: <TrendingUp size={14} color="var(--clay)" />,
      text: 'Make your first rent payment',
      action: onShowPayRent,
    },
    {
      icon: <Target size={14} color="var(--clay)" />,
      text: 'Set up an auto-savings plan',
      action: onShowSavingsGoal,
    },
    {
      icon: <FileText size={14} color="var(--clay)" />,
      text: 'Upload your lease contract',
      action: () => router.push('/dashboard/contracts'),
    },
  ]

  return (
    <section className="score-card">
      <div className="score-card__header">
        <h3 className="score-card__title">Rent Credibility Score</h3>
        <div style={{ textAlign: 'right' }}>
          {isNewUser ? (
            <span className="score-card__badge score-card__badge--empty">Not Built Yet</span>
          ) : (
            <span className="score-card__badge score-card__badge--top">Top Rated</span>
          )}
          <p className="score-card__update-text">
            {isNewUser ? 'Start building today' : 'Updated today'}
          </p>
        </div>
      </div>

      <div className="score-visual">
        <div
          className="score-gauge"
          style={{
            background: isNewUser
              ? 'conic-gradient(var(--border-solid) 0% 100%)'
              : `conic-gradient(var(--clay) 0% ${credPercentage}%, var(--border-solid) ${credPercentage}% 100%)`,
          }}
        >
          <div className="score-value">
            <span className={`score-num ${isNewUser ? 'score-num--empty' : ''}`}>
              {isNewUser ? '0' : `${credPercentage}%`}
            </span>
            <span className="score-label">{isNewUser ? 'No Score Yet' : `${credScore} Score`}</span>
          </div>
        </div>
        <div className="score-insight">
          {isNewUser ? (
            <p>
              Start building your profile — make your first{' '}
              <span className="text--clay" onClick={onShowSavingsGoal}>
                savings deposit
              </span>{' '}
              or{' '}
              <span className="text--clay" onClick={onShowPayRent}>
                rent payment
              </span>
            </p>
          ) : (
            <p>
              You are in the <span className="text--clay">top 1.2%</span> of tenants nationwide.
            </p>
          )}
        </div>
      </div>

      {!isNewUser && (
        <>
          <div className="score-breakdown">
            <div className="score-breakdown__item">
              <div className="score-breakdown__label">
                <div className="score-breakdown__dot score-breakdown__dot--clay" />
                <span>Payment Discipline</span>
              </div>
              <span className="score-breakdown__value score-breakdown__value--clay">100%</span>
            </div>
            <div className="score-breakdown__item">
              <div className="score-breakdown__label">
                <div className="score-breakdown__dot score-breakdown__dot--clay-hover" />
                <span>Lease Longevity</span>
              </div>
              <span className="score-breakdown__value">4.2 Years</span>
            </div>
            <div className="score-breakdown__item">
              <div className="score-breakdown__label">
                <div className="score-breakdown__dot score-breakdown__dot--muted" />
                <span>Housing Stability</span>
              </div>
              <span className="score-breakdown__value">High</span>
            </div>
          </div>

          <div className="achievement-list">
            <div className="achievement-item">
              <span className="achievement-item__val text--clay">12</span>
              <span className="achievement-item__label">On-time Streaks</span>
            </div>
            <div className="achievement-item">
              <span className="achievement-item__val text--clay">+24 pts</span>
              <span className="achievement-item__label">Monthly Growth</span>
            </div>
          </div>
        </>
      )}

      {isNewUser && (
        <div className="suggested-steps">
          {SUGGESTED_STEPS.map((step, i) => (
            <div key={i} className="suggested-step" onClick={step.action}>
              <div className="suggested-step__icon">{step.icon}</div>
              <span className="suggested-step__text">{step.text}</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
