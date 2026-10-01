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
  ratingSummary?: {
    averageScore: number
    totalRatings: number
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

// Stage 2: Referral & Lead Types
export type AllianceReferralStatus = 'ACTIVE' | 'CONVERTED' | 'CLOSED'
export type AllianceLeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'VIEWING'
  | 'APPLICATION'
  | 'CONVERTED'
  | 'LOST'

export interface AllianceReferral {
  id: number
  uuid: string
  shareToken?: string
  referralToken?: string
  listingId: number
  referringPmId: number
  matchedUserId: number | null
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  clientNotes?: string | null
  notes?: string | null
  status: AllianceReferralStatus
  stage?: AllianceLeadStage
  leadStage?: AllianceLeadStage
  stageUpdatedAt?: string
  convertedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  shareUrl?: string
  listing?: {
    id: number
    uuid: string
    title: string
    intent: AllianceListingIntent
    targetType: AllianceTargetType
    propertyType: string | null
    price: number
    currency: string
    status: AllianceListingStatus
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    primaryMedia?: {
      uuid: string
      fileUrl?: string
      publicUrl?: string
    } | null
    pm?: {
      id: number
      uuid: string
      name: string
      companyName?: string | null
    }
  }
  matchedUser?: {
    id: number
    uuid: string
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
  } | null
}

export interface CreateAllianceReferralPayload {
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  clientNotes?: string
  notes?: string
}

export interface UpdateAllianceLeadStagePayload {
  stage?: AllianceLeadStage
  leadStage?: AllianceLeadStage
  notes?: string
}

export interface CloseAllianceReferralPayload {
  reason?: string
}

export interface ListAllianceReferralsParams {
  status?: AllianceReferralStatus | 'ALL'
  stage?: AllianceLeadStage | 'ALL'
  leadStage?: AllianceLeadStage | 'ALL'
  search?: string
  page?: number
  limit?: number
}

export interface ListAllianceReferralsResponse {
  items: AllianceReferral[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Stage 3: Commission & Rating Types
export type AllianceCommissionStatus = 'PENDING' | 'EARNED' | 'PAYABLE' | 'PAID' | 'REVERSED'
export type AllianceCommissionType = 'PERCENTAGE' | 'FIXED'

export interface AllianceCommission {
  id: number
  uuid: string
  referralId: number
  referringPmId: number
  listingId: number
  sourceTransactionId: number | null
  sourceRentPaymentId: number | null
  transactionReference: string | null
  commissionType: AllianceCommissionType
  sourceAmount: number
  commissionRate: number
  commissionAmount: number
  currency: string
  status: AllianceCommissionStatus
  notes: string | null
  earnedAt: string
  payableAt: string | null
  paidAt: string | null
  reversedAt: string | null
  reversalReason: string | null
  createdAt: string
  updatedAt: string
  referral?: AllianceReferral
  listing?: {
    id: number
    uuid: string
    title: string
    price: number
    currency: string
    city: string | null
    state: string | null
  }
  referringPm?: {
    id: number
    uuid: string
    name: string
    companyName?: string | null
  }
}

export interface AllianceCommissionStats {
  totalEarned: number
  totalPayable: number
  totalPaid: number
  totalPending: number
  count: number
}

export interface ListAllianceCommissionsParams {
  status?: AllianceCommissionStatus
  listingUuid?: string
  search?: string
  page?: number
  limit?: number
}

export interface ListAllianceCommissionsResponse {
  items: AllianceCommission[]
  stats: AllianceCommissionStats
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ConvertAllianceReferralPayload {
  sourceAmount: number
  sourceTransactionId?: number
  transactionReference?: string
  commissionRate?: number
  commissionType?: AllianceCommissionType
  notes?: string
}

export interface ConvertAllianceReferralResponse {
  referral: AllianceReferral
  commission: AllianceCommission
  isNew: boolean
}

export type AllianceRatingAuthorType = 'PM' | 'CLIENT'
export type AllianceRatingSubjectType = 'CLIENT' | 'PM' | 'LISTING'

export interface AllianceRating {
  id: number
  uuid: string
  referralId: number
  authorType: AllianceRatingAuthorType
  authorPmId: number | null
  authorUserId: number | null
  subjectType: AllianceRatingSubjectType
  subjectPmId: number | null
  subjectUserId: number | null
  subjectListingId: number | null
  score: number
  review: string | null
  createdAt: string
  updatedAt: string
  authorPm?: {
    name: string
    companyName?: string | null
  } | null
  authorUser?: {
    firstName: string
    lastName: string
  } | null
}

export interface AllianceRatingSummary {
  averageScore: number
  totalRatings: number
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface SubmitAllianceRatingPayload {
  referralUuid: string
  score: number
  review?: string
}
