export type GoalStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type UserGoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'ARCHIVED'
export type OfferingType = 'PRODUCT' | 'SERVICE' | 'BUNDLE' | 'PACKAGE'

export type GoalTargetType =
  | 'AMOUNT'
  | 'DEADLINE'
  | 'HYBRID'
  | 'CHECKLIST_ACTIONS'
  | 'RECURRING_HABIT'
  | 'VERIFICATION'

export interface GoalActionTemplate {
  id: number
  goalId: number
  title: string
  description?: string | null
  sortOrder: number
  isRequired: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UserGoalAction {
  id: string
  label: string
  done: boolean
  sortOrder?: number
}

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
  status: GoalStatus
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
  isPromoted?: boolean
  promoBadge?: string | null
  promoTitle?: string | null
  promoSubtitle?: string | null
  promoCoverImage?: string | null
  promoPriority?: number
  status: GoalStatus
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
  targetType?: GoalTargetType
  defaultDurationDays?: number | null
  suggestedAmountKobo?: string | number | null
  isFeatured?: boolean
  sortOrder: number
  status: GoalStatus
  category?: GoalCategory
  offerings?: GoalOfferingLink[]
  actionTemplates?: GoalActionTemplate[]
  createdAt?: string
  updatedAt?: string
}

export interface UserGoal {
  id: number
  uuid?: string
  userId: number
  goalId?: number | null
  categorySlug?: string | null
  title?: string | null
  icon?: string | null
  targetType?: GoalTargetType
  durationDays?: number | null
  targetAmountKobo?: string | number | null
  savedAmountKobo?: string | number | null
  actions?: UserGoalAction[] | null
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

export interface UpdateUserGoalData {
  status?: UserGoalStatus
  progressPct?: number
  targetDate?: string
  notes?: string
  completedAt?: string
}

export interface CreateCustomGoalInput {
  title: string
  categorySlug?: string
  icon?: string
  targetType?: GoalTargetType
  durationDays?: number
  durationWeeks?: number
  targetAmountKobo?: string | number
  actions?: string[]
}

export interface SubmitQuestionnaireInput {
  categorySlug: string
  goalSlug?: string
  answers: Record<string, any>
  durationDays?: number
  durationWeeks?: number
  targetAmountKobo?: string | number
}

export function getGoalTitle(goal?: Goal | null): string {
  if (!goal) return ''
  return (goal.title || goal.name || '').trim()
}

export function getCategoryTitle(cat?: GoalCategory | null): string {
  if (!cat) return ''
  return (cat.title || cat.name || '').trim()
}

export function isVendorVerified(vendor?: CommerceVendor | null): boolean {
  if (!vendor) return false
  if (typeof vendor.isVerified === 'boolean') return vendor.isVerified
  return vendor.isActive !== false
}
