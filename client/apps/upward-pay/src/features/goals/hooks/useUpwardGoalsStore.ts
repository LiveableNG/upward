'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  type GoalCategoryId,
  type SaveMoneyAnswers,
  type CustomGoalEntry,
  MAX_GOALS_PER_CATEGORY,
  UPWARD_GOAL_CATEGORIES,
  HOME_REFRESH_ITEMS,
} from '../data/upwardGoalsSpec'

export interface UpwardGoalsStoreData {
  selectedByCategory: Record<GoalCategoryId, string[]>
  qualifications: Record<string, string>
  sideIncomeOpportunity: string
  joinSideIncomeCommunity: boolean
  movePreferredArea: string
  giftOccasions: string[]
  homeRefreshInterested: boolean
  homeRefreshSelectedItems: string[]
  ownHomeInterested: boolean
  childClubsInterested: string[]
  categoryNotes: Record<string, string>
  saveMoneyAnswers: SaveMoneyAnswers
  customGoals: CustomGoalEntry[]
  completedMilestoneIds: string[]
}

const DEFAULT_STORE_DATA: UpwardGoalsStoreData = {
  selectedByCategory: {
    housing: ['pay-less-next-rent'],
    income: [],
    career: [],
    save_money: [],
    children: [],
  },
  qualifications: {},
  sideIncomeOpportunity: '',
  joinSideIncomeCommunity: true,
  movePreferredArea: '',
  giftOccasions: [],
  homeRefreshInterested: false,
  homeRefreshSelectedItems: HOME_REFRESH_ITEMS.map((i) => i.id),
  ownHomeInterested: false,
  childClubsInterested: [],
  categoryNotes: {},
  saveMoneyAnswers: {
    laundrySpendMonthly: '',
    groceryRegularItems: ['', '', ''],
    groceryTopSpendItems: ['', '', ''],
    openToRoommate: '',
    commuteSpendMonthly: '',
  },
  customGoals: [],
  completedMilestoneIds: [],
}

const STORAGE_EVENT = 'upward-goals-store-sync'

function getStorageKey(userUuid?: string): string {
  return userUuid ? `upward_goals_v2_${userUuid}` : 'upward_goals_v2_guest'
}

function readStore(userUuid?: string): UpwardGoalsStoreData {
  if (typeof window === 'undefined') return DEFAULT_STORE_DATA
  try {
    const raw = window.localStorage.getItem(getStorageKey(userUuid))
    if (!raw) return DEFAULT_STORE_DATA
    const parsed = JSON.parse(raw) as Partial<UpwardGoalsStoreData>
    return {
      ...DEFAULT_STORE_DATA,
      ...parsed,
      selectedByCategory: {
        ...DEFAULT_STORE_DATA.selectedByCategory,
        ...(parsed.selectedByCategory || {}),
      },
      saveMoneyAnswers: {
        ...DEFAULT_STORE_DATA.saveMoneyAnswers,
        ...(parsed.saveMoneyAnswers || {}),
      },
      customGoals: Array.isArray(parsed.customGoals) ? parsed.customGoals : [],
      completedMilestoneIds: Array.isArray(parsed.completedMilestoneIds)
        ? parsed.completedMilestoneIds
        : [],
    }
  } catch {
    return DEFAULT_STORE_DATA
  }
}

function writeStore(data: UpwardGoalsStoreData, userUuid?: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getStorageKey(userUuid), JSON.stringify(data))
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT))
  } catch {
    // ignore storage errors
  }
}

