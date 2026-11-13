export type GoalPublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type GoalStatus = GoalPublishStatus // Backward-compatibility alias
export type UserGoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export type GoalProgressSource =
  | 'MILESTONES'
  | 'MANUAL_PERCENT'
  | 'TARGET_AMOUNT'
  | 'RENT_VAULT'
  | 'STATUS_ONLY'

export type GoalMilestoneStatus = 'PENDING' | 'COMPLETED'
export type OfferingType = 'PRODUCT' | 'SERVICE' | 'BUNDLE' | 'PACKAGE'

export interface CommerceVendor {
  id: number
  uuid?: string
  name: string
  slug: string
  logoUrl?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  isActive?: boolean
  isVerified?: boolean
  rating?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface GoalCategory {
  id: number
  uuid?: string
  title?: string
  name?: string
  slug: string
  description?: string | null
  iconName?: string | null
  coverImage?: string | null
  sortOrder: number
  status: GoalPublishStatus
  goals?: Goal[]
  createdAt?: string
  updatedAt?: string
}

export type OfferingPricingModel = 'FIXED' | 'RANGE' | 'STARTING_AT' | 'QUOTE_REQUIRED'

export interface OfferingMedia {
  id?: number
  uuid: string
  offeringId?: number
  mediaUrl: string
  mimeType?: string
  sortOrder: number
  isPrimary: boolean
  createdAt?: string
}

export interface GoalOfferingPackageItem {
  id?: number
  uuid?: string
  packageId?: number
  componentId?: number
  quantity: number
  isOptional?: boolean
  sortOrder?: number
  overridePrice?: number | null
  component?: GoalOffering
  itemOffering?: GoalOffering
}

export interface GoalOffering {
  id: number
  uuid?: string
  title?: string
  name?: string
  slug: string
  subtitle?: string | null
  description?: string | null
  type: OfferingType
  pricingModel?: OfferingPricingModel
  price?: number | null
  minPrice?: number | null
  maxPrice?: number | null
  compareAtPrice?: number | null
  currency: string
  imageUrl?: string | null
  inStock?: boolean
  stockCount?: number | null
  deliveryAvailable?: boolean
  deliveryCoverageType?: 'NATIONWIDE' | 'REGIONAL_ZONES' | 'PICKUP_ONLY'
  deliveryZones?: string[]
  leadTimeDays?: number | null
  isFeatured?: boolean
  status: GoalPublishStatus
  vendorId?: number | null
  vendor?: CommerceVendor
  media?: OfferingMedia[]
  packageItems?: GoalOfferingPackageItem[]
  goals?: Array<{
    id: number
    goalId: number
    offeringId: number
    sortOrder: number
    goal?: Goal
  }>
  goalLinks?: Array<{
    id?: number
    goalId: number
    offeringId?: number
    sortOrder?: number
    curatorNote?: string | null
    isRecommended?: boolean
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
  uuid?: string
  categoryId: number
  title?: string
  name?: string
  tagline?: string | null
  slug: string
  description?: string | null
  iconName?: string | null
  heroImage?: string | null
  isFeatured?: boolean
  sortOrder: number
  status: GoalPublishStatus
  category?: GoalCategory
  offerings?: GoalOfferingLink[]
  createdAt?: string
  updatedAt?: string
}

export interface GoalMilestone {
  id: number
  uuid: string
  userGoalId: number
  title: string
  status: GoalMilestoneStatus
  sortOrder: number
  targetDate?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface UserGoal {
  id: number
  uuid: string
  userId: number
  goalId?: number | null
  categoryId: number
  historicalTitle?: string
  customTitle?: string | null
  customDescription?: string | null
  status: UserGoalStatus
  progressSource: GoalProgressSource
  progressPct: number
  targetDate?: string | null
  notes?: string | null
  currentAmountMinor?: string | null
  targetAmountMinor?: string | null
  currency: string
  completedAt?: string | null
  archivedAt?: string | null
  pausedAt?: string | null
  lastVerifiedBalanceMinor?: string | null
  verifiedSourceUuid?: string | null
  verifiedAt?: string | null
  createdAt: string
  updatedAt: string
  catalogueGoal?: {
    id: number
    uuid: string
    slug: string
    title: string
    tagline?: string | null
    description?: string | null
    category?: {
      id: number
      uuid: string
      slug: string
      title: string
    }
  } | null
  category?: {
    id: number
    uuid: string
    slug: string
    title: string
    iconName?: string | null
  } | null
  milestones?: GoalMilestone[]
  // Backward compatibility alias for legacy views
  goal?: Goal | null
}

export interface PaginationMeta {
  total: number
  skip: number
  take: number
}

export interface GoalListQuery {
  categoryId?: number
  status?: GoalPublishStatus
  skip?: number
  take?: number
  search?: string
}

export interface OfferingListQuery {
  goalId?: number
  type?: OfferingType
  status?: GoalPublishStatus
  vendorId?: number
  isFeatured?: boolean
  minPrice?: number
  maxPrice?: number
  skip?: number
  take?: number
  search?: string
}

export interface SetUserGoalsData {
  goalIds: number[]
}

export interface AdoptCatalogueGoalDto {
  goalId: number
  targetDate?: string
  notes?: string
  targetAmountMinor?: string | number
  currency?: string
  progressSource?: GoalProgressSource
}

export interface CreateCustomGoalDto {
  customTitle: string
  categoryId: number
  customDescription?: string
  targetDate?: string
  notes?: string
  targetAmountMinor?: string | number
  currency?: string
  progressSource?: GoalProgressSource
}

export interface CreateUserGoalDto {
  goalId?: number
  customTitle?: string
  categoryId?: number
  customDescription?: string
  targetDate?: string
  notes?: string
  targetAmountMinor?: string | number
  currency?: string
  progressSource?: GoalProgressSource
}

export interface UpdateUserGoalData {
  status?: UserGoalStatus
  customTitle?: string
  customDescription?: string
  targetDate?: string
  notes?: string
  progressPct?: number
  progressSource?: GoalProgressSource
  currentAmountMinor?: string | number
  targetAmountMinor?: string | number
  currency?: string
  completedAt?: string
}

export interface GetUserGoalsQueryDto {
  status?: UserGoalStatus
  includeArchived?: boolean
  categoryId?: number
  categorySlug?: string
  skip?: number
  take?: number
}

export interface CreateGoalMilestoneDto {
  title: string
  targetDate?: string
  sortOrder?: number
}

export interface UpdateGoalMilestoneDto {
  title?: string
  targetDate?: string
  sortOrder?: number
}

export interface DeliveryZoneConfig {
  id?: number
  uuid: string
  tag: string
  name: string
  state: string
  region?: string | null
  areasCovered?: string | null
  isDelivering: boolean
  deliveryFeeKobo: string
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder: number
}

export function getGoalTitle(goalOrUserGoal?: Goal | UserGoal | null): string {
  if (!goalOrUserGoal) return ''
  if ('userId' in goalOrUserGoal) {
    const ug = goalOrUserGoal as UserGoal
    return (
      ug.customTitle ||
      ug.catalogueGoal?.title ||
      ug.historicalTitle ||
      ug.goal?.title ||
      ug.goal?.name ||
      ''
    ).trim()
  }
  const g = goalOrUserGoal as Goal
  return (g.title || g.name || '').trim()
}

export function getCategoryTitle(
  cat?: GoalCategory | { title?: string; name?: string } | null
): string {
  if (!cat) return ''
  return (cat.title || ('name' in cat && cat.name ? cat.name : '') || '').trim()
}

export function isVendorVerified(vendor?: CommerceVendor | null): boolean {
  if (!vendor) return false
  if (typeof vendor.isVerified === 'boolean') return vendor.isVerified
  return vendor.isActive !== false
}
