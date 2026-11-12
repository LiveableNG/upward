export type GoalPublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type UserGoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
export type GoalProgressSource =
  | 'MILESTONES'
  | 'MANUAL_PERCENT'
  | 'TARGET_AMOUNT'
  | 'RENT_VAULT'
  | 'STATUS_ONLY'
export type GoalMilestoneStatus = 'PENDING' | 'COMPLETED'
export type GoalInterestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CONTACTED'
  | 'FULFILLED'
  | 'CLOSED'
export type HousingAdoptionStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED' | 'RELEASED'

/**
 * Clean Architecture transaction boundary token for domain repositories.
 * Concrete repository implementations bind this to their underlying infrastructure
 * transaction context (e.g., Prisma.TransactionClient) without leaking infrastructure
 * dependencies into the domain layer.
 */
export interface GoalTransactionContext {
  readonly _brand?: 'GoalTransactionContext'
}

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
  goalId?: number | null
  categoryId?: number | null
  historicalTitle?: string
  customTitle?: string | null
  customDescription?: string | null
  status: UserGoalStatus
  progressSource?: GoalProgressSource
  progressPct: number
  targetDate?: Date | null
  notes?: string | null
  currentAmountMinor?: bigint | null
  targetAmountMinor?: bigint | null
  currency?: string
  completedAt?: Date | null
  archivedAt?: Date | null
  pausedAt?: Date | null
  lastVerifiedBalanceMinor?: bigint | null
  verifiedSourceUuid?: string | null
  verifiedAt?: Date | null
  userPropertyId?: number | null
  rentVaultId?: number | null
  createdAt?: Date
  updatedAt?: Date
  goal?: Goal | null
  catalogueGoal?: Goal | null
  category?: GoalCategory | null
  milestones?: GoalMilestone[]
  interests?: GoalInterest[]
}

export interface GoalMilestone {
  id?: number
  uuid: string
  userGoalId: number
  title: string
  status: GoalMilestoneStatus
  sortOrder: number
  targetDate?: Date | null
  completedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export interface GoalInterest {
  id?: number
  uuid: string
  userGoalId: number
  serviceType: string
  status: GoalInterestStatus
  notes?: string | null
  adminNotes?: string | null
  version: number
  submittedAt?: Date
  createdAt?: Date
  updatedAt?: Date
  userGoal?: UserGoal
  history?: GoalInterestHistory[]
}

export interface GoalInterestHistory {
  id?: number
  uuid: string
  interestId: number
  version: number
  serviceType: string
  status: GoalInterestStatus
  notes?: string | null
  adminNotes?: string | null
  snapshotAt?: Date
}

export interface HousingAdoptionDecision {
  id?: number
  uuid: string
  userId: number
  userPropertyId?: number | null
  rentVaultId?: number | null
  userGoalId?: number | null
  status: HousingAdoptionStatus
  decidedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
  userGoal?: UserGoal | null
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

export interface GoalRepository<TTransaction = GoalTransactionContext> {
  // Categories
  findCategories(filter?: { status?: GoalPublishStatus; includeGoals?: boolean }, tx?: TTransaction): Promise<GoalCategory[]>
  findCategoryBySlug(slug: string, tx?: TTransaction): Promise<GoalCategory | null>
  findCategoryByUuid(uuid: string, tx?: TTransaction): Promise<GoalCategory | null>
  createCategory(data: Partial<GoalCategory>, tx?: TTransaction): Promise<GoalCategory>
  updateCategory(id: number, data: Partial<GoalCategory>, tx?: TTransaction): Promise<GoalCategory>
  deleteCategory(id: number, tx?: TTransaction): Promise<void>

  // Goals
  findGoals(filter?: {
    categoryId?: number
    categorySlug?: string
    status?: GoalPublishStatus
    isFeatured?: boolean
    search?: string
    skip?: number
    take?: number
  }, tx?: TTransaction): Promise<{ items: Goal[]; total: number }>
  findGoalBySlug(slug: string, options?: { includeDetails?: boolean }, tx?: TTransaction): Promise<Goal | null>
  findGoalByUuid(uuid: string, tx?: TTransaction): Promise<Goal | null>
  findGoalById(id: number, tx?: TTransaction): Promise<Goal | null>
  createGoal(data: Partial<Goal>, tx?: TTransaction): Promise<Goal>
  updateGoal(id: number, data: Partial<Goal>, tx?: TTransaction): Promise<Goal>
  deleteGoal(id: number, tx?: TTransaction): Promise<void>