export function useUpwardGoalsStore() {
  const { user } = useAuth()
  const userUuid = user?.uuid
  const [store, setStore] = useState<UpwardGoalsStoreData>(() => readStore(userUuid))

  useEffect(() => {
    setStore(readStore(userUuid))
  }, [userUuid])

  useEffect(() => {
    const handleSync = () => {
      setStore(readStore(userUuid))
    }
    window.addEventListener(STORAGE_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [userUuid])

  const updateStore = useCallback(
    (updater: (prev: UpwardGoalsStoreData) => UpwardGoalsStoreData) => {
      setStore((prev) => {
        const next = updater(prev)
        writeStore(next, userUuid)
        return next
      })
    },
    [userUuid],
  )

  const toggleGoalInCategory = useCallback(
    (
      categoryId: GoalCategoryId,
      goalId: string,
    ): { ok: boolean; reason?: 'CAP_REACHED' } => {
      updateStore((prev) => {
        const list = prev.selectedByCategory[categoryId] || []
        const nextList = list.includes(goalId)
          ? list.filter((id) => id !== goalId)
          : [...list, goalId]
        return {
          ...prev,
          selectedByCategory: {
            ...prev.selectedByCategory,
            [categoryId]: nextList,
          },
        }
      })
      return { ok: true }
    },
    [updateStore],
  )

  const setCategorySelections = useCallback(
    (categoryId: GoalCategoryId, goalIds: string[]) => {
      updateStore((prev) => ({
        ...prev,
        selectedByCategory: {
          ...prev.selectedByCategory,
          [categoryId]: goalIds,
        },
      }))
    },
    [updateStore],
  )

  const setQualification = useCallback(
    (goalId: string, qualification: string) => {
      updateStore((prev) => ({
        ...prev,
        qualifications: {
          ...prev.qualifications,
          [goalId]: qualification,
        },
      }))
    },
    [updateStore],
  )

  const setSaveMoneyAnswers = useCallback(
    (answers: Partial<SaveMoneyAnswers>) => {
      updateStore((prev) => {
        const nextAnswers: SaveMoneyAnswers = {
          ...prev.saveMoneyAnswers,
          ...answers,
        }
        // Automatically mark corresponding save_money goals active when answered
        const autoGoals: string[] = []
        if (nextAnswers.laundrySpendMonthly.trim()) autoGoals.push('pay-less-laundry')
        if (
          nextAnswers.groceryRegularItems.some((x) => x.trim()) ||
          nextAnswers.groceryTopSpendItems.some((x) => x.trim())
        ) {
          autoGoals.push('pay-less-groceries')
        }
        if (nextAnswers.openToRoommate) autoGoals.push('shared-housing-savings')
        if (nextAnswers.commuteSpendMonthly.trim()) autoGoals.push('pay-less-commute')

        return {
          ...prev,
          saveMoneyAnswers: nextAnswers,
          selectedByCategory: {
            ...prev.selectedByCategory,
            save_money: autoGoals.slice(0, MAX_GOALS_PER_CATEGORY),
          },
        }
      })
    },
    [updateStore],
  )

  const addCustomGoal = useCallback(
    (entry: Omit<CustomGoalEntry, 'id' | 'createdAt' | 'savedAmountNaira'>) => {
      const newGoal: CustomGoalEntry = {
        ...entry,
        id: `custom-${Date.now()}`,
        savedAmountNaira: 0,
        createdAt: new Date().toISOString(),
      }
      updateStore((prev) => ({
        ...prev,
        customGoals: [newGoal, ...prev.customGoals],
      }))
      return newGoal
    },
    [updateStore],
  )

  const toggleCustomGoalAction = useCallback(
    (goalId: string, actionId: string) => {
      updateStore((prev) => ({
        ...prev,
        customGoals: prev.customGoals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                actions: g.actions.map((a) =>
                  a.id === actionId ? { ...a, completed: !a.completed } : a,
                ),
              }
            : g,
        ),
      }))
    },
    [updateStore],
  )

  const removeCustomGoal = useCallback(
    (goalId: string) => {
      updateStore((prev) => ({
        ...prev,
        customGoals: prev.customGoals.filter((g) => g.id !== goalId),
      }))
    },
    [updateStore],
  )

  const toggleMilestone = useCallback(
    (milestoneKey: string) => {
      updateStore((prev) => {
        const exists = prev.completedMilestoneIds.includes(milestoneKey)
        return {
          ...prev,
          completedMilestoneIds: exists
            ? prev.completedMilestoneIds.filter((k) => k !== milestoneKey)
            : [...prev.completedMilestoneIds, milestoneKey],
        }
      })
    },
    [updateStore],
  )

  // Total selected non-default or explicit goals across categories
  const totalSelectedCount = Object.values(store.selectedByCategory).reduce(
    (sum, arr) => sum + arr.length,
    0,
  )

  // Whether the user has selected at least one goal (unlocks Custom Goals per spec)
  const hasSelectedAtLeastOneGoal = totalSelectedCount > 0

  const getCategoryProgress = useCallback(
    (categoryId: GoalCategoryId, rentSavedPct = 0): number => {
      if (categoryId === 'housing') {
        const selected = store.selectedByCategory.housing || []
        if (rentSavedPct > 0) return rentSavedPct
        const cat = UPWARD_GOAL_CATEGORIES.find((c) => c.id === 'housing')
        if (!cat || selected.length === 0) return 0
        let totalSteps = 0
        let doneSteps = 0
        selected.forEach((gId) => {
          const g = cat.goals.find((x) => x.id === gId)
          if (g) {
            g.defaultMilestones.forEach((_, idx) => {
              totalSteps += 1
              if (store.completedMilestoneIds.includes(`${gId}:${idx}`)) {
                doneSteps += 1
              }
            })
          }
        })
        return totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0
      }

      if (categoryId === 'save_money') {
        const a = store.saveMoneyAnswers
        let answered = 0
        if (a.laundrySpendMonthly.trim()) answered += 1
        if (a.groceryRegularItems.some((x) => x.trim())) answered += 1
        if (a.groceryTopSpendItems.some((x) => x.trim())) answered += 1
        if (a.openToRoommate) answered += 1
        if (a.commuteSpendMonthly.trim()) answered += 1
        return Math.round((answered / 5) * 100)
      }

      const selected = store.selectedByCategory[categoryId] || []
      if (selected.length === 0) return 0
      const cat = UPWARD_GOAL_CATEGORIES.find((c) => c.id === categoryId)
      if (!cat) return 10
      let totalSteps = 0
      let doneSteps = 0
      selected.forEach((gId) => {
        const g = cat.goals.find((x) => x.id === gId)
        if (g) {
          g.defaultMilestones.forEach((_, idx) => {
            totalSteps += 1
            if (store.completedMilestoneIds.includes(`${gId}:${idx}`)) {
              doneSteps += 1
            }
          })
        }
      })
      if (totalSteps === 0) return 10
      const pct = Math.round((doneSteps / totalSteps) * 100)
      return Math.max(10, pct)
    },
    [store],
  )

  return {
    store,
    updateStore,
    toggleGoalInCategory,
    setCategorySelections,
    setQualification,
    setSaveMoneyAnswers,
    addCustomGoal,
    toggleCustomGoalAction,
    removeCustomGoal,
    toggleMilestone,
    totalSelectedCount,
    hasSelectedAtLeastOneGoal,
    getCategoryProgress,
  }
}
