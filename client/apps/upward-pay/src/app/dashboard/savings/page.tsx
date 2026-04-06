'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wallet, Target, ArrowUpRight, History } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { RentSavingsCard } from '@/features/dashboard/components/RentSavingsCard'

export default function SavingsDashboardPage() {
  const router = useRouter()

  // Mock data for now - will connect to useQuery once backend handles are ready
  const walletBalance = 45000
  const [savingsGoal, _setSavingsGoal] = React.useState(500000)
  const savingsBalance = 125000

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
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <div className="dashboard__avatar">
            <Wallet size={20} />
          </div>
          <div className="dashboard__header-info">
            <h1 className="dashboard__greeting">Your Wallet</h1>
            <p className="dashboard__email">Manage savings & payments</p>
          </div>
        </div>
        <div className="dashboard__header-right">
          <button
            className="dashboard__icon-btn"
            onClick={() => router.push('/dashboard/savings/deposit')}
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <section className="dashboard__section">
        <div className="wallet-hero">
          <span className="wallet-hero__label">Total Balance</span>
          <h2 className="wallet-hero__balance">{formatCurrency(walletBalance, 'NGN')}</h2>
          <div className="wallet-hero__actions">
            <button
              className="btn btn--primary btn--flex"
              onClick={() => router.push('/dashboard/savings/deposit')}
            >
              <ArrowUpRight size={18} /> Deposit
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard__section">
        <div className="dashboard__section-title">
          <div className="dashboard__section-dot dashboard__section-dot--pending" />
          Active Goals
        </div>
        <RentSavingsCard
          isNewUser={false}
          savingsBalance={savingsBalance}
          savingsGoal={savingsGoal}
          autoSave={false}
          onConfigureGoal={() => router.push('/dashboard/savings/set-goal')}
        />
        {savingsGoal === 0 && (
          <div
            className="empty-goal-state"
            onClick={() => router.push('/dashboard/savings/set-goal')}
          >
            <Target size={32} className="empty-goal-state__icon" />
            <h3>No Active Goal</h3>
            <p>Set a savings goal to start building your rent credibility.</p>
            <button className="btn btn--secondary btn--sm">Set Goal</button>
          </div>
        )}
      </section>

      <section className="dashboard__section">
        <div className="dashboard__section-title">
          <div className="dashboard__section-dot dashboard__section-dot--history" />
          Recent Transactions
        </div>
        <div className="dashboard__transaction-items">
          {transactions.map((tx) => (
            <div key={tx.id} className="dashboard__transaction-item">
              <div className="dashboard__transaction-left">
                <div
                  className={`dashboard__transaction-status-dot ${tx.type === 'WALLET_DEPOSIT' ? 'dashboard--credit' : 'dashboard--debit'}`}
                />
                <div className="dashboard__transaction-info">
                  <span className="dashboard__transaction-company">
                    {tx.type === 'WALLET_DEPOSIT' ? 'Wallet Top-up' : 'Rent Payment'}
                  </span>
                  <span className="dashboard__transaction-channel">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="dashboard__transaction-right">
                <span className="dashboard__transaction-amount">
                  {formatCurrency(tx.amount, 'NGN')}
                </span>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="dashboard__empty">
              <History size={32} opacity={0.3} />
              <p>No transactions yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
