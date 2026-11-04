import type {
  GoalOffering,
  UserGoal,
  GoalCategory,
  OfferingType,
} from '../types/goals.types'

export interface RecommendedOfferingItem {
  offering: GoalOffering
  reason: string
  isGoalMatch: boolean
  matchedGoalName?: string
  matchedCategoryName?: string
  priority: number
}

export interface RecommendationOptions {
  activeGoalId?: number
  typeFilter?: OfferingType | 'ALL'
  searchQuery?: string
  limit?: number
}

/**
 * Checks whether an offering links to a specific goal ID.
 */
export function isOfferingLinkedToGoal(offering: GoalOffering, goalId: number): boolean {
  if (offering.goalLinks && offering.goalLinks.length > 0) {
    return offering.goalLinks.some((l) => l.goalId === goalId)
  }
  if (offering.goals && offering.goals.length > 0) {
    return offering.goals.some((l) => l.goalId === goalId)
  }
  return false
}

/**
 * Checks if the tenant has selected a moving-related goal
 * to suggest Alliance property listings alongside services.
 */
export function hasMovingGoal(userGoals: UserGoal[] = []): boolean {
  return userGoals.some((ug) => {
    if (ug.status !== 'ACTIVE') return false
    const name = (ug.goal?.name || ug.goal?.slug || '').toLowerCase()
    return name.includes('move') || name.includes('relocat') || name.includes('apartment')
  })
}

/**
 * Generates an explainable recommendation label based on verified relationships.
 */
export function getRecommendationExplanation(
  offering: GoalOffering,
  matchedGoalName?: string,
): string {
  if (matchedGoalName) {
    return `For your goal: ${matchedGoalName}`
  }
  if (offering.type === 'PACKAGE' || offering.type === 'BUNDLE') {
    return 'Curated lifestyle bundle'
  }
  if (offering.isFeatured) {
    return 'Featured partner offering'
  }
  if (offering.vendor?.isVerified) {
    return 'From verified merchant'
  }
  return 'Popular with Upward tenants'
}

export function getRecommendedOfferings(
  offerings: GoalOffering[],
  userGoals: UserGoal[] = [],
  categories: GoalCategory[] = [],
  options: RecommendationOptions = {},
): RecommendedOfferingItem[] {
  const { activeGoalId, typeFilter = 'ALL', searchQuery = '', limit } = options

  // Active user goals map: goalId -> goal
  const activeUserGoalMap = new Map<number, { name: string; categoryName?: string }>()
  userGoals.forEach((ug) => {
    if (ug.status === 'ACTIVE' && ug.goal) {
      activeUserGoalMap.set(ug.goalId, {
        name: ug.goal.name,
        categoryName: ug.goal.category?.name,
      })
    }
  })

  // Goal name lookup helper from categories
  const allGoalsMap = new Map<number, { name: string; categoryName?: string }>()
  categories.forEach((cat) => {
    (cat.goals || []).forEach((g) => {
      allGoalsMap.set(g.id, { name: g.name, categoryName: cat.name })
    })
  })

  // Filter offerings by publication status, search query, and type
  let filtered = offerings.filter((o) => {
    // Only published offerings
    if (o.status && o.status !== 'PUBLISHED') return false

    // Type filter
    if (typeFilter !== 'ALL' && o.type !== typeFilter) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = (o.title || o.name || '').toLowerCase().includes(q)
      const descMatch = (o.description || '').toLowerCase().includes(q)
      const vendorMatch = (o.vendor?.name || '').toLowerCase().includes(q)
      if (!titleMatch && !descMatch && !vendorMatch) return false
    }

    return true
  })

  // Score & sort offerings
  const items: RecommendedOfferingItem[] = filtered.map((offering) => {
    let priority = 0
    let matchedGoalName: string | undefined
    let matchedCategoryName: string | undefined
    let isGoalMatch = false

    // 1. Check if offering links to the specifically requested goal (top priority)
    if (activeGoalId !== undefined && isOfferingLinkedToGoal(offering, activeGoalId)) {
      priority += 100
      isGoalMatch = true
      const info = activeUserGoalMap.get(activeGoalId) || allGoalsMap.get(activeGoalId)
      matchedGoalName = info?.name
      matchedCategoryName = info?.categoryName
    }

    // 2. Check if offering links to any of tenant's active goals
    if (!matchedGoalName) {
      for (const [goalId, info] of activeUserGoalMap.entries()) {
        if (isOfferingLinkedToGoal(offering, goalId)) {
          priority += 50
          isGoalMatch = true
          matchedGoalName = info.name
          matchedCategoryName = info.categoryName
          break
        }
      }
    }

    // 3. Featured offerings bonus
    if (offering.isFeatured) {
      priority += 20
    }

    // 4. Bundles & Packages bonus (higher tenant value)
    if (offering.type === 'BUNDLE' || offering.type === 'PACKAGE') {
      priority += 15
    }

    // 5. Verified vendor bonus
    if (offering.vendor?.isVerified) {
      priority += 10
    }

    // 6. In stock bonus
    if (offering.inStock !== false) {
      priority += 5
    }

    const reason = getRecommendationExplanation(offering, matchedGoalName)

    return {
      offering,
      reason,
      isGoalMatch,
      matchedGoalName,
      matchedCategoryName,
      priority,
    }
  })

  // Sort descending by calculated priority
  items.sort((a, b) => b.priority - a.priority)

  if (limit && limit > 0) {
    return items.slice(0, limit)
  }

  return items
}
