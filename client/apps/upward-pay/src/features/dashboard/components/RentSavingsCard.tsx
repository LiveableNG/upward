'use client'

import { Target, TrendingUp, ChevronRight, Plus, Home } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface RentSavingsCardProps {
  name?: string
  savingsBalance: number
  savingsGoal: number
  progressPct?: number
  isHome?: boolean
  autoSave?: boolean
  onConfigureGoal: () => void
}

export function RentSavingsCard({
  name = 'Rent Savings',
  savingsBalance,
  savingsGoal,
  progressPct,
  isHome = false,
  autoSave = false,
  onConfigureGoal,
}: RentSavingsCardProps) {
  const router = useRouter()
  const progress = progressPct ?? (savingsGoal > 0 ? (savingsBalance / savingsGoal) * 100 : 0)

  return (
    <article className="savings-goal-card">
      <div className="savings-goal-card__head">
        <div className="savings-goal-card__title-wrap">
          <div className={`savings-goal-card__icon ${isHome ? 'savings-goal-card__icon--home' : ''}`}>
            {isHome ? <Home size={20} /> : <Target size={20} />}
          </div>
          <div>
            <h3 className="savings-goal-card__name">{name}</h3>
            <p className="savings-goal-card__meta">
              {autoSave ? 'Auto-save is active' : 'Plan for your next milestone'}
            </p>
          </div>
        </div>
        <div className="savings-goal-card__actions">
          <button
            type="button"
            className="savings-goal-card__btn savings-goal-card__btn--primary"
            onClick={() => router.push('/dashboard/savings/deposit')}
          >
            <Plus size={14} />
            Deposit
          </button>
          <button type="button" className="savings-goal-card__btn" onClick={onConfigureGoal} aria-label="Edit goal">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="savings-goal-card__amounts">
        <div>
          <div className="savings-goal-card__stat-label">Saved</div>
          <p className="savings-goal-card__stat-value">{formatCurrency(savingsBalance, 'NGN')}</p>
        </div>
        <div className="pay-flow__text-right">
          <div className="savings-goal-card__stat-label">Goal</div>
          <p className="savings-goal-card__stat-value">
            {savingsGoal > 0 ? formatCurrency(savingsGoal, 'NGN') : 'Not set'}
          </p>
        </div>
      </div>

      <div className="savings-goal-card__bar">
        <div
          className={`savings-goal-card__fill ${isHome ? 'savings-goal-card__fill--teal' : ''}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="savings-goal-card__progress-text">
        <span>{Math.round(progress)}% of goal reached</span>
        <button type="button" className="savings-goal-card__link" onClick={onConfigureGoal}>
          {savingsGoal > 0 ? 'Edit goal' : 'Set a goal'}
        </button>
      </div>

      {!autoSave && (
        <div className="savings-goal-card__nudge" onClick={onConfigureGoal}>
          <TrendingUp size={14} />
          <span>Enable auto-save to reach your goal faster</span>
        </div>
      )}
    </article>
  )
}
