import {
  getGoalTitle,
  getCategoryTitle,
  isVendorVerified,
  type GoalOffering,
  type UserGoal,
  type GoalCategory,
  type OfferingType,
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
    const label = `${getGoalTitle(ug.goal)} ${ug.goal?.slug || ''}`.toLowerCase()
    return label.includes('move') || label.includes('relocat') || label.includes('apartment')
  })
}

/**
 * Generates a concise, human-readable recommendation label based on verified relationships.
 */
export function getRecommendationExplanation(
  offering: GoalOffering,
  _matchedGoalName?: string,
): string {
  if (offering.isFeatured) {
    return 'Featured perk'
  }
  if (offering.type === 'PACKAGE' || offering.type === 'BUNDLE') {
    return 'Curated bundle'
  }
  if (isVendorVerified(offering.vendor)) {
    return 'Verified merchant'
  }
  return ''
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
    if (ug.status === 'ACTIVE' && ug.goal && ug.goalId != null) {
      activeUserGoalMap.set(ug.goalId, {
        name: getGoalTitle(ug.goal),
        categoryName: getCategoryTitle(ug.goal.category),
      })
    }
  })

  // Goal name lookup helper from categories
  const allGoalsMap = new Map<number, { name: string; categoryName?: string }>()
  categories.forEach((cat) => {
    const catTitle = getCategoryTitle(cat)
    ;(cat.goals || []).forEach((g) => {
      allGoalsMap.set(g.id, { name: getGoalTitle(g), categoryName: catTitle })
    })
  })

  // Filter offerings by publication status, search query, and type
  const filtered = offerings.filter((o) => {
    // Only published offerings
    if (o.status && o.status !== 'PUBLISHED') return false

    // Type filter
    if (typeFilter !== 'ALL' && o.type !== typeFilter) return false

    // If a specific goal pill is selected, filter strictly to offerings linked to that goal
    if (activeGoalId !== undefined && !isOfferingLinkedToGoal(o, activeGoalId)) {
      return false
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = (o.title || o.name || '').toLowerCase().includes(q)
      const descMatch = (o.description || o.subtitle || '').toLowerCase().includes(q)
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
    if (isVendorVerified(offering.vendor)) {
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
