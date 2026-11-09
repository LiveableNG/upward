'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Target, ArrowRight, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'
import { useUserGoals, useGoalCategories } from '../hooks/useGoals'
import { useRentVault } from '@/features/savings/hooks/useRentSavings'
import { getGoalTitle } from '../types/goals.types'
import { formatCurrency } from '@/lib/utils'
import '../styles/goals.css'

export const LifestyleGoalsWidget: React.FC = () => {
  const router = useRouter()
  const { data: userGoals = [], isLoading: isLoadingUserGoals } = useUserGoals()
  const { data: categories = [], isLoading: isLoadingCategories } = useGoalCategories()
  const { data: vault, isLoading: isLoadingVault } = useRentVault()

  const isLoading = isLoadingUserGoals || isLoadingCategories || isLoadingVault

  const totalGoalsAvailable = categories.reduce((acc, cat) => acc + (cat.goals?.length || 0), 0)
  const activeGoals = userGoals.filter((ug) => ug.status === 'ACTIVE')
  const hasVault = !!(vault && vault.vault_id)

  if (isLoading) {
    return (
      <div className="lifestyle-goals-widget" style={{ opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ width: 80, height: 16, background: 'var(--surface2)', borderRadius: 4 }} className="animate-pulse" />
          <div style={{ width: 64, height: 14, background: 'var(--surface2)', borderRadius: 4 }} className="animate-pulse" />
        </div>
        <div style={{ width: '55%', height: 16, background: 'var(--surface2)', borderRadius: 4, marginBottom: 8 }} className="animate-pulse" />
        <div style={{ width: '85%', height: 12, background: 'var(--surface2)', borderRadius: 4, marginBottom: 14 }} className="animate-pulse" />
        <div style={{ width: '100%', height: 36, background: 'var(--surface2)', borderRadius: 8 }} className="animate-pulse" />
      </div>
    )
  }

  // Calculate vault metrics safely
  const currentBalanceNaira = hasVault ? (vault.current_balance_kobo || 0) / 100 : 0
  const targetRentNaira = hasVault ? (vault.target_amount_kobo || 0) / 100 : 0
  const accruedYieldNaira = hasVault ? (vault.accrued_yield_kobo || 0) / 100 : 0
  const completionPct = targetRentNaira > 0
    ? Math.min(100, Math.round((currentBalanceNaira / targetRentNaira) * 100))
    : 0

  return (
    <div className="lifestyle-goals-widget">
      {/* Rent Goal Header */}
      <div className="lifestyle-goals-widget__header">
        <span className="lifestyle-goals-widget__badge">
          <ShieldCheck size={12} color="var(--clay)" />
          <span>Rent Goal</span>
        </span>
        <button
          type="button"
          className="lifestyle-goals-widget__link"
          onClick={() => router.push('/dashboard/savings')}
        >
          <span>{hasVault ? 'Manage Vault' : 'Save for Rent'}</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Rent Goal Content */}
      {hasVault ? (
        <div className="lifestyle-goals-widget__vault">
          <div className="lifestyle-goals-widget__vault-top">
            <div>
              <span className="lifestyle-goals-widget__vault-amount">
                {formatCurrency(currentBalanceNaira, 'NGN')}
              </span>
              <span className="lifestyle-goals-widget__vault-target">
                {' '}of {formatCurrency(targetRentNaira, 'NGN')}
              </span>
            </div>
            <span className="lifestyle-goals-widget__vault-pct">{completionPct}%</span>
          </div>

          <div className="lifestyle-goals-widget__track">
            <div
              className="lifestyle-goals-widget__fill"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          <div className="lifestyle-goals-widget__vault-meta">
            <span className="lifestyle-goals-widget__vault-yield">
              +{formatCurrency(accruedYieldNaira, 'NGN')} returns accrued
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              {vault.days_remaining > 0 ? `${vault.days_remaining} days left` : 'Target reached'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <h3 className="lifestyle-goals-widget__title">Save for Rent · Earn Daily Returns</h3>
          <p className="lifestyle-goals-widget__desc">
            Put money aside monthly towards your rent, earn daily returns, and get cash back when you pay on time.
          </p>
          <button
            type="button"
            className="lifestyle-goals-widget__cta-btn"
            onClick={() => router.push('/dashboard/savings')}
          >
            <span>Set Up Rent Savings Goal</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Dynamic Lifestyle Goals Section (Rendered ONLY if admin configured goals) */}
      {totalGoalsAvailable > 0 && (
        <>
          <div className="lifestyle-goals-widget__divider" />

          <div className="lifestyle-goals-widget__header">
            <span className="lifestyle-goals-widget__badge">
              <Target size={12} />
              <span>Lifestyle Priorities {activeGoals.length > 0 ? `(${activeGoals.length})` : ''}</span>
            </span>
            <button
              type="button"
              className="lifestyle-goals-widget__link"
              onClick={() => router.push('/dashboard/lifestyle?goals=open')}
            >
              <span>{activeGoals.length > 0 ? 'Edit' : 'Choose'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {activeGoals.length > 0 ? (
            <div className="lifestyle-goals-widget__list">
              {activeGoals.map((ug) => (
                <button
                  key={ug.id}
                  type="button"
                  className="lifestyle-goals-widget__chip lifestyle-goals-widget__chip--interactive"
                  onClick={() => router.push(`/dashboard/lifestyle?goalId=${ug.goalId}`)}
                  title="View matched perks for this goal"
                >
                  <CheckCircle2 size={12} color="var(--clay)" />
                  <span>{getGoalTitle(ug.goal) || `Goal #${ug.goalId}`}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="lifestyle-goals-widget__desc" style={{ marginBottom: 12 }}>
              Choose priorities to unlock curated home & lifestyle perks.
            </p>
          )}

          <button
            type="button"
            className="lifestyle-goals-widget__cta-btn lifestyle-goals-widget__cta-btn--secondary"
            onClick={() => router.push('/dashboard/lifestyle')}
          >
            <span>Explore Lifestyle Catalog</span>
            <ArrowRight size={14} />
          </button>
        </>
      )}
    </div>
  )
}