  // User Goals
  findUserGoals(userId: number, status?: UserGoalStatus, tx?: TTransaction): Promise<UserGoal[]>
  findUserGoal(userId: number, goalId: number, tx?: TTransaction): Promise<UserGoal | null>
  findUserGoalById(id: number, tx?: TTransaction): Promise<UserGoal | null>
  findUserGoalByUuid(uuid: string, tx?: TTransaction): Promise<UserGoal | null>
  createUserGoal(data: Partial<UserGoal>, tx?: TTransaction): Promise<UserGoal>
  setUserGoals(userId: number, goalIds: number[], tx?: TTransaction): Promise<UserGoal[]>
  updateUserGoal(id: number, data: Partial<UserGoal>, tx?: TTransaction): Promise<UserGoal>
  removeUserGoal(userId: number, goalId: number, tx?: TTransaction): Promise<void>
  archiveUserGoal(id: number, tx?: TTransaction): Promise<UserGoal>

  // Milestones
  findMilestones(userGoalId: number, tx?: TTransaction): Promise<GoalMilestone[]>
  findMilestoneById(id: number, tx?: TTransaction): Promise<GoalMilestone | null>
  createMilestone(data: Partial<GoalMilestone>, tx?: TTransaction): Promise<GoalMilestone>
  updateMilestone(id: number, data: Partial<GoalMilestone>, tx?: TTransaction): Promise<GoalMilestone>
  deleteMilestone(id: number, tx?: TTransaction): Promise<void>

  // Housing Adoption Decisions
  findHousingAdoptionDecisions(userId: number, status?: HousingAdoptionStatus, tx?: TTransaction): Promise<HousingAdoptionDecision[]>
  findHousingAdoptionDecisionById(id: number, tx?: TTransaction): Promise<HousingAdoptionDecision | null>
  createHousingAdoptionDecision(data: Partial<HousingAdoptionDecision>, tx?: TTransaction): Promise<HousingAdoptionDecision>
  updateHousingAdoptionDecision(id: number, data: Partial<HousingAdoptionDecision>, tx?: TTransaction): Promise<HousingAdoptionDecision>

  // Interests
  findInterests(userGoalId: number, tx?: TTransaction): Promise<GoalInterest[]>
  findInterestById(id: number, tx?: TTransaction): Promise<GoalInterest | null>
  createInterest(data: Partial<GoalInterest>, tx?: TTransaction): Promise<GoalInterest>
  updateInterest(
    id: number,
    expectedVersion: number,
    data: Partial<GoalInterest>,
    adminNotes?: string | null,
    tx?: TTransaction,
  ): Promise<GoalInterest>
  findInterestHistory(interestId: number, tx?: TTransaction): Promise<GoalInterestHistory[]>

  // Collections
  findCollections(goalId: number, status?: GoalPublishStatus, tx?: TTransaction): Promise<GoalCollection[]>
  findCollectionByUuid(uuid: string, tx?: TTransaction): Promise<GoalCollection | null>
  createCollection(data: Partial<GoalCollection>, tx?: TTransaction): Promise<GoalCollection>
  updateCollection(id: number, data: Partial<GoalCollection>, tx?: TTransaction): Promise<GoalCollection>
  deleteCollection(id: number, tx?: TTransaction): Promise<void>

  // Goal Offerings Links
  linkOfferingToGoal(data: {
    goalId: number
    offeringId: number
    collectionId?: number | null
    isRecommended?: boolean
    relevanceScore?: number
    curatorNote?: string | null
    sortOrder?: number
  }, tx?: TTransaction): Promise<GoalOfferingLink>
  unlinkOfferingFromGoal(goalId: number, offeringId: number, collectionId?: number | null, tx?: TTransaction): Promise<void>

  // Analytics Overview
  getGoalsOverview(tx?: TTransaction): Promise<{
    totalCategories: number
    totalGoals: number
    totalActiveUserGoals: number
    topGoals: Array<{ goalId: number; title: string; count: number }>
  }>
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY')
