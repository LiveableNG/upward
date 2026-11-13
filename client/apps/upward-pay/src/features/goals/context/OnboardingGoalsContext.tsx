'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  type PresentationGoal,
  type PresentationCategory,
  PRESENTATION_CATALOGUE,
} from '../data/presentationCatalogue'
import { majorToMinorString } from '../utils/monetary'

export interface OnboardingMilestone {
  id: string
  title: string
  isCompleted?: boolean
  targetDate?: string
}

export interface SelectedOnboardingGoal {
  id: string
  title: string
  categoryId: string
  categoryTitle: string
  subcategoryId?: string
  description?: string
  isCustom?: boolean
  qualification?: string
  targetDate?: string
  targetAmountMajor?: string
  targetAmountMinor?: string
  currency?: string
  notes?: string
  progressSource: 'MILESTONES' | 'TARGET_AMOUNT' | 'STATUS_ONLY' | 'MANUAL_PERCENT'
  milestones: OnboardingMilestone[]
  progressPct?: number
  comingSoon?: boolean
  supportsFinancialTarget?: boolean
}

interface OnboardingGoalsContextValue {
  selectedGoals: SelectedOnboardingGoal[]
  hasCompletedOnboarding: boolean
  hasSkippedOnboarding: boolean
  isGoalSelected: (goalId: string) => boolean
  getSelectedGoal: (goalId: string) => SelectedOnboardingGoal | undefined
  toggleCatalogueGoal: (goal: PresentationGoal, category: PresentationCategory) => void
  configureGoal: (goalId: string, config: Partial<SelectedOnboardingGoal>) => void
  addCustomGoal: (goal: {
    title: string
    description?: string
    categoryId?: string
    categoryTitle?: string
    targetDate?: string
    targetAmountMajor?: string
    currency?: string
    notes?: string
    milestones?: string[]
  }) => string
  removeGoal: (goalId: string) => void
  addMilestone: (goalId: string, title: string, targetDate?: string) => void
  toggleMilestone: (goalId: string, milestoneId: string) => void
  deleteMilestone: (goalId: string, milestoneId: string) => void
  completeOnboarding: () => void
  skipOnboarding: () => void
  resetOnboarding: () => void
}

const STORAGE_KEY = 'upward_onboarding_preview_v1'

const OnboardingGoalsContext = createContext<OnboardingGoalsContextValue | null>(null)

