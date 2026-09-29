export type AllianceSourceType = 'LINKED_INVENTORY' | 'INDEPENDENT'
export type AllianceTargetType = 'PROPERTY' | 'UNIT'
export type AllianceListingIntent = 'RENT' | 'SALE'
export type AllianceListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED'

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
    propertyId: number
    property?: {
      id: number
      uuid: string
      name: string
    }
  } | null
  media?: AllianceListingMedia[]
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
