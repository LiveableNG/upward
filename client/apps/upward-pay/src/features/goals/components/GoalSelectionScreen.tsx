'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  Home,
  HeartPulse,
  Briefcase,
  Compass,
  BookOpen,
  Dumbbell,
  Sparkles,
  Car,
  Music,
  Utensils,
  Bed,
  Check,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react'
import { useGoalCategories, useUserGoals, useSetUserGoals } from '../hooks/useGoals'
import type { Goal, GoalCategory } from '../types/goals.types'
import { useToast } from '@/components/common/Toast'
import '../styles/goals.css'

interface GoalSelectionScreenProps {
  mode?: 'onboarding' | 'edit'
  onComplete?: () => void
  onSkip?: () => void
  backPath?: string
}

function getGoalIcon(iconName?: string | null, categorySlug?: string) {
  const name = (iconName || categorySlug || '').toLowerCase()
  if (name.includes('home') || name.includes('decor') || name.includes('kitchen') || name.includes('apartment')) {
    return Home
  }
  if (name.includes('fitness') || name.includes('gym') || name.includes('weight')) {
    return Dumbbell
  }
  if (name.includes('health') || name.includes('eat') || name.includes('sleep')) {
    return HeartPulse
  }
  if (name.includes('career') || name.includes('work') || name.includes('business')) {
    return Briefcase
  }
  if (name.includes('book') || name.includes('read') || name.includes('study')) {
    return BookOpen
  }
  if (name.includes('drive') || name.includes('car')) {
    return Car
  }
  if (name.includes('music') || name.includes('instrument')) {
    return Music
  }
  if (name.includes('food') || name.includes('meal')) {
    return Utensils
  }
  if (name.includes('sleep') || name.includes('bed')) {
    return Bed
  }
  if (name.includes('lifestyle') || name.includes('personal') || name.includes('dress')) {
    return Sparkles
  }
  return Target
}

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  mode = 'onboarding',
  onComplete,
  onSkip,
  backPath,
}) => {
  const router = useRouter()
  const { success, error: toastError } = useToast()

  const { data: categories = [], isLoading: isCategoriesLoading, isError, refetch } = useGoalCategories()
  const { data: userGoals = [], isLoading: isUserGoalsLoading } = useUserGoals()
  const setGoalsMutation = useSetUserGoals()

  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<number>>(new Set())
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize selected goals from existing user data
  useEffect(() => {
    if (!hasInitialized && userGoals.length > 0) {
      const activeIds = userGoals
        .filter((ug) => ug.status === 'ACTIVE')
        .map((ug) => ug.goalId)
      setSelectedGoalIds(new Set(activeIds))
      setHasInitialized(true)
    }
  }, [userGoals, hasInitialized])

  // Filter categories and goals
  const filteredCategories = useMemo(() => {
    let cats = categories

    if (activeCategorySlug !== 'ALL') {
      cats = cats.filter((c) => c.slug === activeCategorySlug)
    }

    if (!searchQuery.trim()) return cats

    const q = searchQuery.toLowerCase().trim()
    return cats
      .map((cat) => ({
        ...cat,
        goals: (cat.goals || []).filter(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            (g.description && g.description.toLowerCase().includes(q)),
        ),
      }))
      .filter((cat) => (cat.goals && cat.goals.length > 0) || cat.name.toLowerCase().includes(q))
  }, [categories, activeCategorySlug, searchQuery])

  // Total count of available goals
  const totalAvailableGoals = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.goals?.length || 0), 0)
  }, [categories])

  const toggleGoal = (goalId: number) => {
    setSelectedGoalIds((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }

  const handleSave = async () => {
    const goalIds = Array.from(selectedGoalIds)
    if (goalIds.length === 0) {
      handleSkip()
      return
    }

    try {
      await setGoalsMutation.mutateAsync({ goalIds })
      success(
        mode === 'onboarding'
          ? 'Your lifestyle goals have been tailored!'
          : 'Your lifestyle goals have been updated.',
      )
      if (onComplete) {
        onComplete()
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      toastError(err?.message || 'Failed to save goals. Please try again.')
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else if (backPath) {
      router.push(backPath)
    } else {
      router.push('/dashboard')
    }
  }

  const handleBack = () => {
    if (backPath) {
      router.push(backPath)
    } else {
      router.back()
    }
  }

  const isSaving = setGoalsMutation.isPending
  const selectedCount = selectedGoalIds.size

  return (
    <div className="goal-selection">
      {/* Top Header */}
      <header className="goal-selection__header">
        <div className="goal-selection__top-nav">
          <button
            type="button"
            className="goal-selection__back-btn"
            onClick={handleBack}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>

          {mode === 'onboarding' ? (
            <button
              type="button"
              className="goal-selection__skip-link"
              onClick={handleSkip}
            >
              Skip for now
            </button>
          ) : (
            <button
              type="button"
              className="goal-selection__skip-link"
              onClick={handleSkip}
            >
              Cancel
            </button>
          )}
        </div>

        <div className="goal-selection__title-group">
          <span className="goal-selection__badge">
            <Sparkles size={12} />
            <span>Lifestyle & Personal Goals</span>
          </span>
          <h1 className="goal-selection__title">
            {mode === 'onboarding'
              ? 'What are your goals this year?'
              : 'Manage Your Lifestyle Goals'}
          </h1>
          <p className="goal-selection__subtitle">
            Select personal aspirations so we can recommend customized service bundles,
            verified merchants, and exclusive tenant perks.
          </p>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '8px 14px',
            marginBottom: '12px',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search goals (e.g., workspace, gym, drive)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--text)',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="goal-selection__categories-scroll">
          <button
            type="button"
            className={`goal-selection__category-pill ${activeCategorySlug === 'ALL' ? 'goal-selection__category-pill--active' : ''}`}
            onClick={() => setActiveCategorySlug('ALL')}
          >
            <span>All Goals</span>
            <span className="goal-selection__category-count">{totalAvailableGoals}</span>
          </button>
          {categories.map((cat) => {
            const count = cat.goals?.length || 0
            const isActive = activeCategorySlug === cat.slug
            return (
              <button
                key={cat.id}
                type="button"
                className={`goal-selection__category-pill ${isActive ? 'goal-selection__category-pill--active' : ''}`}
                onClick={() => setActiveCategorySlug(cat.slug)}
              >
                <span>{cat.name}</span>
                <span className="goal-selection__category-count">{count}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="goal-selection__content">
        {isCategoriesLoading && (
          <div className="goal-selection__grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="goal-selection__skeleton-card" />
            ))}
          </div>
        )}

        {isError && (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
            }}
          >
            <AlertCircle size={32} color="var(--error)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Unable to load goals
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Please check your network connection and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="goal-selection__btn-primary"
              style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
            >
              Retry
            </button>
          </div>
        )}

        {!isCategoriesLoading && !isError && filteredCategories.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Compass size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No goals match your search.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setActiveCategorySlug('ALL')
              }}
              style={{
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--clay)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {!isCategoriesLoading &&
          !isError &&
          filteredCategories.map((cat) => {
            const goals = cat.goals || []
            if (goals.length === 0) return null

            return (
              <section key={cat.id} className="goal-selection__category-section">
                <div className="goal-selection__section-title">
                  <span>{cat.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {goals.length} available
                  </span>
                </div>

                <div className="goal-selection__grid">
                  {goals.map((goal) => {
                    const isSelected = selectedGoalIds.has(goal.id)
                    const IconComponent = getGoalIcon(goal.iconName, cat.slug)

                    return (
                      <div
                        key={goal.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        className={`goal-card ${isSelected ? 'goal-card--selected' : ''}`}
                        onClick={() => toggleGoal(goal.id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault()
                            toggleGoal(goal.id)
                          }
                        }}
                      >
                        <div className="goal-card__icon-box">
                          <IconComponent size={20} />
                        </div>
                        <div className="goal-card__body">
                          <div className="goal-card__name">{goal.name}</div>
                          {goal.description && (
                            <div className="goal-card__desc">{goal.description}</div>
                          )}
                        </div>
                        <div className="goal-card__checkbox">
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="goal-selection__footer">
        <div className="goal-selection__footer-info">
          <span className="goal-selection__selected-count">
            {selectedCount === 0
              ? 'No goals selected'
              : `${selectedCount} goal${selectedCount > 1 ? 's' : ''} selected`}
          </span>
          <span className="goal-selection__selected-hint">
            {selectedCount === 0
              ? 'Pick any aspirations you wish to pursue'
              : 'You can change or add more anytime'}
          </span>
        </div>

        <div className="goal-selection__footer-actions">
          {mode === 'onboarding' && (
            <button
              type="button"
              className="goal-selection__skip-link"
              onClick={handleSkip}
              disabled={isSaving}
            >
              Skip
            </button>
          )}

          <button
            type="button"
            className="goal-selection__btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="loader" />
                <span>Saving...</span>
              </>
            ) : (
              <span>
                {mode === 'onboarding'
                  ? selectedCount > 0
                    ? `Continue (${selectedCount})`
                    : 'Continue'
                  : 'Save Goals'}
              </span>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}
