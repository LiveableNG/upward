export type AllianceSourceType = 'LINKED_INVENTORY' | 'INDEPENDENT'
export type AllianceTargetType = 'PROPERTY' | 'UNIT'
export type AllianceListingIntent = 'RENT' | 'SALE'
export type AllianceListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED'
export type AllianceListingVisibility = 'ALLIANCE' | 'PRIVATE'

export interface AllianceQualification {
  id: number
  uuid: string
  slug: string
  name: string
  description?: string | null
  assignedAt: string
}

export interface AlliancePmProfile {
  id: number
  uuid: string
  pmId: number
  pmUuid?: string
  isEnabled: boolean
  enabledAt?: string | null
  disabledAt?: string | null
  pmTitle?: string | null
  bio?: string | null
  qualifications: AllianceQualification[]
}

export interface AllianceListing {
  id: number
  uuid: string
  pmId: number
  sourceType: AllianceSourceType
  targetType: AllianceTargetType
  intent: AllianceListingIntent
  status: AllianceListingStatus
  visibility: AllianceListingVisibility
  targetPropertyId: number | null
  targetUnitId: number | null
  isSourceDeleted: boolean
  sourceDeletedAt: string | null
  title: string
  description: string | null
  currency: string
  price: number
  address: string | null
  city: string | null
  state: string | null
  country: string
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  unpublishedAt: string | null
  archivedAt: string | null
  targetProperty?: {
    id: number
    uuid: string
    name: string
    address: string | null
  } | null
  targetUnit?: {
    id: number
    uuid: string
    unitName: string
    rentAmount: number
    status?: string | null
    propertyId: number
    property?: {
      id: number
      uuid: string
      name: string
    }
  } | null
  media?: AllianceListingMedia[]
  trackerCount?: number
}

export interface AllianceListingMedia {
  id: number
  uuid: string
  listingId: number
  storageKey: string
  publicUrl: string
  mimeType: string
  fileSize: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface RequestMediaUploadPayload {
  filename: string
  mimeType: string
  fileSize: number
}

export interface UploadUrlResponse {
  storageKey: string
  uploadUrl: string
  publicUrl: string
  mediaUuid: string
  maxFileSize: number
}

export interface ConfirmMediaUploadPayload {
  storageKey: string
  mimeType: string
  fileSize: number
  publicUrl: string
}

export interface CreateAllianceListingPayload {
  sourceType: AllianceSourceType
  targetType: AllianceTargetType
  intent?: AllianceListingIntent
  visibility?: AllianceListingVisibility
  targetPropertyUuid?: string
  targetUnitUuid?: string
  title: string
  description?: string
  currency?: string
  price?: number
  address?: string
  city?: string
  state?: string
  country?: string
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
}

export interface UpdateAllianceListingPayload {
  title?: string
  description?: string
  currency?: string
  price?: number
  intent?: AllianceListingIntent
  visibility?: AllianceListingVisibility
  address?: string
  city?: string
  state?: string
  country?: string
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
}

export interface ListAllianceListingsParams {
  status?: AllianceListingStatus
  targetType?: AllianceTargetType
  sourceType?: AllianceSourceType
  page?: number
  limit?: number
}

export interface ListAllianceListingsResponse {
  items: AllianceListing[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Stage 1E: Discovery Types
export interface DiscoverAllianceOwnerPm {
  uuid: string
  name: string
  companyName?: string | null
  allianceTitle?: string | null
  allianceBio?: string | null
  qualifications: {
    code?: string
    name: string
    description?: string | null
    icon?: string | null
    slug?: string
  }[]
}

export interface AllianceDiscoveredListingSummary {
  id?: number
  uuid: string
  title: string
  headline?: string | null
  description: string | null
  intent: AllianceListingIntent
  targetType: AllianceTargetType
  sourceType: AllianceSourceType
  propertyType?: string | null
  price: number
  currency: string
  rentPeriod?: string | null
  state?: string | null
  city?: string | null
  area?: string | null
  address?: string | null
  country?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  toilets?: number | null
  visibility: AllianceListingVisibility
  publishedAt?: string | null
  primaryMedia?: {
    uuid: string
    fileUrl?: string
    publicUrl?: string
    mediaType?: string
    caption?: string | null
  } | null
  mediaCount?: number
  media?: AllianceListingMedia[]
  targetProperty?: {
    id: number
    uuid: string
    name: string
    address: string | null
  } | null
  targetUnit?: {
    id: number
    uuid: string
    unitName: string
    rentAmount: number
    status?: string | null
    propertyId: number
    property?: {
      id: number
      uuid: string
      name: string
    }
  } | null
  pm?: {
    id: number
    uuid: string
    name: string
    companyName?: string | null
    allianceProfile?: {
      pmTitle?: string | null
      bio?: string | null
      isEnabled: boolean
    } | null
    qualifications?: {
      qualification: {
        id: number
        uuid: string
        name: string
        slug: string
        description?: string | null
        isActive: boolean
      }
    }[]
  }
  trackerCount?: number
  isTrackedByCurrentPm?: boolean
}

export interface TrackAllianceListingResponse {
  success: boolean
  isTracked: boolean
}

export interface AllianceDiscoveredListingDetail extends AllianceDiscoveredListingSummary {
  canonicalContext?: {
    isLinked: boolean
    propertyTitle?: string | null
    unitNumber?: string | null
    unitStatus?: string | null
  } | null
}

export interface DiscoverAllianceListingsParams {
  intent?: AllianceListingIntent
  targetType?: AllianceTargetType
  propertyType?: string
  city?: string
  state?: string
  search?: string
  sortBy?: 'newest' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

export interface DiscoverAllianceListingsResponse {
  items: AllianceDiscoveredListingSummary[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
