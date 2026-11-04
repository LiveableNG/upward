'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Target, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { useUserGoals } from '../hooks/useGoals'
import '../styles/goals.css'

export const LifestyleGoalsWidget: React.FC = () => {
  const router = useRouter()
  const { data: userGoals = [], isLoading } = useUserGoals()

  const activeGoals = userGoals.filter((ug) => ug.status === 'ACTIVE')

  if (isLoading) {
    return (
      <div className="lifestyle-goals-widget">
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading goals...</span>
        </div>
      </div>
    )
  }

  if (activeGoals.length === 0) {
    return (
      <div className="lifestyle-goals-widget">
        <div className="lifestyle-goals-widget__header">
          <span className="lifestyle-goals-widget__badge">
            <Sparkles size={12} />
            <span>Lifestyle & Personal</span>
          </span>
          <button
            type="button"
            className="lifestyle-goals-widget__link"
            onClick={() => router.push('/dashboard/goals')}
          >
            <span>Set Goals</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <h3 className="lifestyle-goals-widget__title">What are your goals this year?</h3>
        <p className="lifestyle-goals-widget__desc">
          Select personal aspirations like redecorating, fitness, or career upgrades to receive
          tailored product bundles and exclusive tenant perks.
        </p>

        <button
          type="button"
          className="lifestyle-goals-widget__cta-btn"
          onClick={() => router.push('/dashboard/goals')}
        >
          <Target size={15} />
          <span>Choose Your Goals</span>
        </button>
      </div>
    )
  }

  return (
    <div className="lifestyle-goals-widget">
      <div className="lifestyle-goals-widget__header">
        <span className="lifestyle-goals-widget__badge">
          <Target size={12} />
          <span>Active Goals ({activeGoals.length})</span>
        </span>
        <button
          type="button"
          className="lifestyle-goals-widget__link"
          onClick={() => router.push('/dashboard/goals')}
        >
          <span>Manage</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <h3 className="lifestyle-goals-widget__title">Your Lifestyle Aspirations</h3>
      <div className="lifestyle-goals-widget__list">
        {activeGoals.map((ug) => (
          <span key={ug.id} className="lifestyle-goals-widget__chip">
            <CheckCircle2 size={13} color="var(--clay)" />
            <span>{ug.goal?.name || `Goal #${ug.goalId}`}</span>
          </span>
        ))}
      </div>

      <button
        type="button"
        className="lifestyle-goals-widget__cta-btn"
        onClick={() => router.push('/dashboard/goals')}
        style={{
          background: 'var(--surface2)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        }}
      >
        <span>Explore Bundles & Update Goals</span>
        <ArrowRight size={14} />
      </button>
    </div>
  )
}
