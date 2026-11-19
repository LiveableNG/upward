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

export interface GoalActionTemplate {
  id: number
  uuid: string
  goalId: number
  title: string
  description?: string | null
  sortOrder: number
  isRequired: boolean
  isActive: boolean
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
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isPublished: boolean
  isFeatured: boolean
  categoryId: number
  category?: GoalCategory & { title?: string }
  collections?: GoalCollection[]
  offerings?: GoalOfferingLink[]
  actionTemplates?: GoalActionTemplate[]
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
  isPromoted?: boolean
  promoBadge?: string | null
  promoTitle?: string | null
  promoSubtitle?: string | null
  promoCoverImage?: string | null
  promoPriority?: number
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
  defaultDeliveryCoverage?: string
  defaultDeliveryZones?: string[]
  createdAt: string
  _count?: {
    offerings?: number
  }
}

export interface TopGoalStat {
  id: number
  goalId?: number
  title: string
  categoryName?: string
  slug?: string
  userCount: number
  count?: number
}

export interface CategoryGoalBreakdown {
  categoryId: number
  categoryName: string
  selectionCount: number
  uniqueTenants: number
}

export interface RecentTenantGoalSelection {
  id: number
  userId: number
  tenantName: string
  tenantEmail: string | null
  goalTitle: string
  categoryName: string
  status: string
  createdAt: string
}

export interface GoalsOverview {
  totalCategories: number
  totalGoals: number
  activeUserGoals: number
  totalActiveUserGoals?: number
  uniqueTenantsWithGoals?: number
  totalOfferings: number
  publishedOfferings?: number
  totalVendors: number
  activeVendors?: number
  totalOrders?: number
  activeQuoteOrders?: number
  topGoals: TopGoalStat[]
  categoryBreakdown?: CategoryGoalBreakdown[]
  recentSelections?: RecentTenantGoalSelection[]
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
