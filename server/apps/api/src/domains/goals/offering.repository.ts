export type OfferingType = 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'BUNDLE'
export type OfferingPricingModel = 'FIXED' | 'RANGE' | 'STARTING_AT' | 'QUOTE_REQUIRED'
export type GoalPublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type DeliveryCoverageType = 'NATIONWIDE' | 'REGIONAL_ZONES' | 'PICKUP_ONLY'

export interface OfferingMedia {
  id?: number
  uuid: string
  offeringId: number
  mediaUrl: string
  mimeType: string
  sortOrder: number
  isPrimary: boolean
  createdAt?: Date
}

export interface PackageItem {
  id?: number
  uuid: string
  packageId: number
  componentId: number
  quantity: number
  isOptional: boolean
  sortOrder: number
  overridePrice?: number | null
  createdAt?: Date
  component?: Offering
}

export interface Offering {
  id?: number
  uuid: string
  vendorId?: number | null
  type: OfferingType
  pricingModel: OfferingPricingModel
  title: string
  subtitle?: string | null
  description?: string | null
  currency: string
  price?: number | null
  minPrice?: number | null
  maxPrice?: number | null
  inStock: boolean
  stockCount?: number | null
  deliveryAvailable: boolean
  deliveryCoverageType?: DeliveryCoverageType
  deliveryZones?: string[]
  leadTimeDays?: number | null
  status: GoalPublishStatus
  isFeatured: boolean
  isPromoted?: boolean
  promoBadge?: string | null
  promoTitle?: string | null
  promoSubtitle?: string | null
  promoCoverImage?: string | null
  promoPriority?: number
  createdAt?: Date
  updatedAt?: Date
  vendor?: any
  media?: OfferingMedia[]
  packageItems?: PackageItem[]
  partOfPackages?: PackageItem[]
  goalLinks?: any[]
}

export interface FindOfferingsFilter {
  goalId?: number
  type?: OfferingType
  status?: GoalPublishStatus
  vendorId?: number
  isFeatured?: boolean
  isPromoted?: boolean
  minPrice?: number
  maxPrice?: number
  search?: string
  skip?: number
  take?: number
}

export interface OfferingRepository {
  findOfferings(filter?: FindOfferingsFilter): Promise<{ items: Offering[]; total: number }>
  findOfferingById(id: number): Promise<Offering | null>
  findOfferingByUuid(uuid: string): Promise<Offering | null>
  createOffering(data: Partial<Offering>, media?: Array<Partial<OfferingMedia>>, packageItems?: Array<{ componentId: number; quantity: number; isOptional?: boolean; overridePrice?: number }>): Promise<Offering>
  updateOffering(id: number, data: Partial<Offering>, media?: Array<Partial<OfferingMedia>>): Promise<Offering>
  deleteOffering(id: number): Promise<void>
  addMedia(offeringId: number, media: Partial<OfferingMedia>): Promise<OfferingMedia>
  removeMedia(mediaId: number): Promise<void>
  setPackageItems(packageId: number, items: Array<{ componentId: number; quantity: number; isOptional?: boolean; overridePrice?: number }>): Promise<PackageItem[]>
}

export const OFFERING_REPOSITORY = Symbol('OFFERING_REPOSITORY')

