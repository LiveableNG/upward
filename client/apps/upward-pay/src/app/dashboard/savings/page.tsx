'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, History, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RentSavingsCard } from '@/features/dashboard/components/RentSavingsCard'
import {
  MAX_SAVINGS_GOALS,
  normalizeSavingsGoal,
  setGoalPath,
} from '@/features/dashboard/utils/savingsGoals'

export default function SavingsDashboardPage() {
  const router = useRouter()

  const { data: savingsGoals } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => api.getSavingsGoals(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet'),
  })

  const goals = Array.isArray(savingsGoals) ? savingsGoals.map(normalizeSavingsGoal) : []
  const canAddGoal = goals.length < MAX_SAVINGS_GOALS
  const walletBalance = Number(wallet?.balance ?? wallet?.availableBalance ?? 0)

  const transactions = [
    { id: '1', type: 'WALLET_DEPOSIT', amount: 50000, status: 'SUCCESS', createdAt: new Date() },
    {
      id: '2',
      type: 'RENT',
      amount: 150000,
      status: 'SUCCESS',
      createdAt: new Date(Date.now() - 86400000),
    },
  ]

  return (
    <PayPageShell
      title="Savings"
      subtitle="Build toward rent and a home."
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <section className="savings-hero">
        <div className="savings-hero__top">
          <span className="savings-hero__label">Wallet Balance</span>
        </div>
        <p className="savings-hero__balance">{formatCurrency(walletBalance, 'NGN')}</p>
        <div className="savings-hero__actions">
          <button
            type="button"
            className="savings-hero__cta"
            onClick={() => router.push('/dashboard/savings/deposit')}
          >
            <ArrowUpRight size={18} />
            Add funds
          </button>
        </div>
      </section>

      <section className="savings-page__section">
        <div className="savings-page__section-head">
          <h2 className="savings-page__section-title">Active Goals</h2>
          {canAddGoal ? (
            <button
              type="button"
              className="savings-page__section-link"
              onClick={() => router.push(setGoalPath())}
            >
              Set goal
            </button>
          ) : null}
        </div>

        {goals.length === 0 ? (
          <div className="savings-empty">
            <div className="savings-empty__icon">
              <Target size={28} />
            </div>
            <h3 className="savings-empty__title">No active goal</h3>
            <p className="savings-empty__text">
              Set a savings goal to start building your rent credibility.
            </p>
            <button
              type="button"
              className="pay-flow__cta"
              onClick={() => router.push(setGoalPath())}
            >
              Set a goal
            </button>
          </div>
        ) : (
          <div className="savings-goal-card-list">
            {goals.map((goal) => (
              <RentSavingsCard
                key={goal.id}
                name={goal.name}
                savingsBalance={goal.current}
                savingsGoal={goal.target}
                progressPct={goal.pct}
                isHome={goal.isHome}
                autoSave={goal.autoSave}
                onConfigureGoal={() => router.push(setGoalPath(goal.goalType))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="savings-page__section">
        <div className="savings-page__section-head">
          <h2 className="savings-page__section-title">Recent Transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="savings-tx-empty">
            <History size={28} className="savings-tx-empty__icon" />
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="savings-tx-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="savings-tx">
                <div className="savings-tx__left">
                  <span
                    className={`savings-tx__dot ${
                      tx.type === 'WALLET_DEPOSIT' ? 'savings-tx__dot--credit' : 'savings-tx__dot--debit'
                    }`}
                  />
                  <div>
                    <div className="savings-tx__title">
                      {tx.type === 'WALLET_DEPOSIT' ? 'Wallet top-up' : 'Rent payment'}
                    </div>
                    <div className="savings-tx__meta">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className="savings-tx__amount">{formatCurrency(tx.amount, 'NGN')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </PayPageShell>
  )
}
