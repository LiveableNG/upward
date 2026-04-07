'use client'

import { Target, TrendingUp, ChevronRight, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface RentSavingsCardProps {
  isNewUser: boolean
  savingsBalance: number
  savingsGoal: number
  autoSave: boolean
  onConfigureGoal: () => void
}

export function RentSavingsCard({
  isNewUser,
  savingsBalance,
  savingsGoal,
  autoSave,
  onConfigureGoal,
}: RentSavingsCardProps) {
  const router = useRouter()
  const progress = savingsGoal > 0 ? (savingsBalance / savingsGoal) * 100 : 0

  return (
    <section className="dashboard__card rent-savings-card">
      <div className="rent-savings-card__header">
        <div className="rent-savings-card__icon">
          <Target size={18} color="var(--clay)" />
        </div>
        <div className="rent-savings-card__title-wrap">
          <h3 className="rent-savings-card__title">Rent Savings</h3>
          <span className="rent-savings-card__subtitle">
            {autoSave ? 'Auto-save is active' : 'Plan for next rent'}
          </span>
        </div>
        <div className="rent-savings-card__header-actions">
          <button
            className="rent-savings-card__deposit-btn"
            onClick={() => router.push('/dashboard/savings/deposit')}
          >
            <Plus size={14} /> Deposit
          </button>
          <button
            className="rent-savings-card__config"
            onClick={() => router.push('/dashboard/savings/set-goal')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="rent-savings-card__balance-row">
        <div className="rent-savings-card__balance">
          <span className="rent-savings-card__label">Balance</span>
          <p className="rent-savings-card__amount">{formatCurrency(savingsBalance, 'NGN')}</p>
        </div>
        <div className="rent-savings-card__goal">
          <span className="rent-savings-card__label">Goal</span>
          <p className="rent-savings-card__goal-amount">
            {savingsGoal > 0 ? formatCurrency(savingsGoal, 'NGN') : 'Not set'}
          </p>
        </div>
      </div>

      <div className="rent-savings-card__progress-wrap">
        <div className="rent-savings-card__progress-bar">
          <div
            className="rent-savings-card__progress-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="rent-savings-card__progress-text">
          <span>{Math.round(progress)}% of goal reached</span>
          {savingsGoal > 0 ? (
            <span
              className="dashboard__email"
              onClick={onConfigureGoal}
              style={{ cursor: 'pointer' }}
            >
              Edit Your Goal
            </span>
          ) : (
            <span
              
              onClick={onConfigureGoal}
              style={{ cursor: 'pointer', color: 'var(--clay)'}}
            >
              Set a goal
            </span>
          )}
        </div>
      </div>

      {!autoSave && !isNewUser && (
        <div className="rent-savings-card__nudge" onClick={onConfigureGoal}>
          <TrendingUp size={14} />
          <span>Enable auto-save to reach your goal faster</span>
        </div>
      )}
    </section>
  )
}
