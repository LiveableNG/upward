export type GoalPublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type UserGoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export interface GoalCategory {
  id?: number
  uuid: string
  slug: string
  title: string
  description?: string | null
  iconName: string
  coverImage?: string | null
  sortOrder: number
  status: GoalPublishStatus
  createdAt?: Date
  updatedAt?: Date
  goals?: Goal[]
  _count?: {
    goals?: number
  }
}

export interface Goal {
  id?: number
  uuid: string
  categoryId: number
  slug: string
  title: string
  tagline?: string | null
  description?: string | null
  iconName?: string | null
  heroImage?: string | null
  sortOrder: number
  status: GoalPublishStatus
  isFeatured: boolean
  createdAt?: Date
  updatedAt?: Date
  category?: GoalCategory
  collections?: GoalCollection[]
  offerings?: any[]
  _count?: {
    userGoals?: number
    offerings?: number
  }
}

export interface UserGoal {
  id?: number
  uuid: string
  userId: number
  goalId: number
  status: UserGoalStatus
  targetDate?: Date | null
  notes?: string | null
  progressPct: number
  completedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
  goal?: Goal
}

export interface GoalCollection {
  id?: number
  uuid: string
  goalId: number
  title: string
  subtitle?: string | null
  description?: string | null
  badge?: string | null
  sortOrder: number
  status: GoalPublishStatus
  createdAt?: Date
  updatedAt?: Date
  offerings?: any[]
  _count?: {
    offerings?: number
  }
}

export interface GoalOfferingLink {
  id?: number
  uuid: string
  goalId: number
  offeringId: number
  collectionId?: number | null
  isRecommended: boolean
  relevanceScore: number
  curatorNote?: string | null
  sortOrder: number
  createdAt?: Date
  offering?: any
}

export interface GoalRepository {
  // Categories
  findCategories(filter?: {
    status?: GoalPublishStatus
    includeGoals?: boolean
  }): Promise<GoalCategory[]>
  findCategoryBySlug(slug: string): Promise<GoalCategory | null>
  findCategoryByUuid(uuid: string): Promise<GoalCategory | null>
  createCategory(data: Partial<GoalCategory>): Promise<GoalCategory>
  updateCategory(id: number, data: Partial<GoalCategory>): Promise<GoalCategory>
  deleteCategory(id: number): Promise<void>

  // Goals
  findGoals(filter?: {
    categoryId?: number
    categorySlug?: string
    status?: GoalPublishStatus
    isFeatured?: boolean
    search?: string
    skip?: number
    take?: number
  }): Promise<{ items: Goal[]; total: number }>
  findGoalBySlug(slug: string, options?: { includeDetails?: boolean }): Promise<Goal | null>
  findGoalByUuid(uuid: string): Promise<Goal | null>
  findGoalById(id: number): Promise<Goal | null>
  createGoal(data: Partial<Goal>): Promise<Goal>
  updateGoal(id: number, data: Partial<Goal>): Promise<Goal>
  deleteGoal(id: number): Promise<void>

  // User Goals
  findUserGoals(userId: number, status?: UserGoalStatus): Promise<UserGoal[]>
  findUserGoal(userId: number, goalId: number): Promise<UserGoal | null>
  setUserGoals(userId: number, goalIds: number[]): Promise<UserGoal[]>
  updateUserGoal(id: number, data: Partial<UserGoal>): Promise<UserGoal>
  removeUserGoal(userId: number, goalId: number): Promise<void>

  // Collections
  findCollections(goalId: number, status?: GoalPublishStatus): Promise<GoalCollection[]>
  findCollectionByUuid(uuid: string): Promise<GoalCollection | null>
  createCollection(data: Partial<GoalCollection>): Promise<GoalCollection>
  updateCollection(id: number, data: Partial<GoalCollection>): Promise<GoalCollection>
  deleteCollection(id: number): Promise<void>

  // Goal Offerings Links
  linkOfferingToGoal(data: {
    goalId: number
    offeringId: number
    collectionId?: number | null
    isRecommended?: boolean
    relevanceScore?: number
    curatorNote?: string | null
    sortOrder?: number
  }): Promise<GoalOfferingLink>
  unlinkOfferingFromGoal(
    goalId: number,
    offeringId: number,
    collectionId?: number | null,
  ): Promise<void>

  // Analytics Overview
  getGoalsOverview(): Promise<{
    totalCategories: number
    totalGoals: number
    totalActiveUserGoals: number
    topGoals: Array<{ goalId: number; title: string; count: number }>
  }>
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY')
