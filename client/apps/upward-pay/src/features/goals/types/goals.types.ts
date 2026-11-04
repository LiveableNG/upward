export type GoalStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type UserGoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
export type OfferingType = 'PRODUCT' | 'SERVICE' | 'BUNDLE' | 'PACKAGE'

export interface CommerceVendor {
  id: number
  name: string
  slug: string
  contactEmail: string
  contactPhone?: string | null
  address?: string | null
  isVerified: boolean
  rating?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface GoalCategory {
  id: number
  name: string
  slug: string
  description?: string | null
  iconName?: string | null
  sortOrder: number
  status: GoalStatus
  goals?: Goal[]
  createdAt?: string
  updatedAt?: string
}

export interface GoalOfferingPackageItem {
  id: number
  packageOfferingId: number
  itemOfferingId: number
  quantity: number
  itemOffering?: GoalOffering
}

export interface GoalOffering {
  id: number
  name: string
  slug: string
  description?: string | null
  type: OfferingType
  price: number
  currency: string
  imageUrl?: string | null
  status: GoalStatus
  vendorId?: number | null
  vendor?: CommerceVendor
  packageItems?: GoalOfferingPackageItem[]
  goals?: Array<{
    id: number
    goalId: number
    offeringId: number
    sortOrder: number
    goal?: Goal
  }>
  createdAt?: string
  updatedAt?: string
}

export interface GoalOfferingLink {
  id: number
  goalId: number
  offeringId: number
  sortOrder: number
  offering?: GoalOffering
}

export interface Goal {
  id: number
  categoryId: number
  name: string
  slug: string
  description?: string | null
  iconName?: string | null
  sortOrder: number
  status: GoalStatus
  category?: GoalCategory
  offerings?: GoalOfferingLink[]
  createdAt?: string
  updatedAt?: string
}

export interface UserGoal {
  id: number
  userId: number
  goalId: number
  status: UserGoalStatus
  progressPct: number
  targetDate?: string | null
  notes?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  goal?: Goal
}

export interface PaginationMeta {
  total: number
  skip: number
  take: number
}

export interface GoalListQuery {
  categoryId?: number
  status?: GoalStatus
  skip?: number
  take?: number
  search?: string
}

export interface OfferingListQuery {
  goalId?: number
  type?: OfferingType
  status?: GoalStatus
  vendorId?: number
  skip?: number
  take?: number
  search?: string
}

export interface SetUserGoalsData {
  goalIds: number[]
}

export interface UpdateUserGoalData {
  status?: UserGoalStatus
  progressPct?: number
  targetDate?: string
  notes?: string
  completedAt?: string
}