export function OnboardingGoalsProvider({ children }: { children: React.ReactNode }) {
  const [selectedGoals, setSelectedGoals] = useState<SelectedOnboardingGoal[]>([])
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.selectedGoals)) {
          setSelectedGoals(parsed.selectedGoals)
        }
        if (typeof parsed.hasCompletedOnboarding === 'boolean') {
          setHasCompletedOnboarding(parsed.hasCompletedOnboarding)
        }
        if (typeof parsed.hasSkippedOnboarding === 'boolean') {
          setHasSkippedOnboarding(parsed.hasSkippedOnboarding)
        }
      }
    } catch {
      // Ignore storage parse errors
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Sync to localStorage
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedGoals,
          hasCompletedOnboarding,
          hasSkippedOnboarding,
          lastUpdated: new Date().toISOString(),
        }),
      )
    } catch {
      // Ignore quota errors
    }
  }, [selectedGoals, hasCompletedOnboarding, hasSkippedOnboarding, isHydrated])

  const isGoalSelected = useCallback(
    (goalId: string) => selectedGoals.some((g) => g.id === goalId),
    [selectedGoals],
  )

  const getSelectedGoal = useCallback(
    (goalId: string) => selectedGoals.find((g) => g.id === goalId),
    [selectedGoals],
  )

  const toggleCatalogueGoal = useCallback(
    (goal: PresentationGoal, category: PresentationCategory) => {
      setSelectedGoals((prev) => {
        const exists = prev.some((g) => g.id === goal.id)
        if (exists) {
          return prev.filter((g) => g.id !== goal.id)
        }

        const initialMilestones: OnboardingMilestone[] = (goal.defaultMilestones || []).map(
          (m, idx) => ({
            id: `m-${Date.now()}-${idx}`,
            title: m,
            isCompleted: false,
          }),
        )

        const newGoal: SelectedOnboardingGoal = {
          id: goal.id,
          title: goal.title,
          categoryId: category.id,
          categoryTitle: category.title,
          subcategoryId: goal.subcategoryId,
          description: goal.description,
          isCustom: false,
          progressSource: goal.defaultProgressSource,
          milestones: initialMilestones,
          progressPct: 0,
          comingSoon: goal.comingSoon,
          supportsFinancialTarget: goal.supportsFinancialTarget,
        }

        return [...prev, newGoal]
      })
    },
    [],
  )

  const configureGoal = useCallback(
    (goalId: string, config: Partial<SelectedOnboardingGoal>) => {
      setSelectedGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g

          const updated: SelectedOnboardingGoal = {
            ...g,
            ...config,
          }

          if (config.targetAmountMajor) {
            updated.targetAmountMinor = majorToMinorString(config.targetAmountMajor)
          }

          return updated
        }),
      )
    },
    [],
  )

  const addCustomGoal = useCallback(
    (custom: {
      title: string
      description?: string
      categoryId?: string
      categoryTitle?: string
      targetDate?: string
      targetAmountMajor?: string
      currency?: string
      notes?: string
      milestones?: string[]
    }) => {
      const customId = `custom-${Date.now()}`
      const categoryId = custom.categoryId || 'personal-goals'
      const matchedCat = PRESENTATION_CATALOGUE.find((c) => c.id === categoryId)
      const categoryTitle = custom.categoryTitle || matchedCat?.title || 'Personal Goals'

      const customMilestones: OnboardingMilestone[] = (custom.milestones || [
        'Define key objectives',
        'Complete first action step',
      ]).map((m, idx) => ({
        id: `cm-${Date.now()}-${idx}`,
        title: m,
        isCompleted: false,
      }))

      const targetAmountMinor = custom.targetAmountMajor
        ? majorToMinorString(custom.targetAmountMajor)
        : undefined

      const newGoal: SelectedOnboardingGoal = {
        id: customId,
        title: custom.title.trim(),
        categoryId,
        categoryTitle,
        description: custom.description?.trim(),
        isCustom: true,
        targetDate: custom.targetDate,
        targetAmountMajor: custom.targetAmountMajor,
        targetAmountMinor,
        currency: custom.currency || 'NGN',
        notes: custom.notes?.trim(),
        progressSource: custom.targetAmountMajor ? 'TARGET_AMOUNT' : 'MILESTONES',
        milestones: customMilestones,
        progressPct: 0,
      }

      setSelectedGoals((prev) => [...prev, newGoal])
      return customId
    },
    [],
  )

  const removeGoal = useCallback((goalId: string) => {
    setSelectedGoals((prev) => prev.filter((g) => g.id !== goalId))
  }, [])

  const addMilestone = useCallback((goalId: string, title: string, targetDate?: string) => {
    if (!title.trim()) return
    setSelectedGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g
        const newM: OnboardingMilestone = {
          id: `m-${Date.now()}`,
          title: title.trim(),
          targetDate,
          isCompleted: false,
        }
        const updatedMilestones = [...g.milestones, newM]
        const completed = updatedMilestones.filter((m) => m.isCompleted).length
        const progressPct =
          updatedMilestones.length > 0
            ? Math.floor((completed / updatedMilestones.length) * 100)
            : 0

        return {
          ...g,
          milestones: updatedMilestones,
          progressPct: g.progressSource === 'MILESTONES' ? progressPct : g.progressPct,
        }
      }),
    )
  }, [])

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    setSelectedGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g
        const updatedMilestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m,
        )
        const completed = updatedMilestones.filter((m) => m.isCompleted).length
        const progressPct =
          updatedMilestones.length > 0
            ? Math.floor((completed / updatedMilestones.length) * 100)
            : 0

        return {
          ...g,
          milestones: updatedMilestones,
          progressPct: g.progressSource === 'MILESTONES' ? progressPct : g.progressPct,
        }
      }),
    )
  }, [])

  const deleteMilestone = useCallback((goalId: string, milestoneId: string) => {
    setSelectedGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g
        const updatedMilestones = g.milestones.filter((m) => m.id !== milestoneId)
        const completed = updatedMilestones.filter((m) => m.isCompleted).length
        const progressPct =
          updatedMilestones.length > 0
            ? Math.floor((completed / updatedMilestones.length) * 100)
            : 0

        return {
          ...g,
          milestones: updatedMilestones,
          progressPct: g.progressSource === 'MILESTONES' ? progressPct : g.progressPct,
        }
      }),
    )
  }, [])

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true)
    setHasSkippedOnboarding(false)
  }, [])

  const skipOnboarding = useCallback(() => {
    setHasSkippedOnboarding(true)
  }, [])

  const resetOnboarding = useCallback(() => {
    setSelectedGoals([])
    setHasCompletedOnboarding(false)
    setHasSkippedOnboarding(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const value = useMemo(
    () => ({
      selectedGoals,
      hasCompletedOnboarding,
      hasSkippedOnboarding,
      isGoalSelected,
      getSelectedGoal,
      toggleCatalogueGoal,
      configureGoal,
      addCustomGoal,
      removeGoal,
      addMilestone,
      toggleMilestone,
      deleteMilestone,
      completeOnboarding,
      skipOnboarding,
      resetOnboarding,
    }),
    [
      selectedGoals,
      hasCompletedOnboarding,
      hasSkippedOnboarding,
      isGoalSelected,
      getSelectedGoal,
      toggleCatalogueGoal,
      configureGoal,
      addCustomGoal,
      removeGoal,
      addMilestone,
      toggleMilestone,
      deleteMilestone,
      completeOnboarding,
      skipOnboarding,
      resetOnboarding,
    ],
  )

  return (
    <OnboardingGoalsContext.Provider value={value}>
      {children}
    </OnboardingGoalsContext.Provider>
  )
}

export function useOnboardingGoals() {
  const context = useContext(OnboardingGoalsContext)
  if (!context) {
    throw new Error('useOnboardingGoals must be used within an OnboardingGoalsProvider')
  }
  return context
}
