'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface GoalItem {
  id: string
  title: string
  subtitle: string
  pct: number
  cat?: string
  isCustom?: boolean
  customIndex?: number
}

function renderGoalRing(pct: number, size = 42) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const filled = circ * (Math.min(100, Math.max(0, pct)) / 100)
  const isFilled = pct > 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ede8e2"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFilled ? 'var(--clay, #c2501f)' : '#ede8e2'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: '10px',
          fontWeight: 800,
          color: 'var(--text, #111)',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

export function AllGoalsScreen() {
  const router = useRouter()

  const goals: GoalItem[] = [
    {
      id: 'career',
      title: 'Career & professional',
      subtitle: 'Tell us what you want to achieve',
      pct: 0,
      cat: 'career',
    },
    {
      id: 'income',
      title: 'Income',
      subtitle: 'Grow your income',
      pct: 0,
      cat: 'income',
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      subtitle: '0% progress',
      pct: 0,
      cat: 'lifestyle',
    },
    {
      id: 'skill',
      title: '📚 Learn a skill',
      subtitle: 'Career & professional · 6 months',
      pct: 100,
      isCustom: true,
      customIndex: 0,
    },
    {
      id: 'biz',
      title: '💼 Start a business',
      subtitle: 'Income · ₦0 of ₦2,300,000',
      pct: 0,
      isCustom: true,
      customIndex: 1,
    },
  ]

  const handleGoalClick = (item: GoalItem) => {
    if (item.isCustom) {
      router.push(`/dashboard/goals-mockup?screen=custom-detail&id=${item.customIndex ?? 0}`)
    } else if (item.cat) {
      router.push(`/dashboard/goals-mockup?screen=questionnaire&cat=${item.cat}`)
    } else {
      router.push('/dashboard/goals-mockup')
    }
  }

  return (
    <div className="all-goals-page">
      <div className="all-goals-page__topbar">
        <button
          type="button"
          className="all-goals-page__back-btn"
          onClick={() => router.push('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <h1 className="all-goals-page__title">More you can work toward</h1>
      </div>

      <p className="all-goals-page__subhead">
        Housing is already on your home screen. Pick another area, or create your own.
      </p>

      <div className="all-goals-page__list">
        {goals.map((item) => (
          <button
            key={item.id}
            type="button"
            className="all-goals-page__card"
            onClick={() => handleGoalClick(item)}
          >
            <div className="all-goals-page__card-body">
              <h2 className="all-goals-page__card-title">{item.title}</h2>
              <p className="all-goals-page__card-desc">{item.subtitle}</p>
            </div>
            {renderGoalRing(item.pct, 42)}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="all-goals-page__new-btn"
        onClick={() => router.push('/dashboard/goals-mockup?screen=custom-goal')}
      >
        + New goal
      </button>
    </div>
  )
}

