export type GoalTab = 'OVERVIEW' | 'GOALS' | 'CATEGORIES' | 'OFFERINGS' | 'VENDORS'

export type OfferingType = 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'BUNDLE' | 'SERVICE_INDIVIDUAL' | 'SERVICE_PACKAGE'

export interface GoalCategory {
  id: number
  uuid: string
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  sortOrder: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    goals?: number
  }
}

export interface Goal {
  id: number
  uuid: string
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  icon?: string | null
  coverImageUrl?: string | null
  tags?: string[]
  sortOrder: number
  isPublished: boolean
  isFeatured: boolean
  categoryId: number
  category?: GoalCategory
  collections?: GoalCollection[]
  offerings?: GoalOfferingLink[]
  _count?: {
    userGoals?: number
    offerings?: number
  }
}

export interface GoalCollection {
  id: number
  uuid: string
  goalId: number
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  isPublished: boolean
  _count?: {
    offerings?: number
  }
}

export interface GoalOfferingLink {
  id: number
  goalId: number
  offeringId: number
  collectionId?: number | null
  isFeatured: boolean
  sortOrder: number
  offering?: Offering
  collection?: GoalCollection | null
}

export interface OfferingMedia {
  id?: number
  offeringId?: number
  url: string
  altText?: string | null
  sortOrder?: number
  isCover?: boolean
}

export interface PackageItemComponent {
  id?: number
  packageId?: number
  componentId: number
  quantity: number
  isOptional?: boolean
  overridePrice?: number | null
  component?: Offering
}

export interface Offering {
  id: number
  uuid: string
  vendorId?: number | null
  title: string
  slug: string
  subtitle?: string | null
  description?: string | null
  type: OfferingType
  price: number
  currency: string
  compareAtPrice?: number | null
  maxPrice?: number | null
  stockCount?: number | null
  leadTimeDays?: number | null
  isDeliverable: boolean
  isPublished: boolean
  isFeatured: boolean
  vendor?: CommerceVendor | null
  media?: OfferingMedia[]
  packageItems?: PackageItemComponent[]
  goalLinks?: Array<{
    id?: number
    goalId: number
    goal?: Goal
    collectionId?: number | null
  }>
  _count?: {
    goalOfferings?: number
  }
}

export interface CommerceVendor {
  id: number
  uuid: string
  name: string
  slug: string
  legalName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  description?: string | null
  logoUrl?: string | null
  address?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
  _count?: {
    offerings?: number
  }
}

export interface TopGoalStat {
  id: number
  title: string
  slug: string
  userCount: number
}

export interface GoalsOverview {
  totalCategories: number
  totalGoals: number
  activeUserGoals: number
  totalOfferings: number
  totalVendors: number
  topGoals: TopGoalStat[]
}

export interface GoalManagementProps {
  token?: string
  adminRole?: string
}

export interface DeleteTarget {
  type: 'CATEGORY' | 'GOAL' | 'COLLECTION' | 'OFFERING' | 'VENDOR' | 'UNLINK_OFFERING'
  id: number
  title: string
  extraId?: number // for unlinking (goalId)
}
