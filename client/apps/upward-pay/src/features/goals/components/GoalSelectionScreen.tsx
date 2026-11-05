'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronLeft,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import {
  useGoalCategories,
  useUserGoals,
  useSetUserGoals,
} from '../hooks/useGoals'
import { getGoalTitle, getCategoryTitle } from '../types/goals.types'
import { getGoalIconComponent } from './LifestyleDiscoveryScreen'
import { useToast } from '@/components/common/Toast'
import '../styles/goals.css'

interface GoalSelectionScreenProps {
  mode?: 'onboarding' | 'edit'
  onComplete?: () => void
  onSkip?: () => void
  backPath?: string
}

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  mode = 'onboarding',
  onComplete,
  onSkip,
  backPath,
}) => {
  const router = useRouter()
  const { success, error: toastError } = useToast()

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    isError,
    refetch,
  } = useGoalCategories()
  const { data: userGoals = [] } = useUserGoals()
  const setGoalsMutation = useSetUserGoals()

  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<number>>(new Set())
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    if (!hasInitialized && userGoals.length > 0) {
      const activeIds = userGoals
        .filter((ug) => ug.status === 'ACTIVE')
        .map((ug) => ug.goalId)
      setSelectedGoalIds(new Set(activeIds))
      setHasInitialized(true)
    }
  }, [userGoals, hasInitialized])

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

    try {
      await setGoalsMutation.mutateAsync({ goalIds })
      success(
        mode === 'onboarding'
          ? 'Your lifestyle goals have been saved.'
          : 'Lifestyle goals updated.',
      )
      if (onComplete) {
        onComplete()
      } else {
        router.push('/dashboard/lifestyle')
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
      {/* Clean Sticky Header with Top Action */}
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

          <div className="goal-selection__top-actions">
            {mode === 'onboarding' && selectedCount === 0 && (
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
              className="goal-selection__btn-primary goal-selection__btn-primary--compact"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="loader" />
                  <span>Saving</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedCount > 0
                      ? `Save & Continue (${selectedCount})`
                      : 'Continue'}
                  </span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="goal-selection__title-group">
          <h1 className="goal-selection__title">
            {mode === 'onboarding'
              ? 'What are your priorities right now?'
              : 'Your Lifestyle Goals'}
          </h1>
          <p className="goal-selection__subtitle">
            Choose any home or personal goals so we can tailor service packages
            and verified merchant perks for your tenancy.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="goal-selection__content">
        {isCategoriesLoading && (
          <div className="goal-selection__grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="goal-selection__skeleton-card" />
            ))}
          </div>
        )}

        {isError && (
          <div className="lifestyle-discovery__error-card">
            <AlertCircle
              size={28}
              color="var(--error)"
              style={{ marginBottom: '10px' }}
            />
            <h3 className="lifestyle-discovery__empty-title">
              Unable to load goals
            </h3>
            <p className="lifestyle-discovery__empty-desc">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="lifestyle-discovery__retry-btn"
            >
              Retry
            </button>
          </div>
        )}

        {!isCategoriesLoading &&
          !isError &&
          categories.map((cat) => {
            const goals = cat.goals || []
            if (goals.length === 0) return null
            const catTitle = getCategoryTitle(cat) || 'Lifestyle'

            return (
              <section key={cat.id} className="goal-selection__category-section">
                <h2 className="goal-selection__section-title">{catTitle}</h2>

                <div className="goal-selection__grid">
                  {goals.map((goal) => {
                    const isSelected = selectedGoalIds.has(goal.id)
                    const IconComponent = getGoalIconComponent(
                      goal.iconName,
                      goal.slug || cat.slug,
                    )
                    const goalTitle =
                      getGoalTitle(goal) || goal.tagline || 'Lifestyle Goal'
                    const goalDesc = goal.tagline || goal.description

                    return (
                      <button
                        key={goal.id}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        className={`goal-card ${
                          isSelected ? 'goal-card--selected' : ''
                        }`}
                        onClick={() => toggleGoal(goal.id)}
                      >
                        <div className="goal-card__icon-box">
                          <IconComponent size={19} />
                        </div>
                        <div className="goal-card__body">
                          <div className="goal-card__name">{goalTitle}</div>
                          {goalDesc && goalDesc !== goalTitle && (
                            <div className="goal-card__desc">{goalDesc}</div>
                          )}
                        </div>
                        <div className="goal-card__checkbox">
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
      </main>
    </div>
  )
}
