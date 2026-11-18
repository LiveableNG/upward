import type { UserGoal } from '../types/goals.types'

const GOAL_CACHE_PREFIX = 'upward_cached_user_goals_'

export function getCachedUserGoals(userId?: number | string | null): UserGoal[] | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(`${GOAL_CACHE_PREFIX}${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.warn('[goalCache] Failed to read cached goals:', err)
    return null
  }
}

export function setCachedUserGoals(
  userId: number | string | null | undefined,
  goals: UserGoal[],
): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(`${GOAL_CACHE_PREFIX}${userId}`, JSON.stringify(goals))
  } catch (err) {
    console.warn('[goalCache] Failed to cache user goals:', err)
  }
}

export function clearCachedUserGoals(userId?: number | string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (userId) {
      localStorage.removeItem(`${GOAL_CACHE_PREFIX}${userId}`)
    } else {
      const allKeys = Object.keys(localStorage)
      allKeys.forEach((key) => {
        if (key.startsWith(GOAL_CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (err) {
    console.warn('[goalCache] Failed to clear cached user goals:', err)
  }
}
