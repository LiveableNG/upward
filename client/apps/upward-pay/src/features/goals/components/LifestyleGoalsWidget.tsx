'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Target, ArrowRight, CheckCircle2, ShoppingBag } from 'lucide-react'
import { useUserGoals } from '../hooks/useGoals'
import { getGoalTitle } from '../types/goals.types'
import '../styles/goals.css'

export const LifestyleGoalsWidget: React.FC = () => {
  const router = useRouter()
  const { data: userGoals = [], isLoading } = useUserGoals()

  const activeGoals = userGoals.filter((ug) => ug.status === 'ACTIVE')

  if (isLoading) {
    return (
      <div className="lifestyle-goals-widget animate-pulse">
        <div
          style={{
            height: '64px',
            background: 'var(--surface2)',
            borderRadius: 'var(--radius-md)',
          }}
        />
      </div>
    )
  }

  if (activeGoals.length === 0) {
    return (
      <div className="lifestyle-goals-widget">
        <div className="lifestyle-goals-widget__header">
          <span className="lifestyle-goals-widget__badge">
            <ShoppingBag size={12} />
            <span>Lifestyle & Perks</span>
          </span>
          <button
            type="button"
            className="lifestyle-goals-widget__link"
            onClick={() => router.push('/dashboard/lifestyle')}
          >
            <span>Browse Catalog</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <h3 className="lifestyle-goals-widget__title">
          Tailor your home & lifestyle services
        </h3>
        <p className="lifestyle-goals-widget__desc">
          Select your current priorities—like home setup, cleaning, or moving—to
          unlock matched bundles from verified merchants.
        </p>

        <button
          type="button"
          className="lifestyle-goals-widget__cta-btn"
          onClick={() => router.push('/dashboard/lifestyle?goals=open')}
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
          onClick={() => router.push('/dashboard/lifestyle?goals=open')}
        >
          <span>Edit Goals</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="lifestyle-goals-widget__list">
        {activeGoals.map((ug) => (
          <button
            key={ug.id}
            type="button"
            className="lifestyle-goals-widget__chip lifestyle-goals-widget__chip--interactive"
            onClick={() => router.push(`/dashboard/lifestyle?goalId=${ug.goalId}`)}
            title="View curated perks for this goal"
          >
            <CheckCircle2 size={13} color="var(--clay)" />
            <span>{getGoalTitle(ug.goal) || `Goal #${ug.goalId}`}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="lifestyle-goals-widget__cta-btn lifestyle-goals-widget__cta-btn--secondary"
        onClick={() => router.push('/dashboard/lifestyle')}
      >
        <ShoppingBag size={14} color="var(--clay)" />
        <span>View Tailored Perks & Services</span>
        <ArrowRight size={14} />
      </button>
    </div>
  )
}
