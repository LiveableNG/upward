import { request } from '@/lib/api-client'
import {
  AlliancePmProfile,
  AllianceListing,
  AllianceListingMedia,
  CreateAllianceListingPayload,
  UpdateAllianceListingPayload,
  ListAllianceListingsParams,
  ListAllianceListingsResponse,
} from '../types/alliance.types'

export async function getAllianceProfile(): Promise<AlliancePmProfile> {
  const res = await request<any>('/pm/alliance/profile', { method: 'GET' })
  return (res?.data ?? res) as AlliancePmProfile
}

export async function updateAllianceProfile(data: { pmTitle?: string; bio?: string }): Promise<AlliancePmProfile> {
  const res = await request<any>('/pm/alliance/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return (res?.data ?? res) as AlliancePmProfile
}

export async function listAllianceListings(params?: ListAllianceListingsParams): Promise<ListAllianceListingsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.targetType) searchParams.set('targetType', params.targetType)
  if (params?.sourceType) searchParams.set('sourceType', params.sourceType)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const qs = searchParams.toString()
  const res = await request<any>(`/pm/alliance/listings${qs ? `?${qs}` : ''}`, { method: 'GET' })
  return (res?.data ?? res) as ListAllianceListingsResponse
}

export async function getAllianceListing(uuid: string): Promise<AllianceListing> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}`, { method: 'GET' })
  return (res?.data ?? res) as AllianceListing
}

export async function createAllianceListing(payload: CreateAllianceListingPayload): Promise<AllianceListing> {
  const res = await request<any>('/pm/alliance/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (res?.data ?? res) as AllianceListing
}

export async function updateAllianceListing(uuid: string, payload: UpdateAllianceListingPayload): Promise<AllianceListing> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return (res?.data ?? res) as AllianceListing
}

export async function publishAllianceListing(uuid: string): Promise<AllianceListing> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}/publish`, {
    method: 'POST',
  })
  return (res?.data ?? res) as AllianceListing
}

export async function unpublishAllianceListing(uuid: string): Promise<AllianceListing> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}/unpublish`, {
    method: 'POST',
  })
  return (res?.data ?? res) as AllianceListing
}

export async function archiveAllianceListing(uuid: string): Promise<AllianceListing> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}/archive`, {
    method: 'POST',
  })
  return (res?.data ?? res) as AllianceListing
}

export async function requestMediaUploadUrl(
  listingUuid: string,
  payload: { filename: string; mimeType: string; fileSize: number },
): Promise<{ storageKey: string; uploadUrl: string; publicUrl: string; mediaUuid: string; maxFileSize: number }> {
  const res = await request<any>(`/pm/alliance/listings/${listingUuid}/media/upload-url`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (res?.data ?? res)
}

export async function confirmMediaUpload(
  listingUuid: string,
  payload: { storageKey: string; mimeType: string; fileSize: number; publicUrl: string },
): Promise<AllianceListingMedia> {
  const res = await request<any>(`/pm/alliance/listings/${listingUuid}/media/confirm`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (res?.data ?? res) as AllianceListingMedia
}

export async function listListingMedia(listingUuid: string): Promise<AllianceListingMedia[]> {
  const res = await request<any>(`/pm/alliance/listings/${listingUuid}/media`, { method: 'GET' })
  return (res?.data ?? res) as AllianceListingMedia[]
}

export async function reorderListingMedia(listingUuid: string, mediaUuids: string[]): Promise<AllianceListingMedia[]> {
  const res = await request<any>(`/pm/alliance/listings/${listingUuid}/media/order`, {
    method: 'PATCH',
    body: JSON.stringify({ mediaUuids }),
  })
  return (res?.data ?? res) as AllianceListingMedia[]
}

export async function deleteListingMedia(listingUuid: string, mediaUuid: string): Promise<{ success: boolean }> {
  const res = await request<any>(`/pm/alliance/listings/${listingUuid}/media/${mediaUuid}`, {
    method: 'DELETE',
  })
  return (res?.data ?? res)
}

export async function discoverListings(params?: import('../types/alliance.types').DiscoverAllianceListingsParams): Promise<import('../types/alliance.types').DiscoverAllianceListingsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.intent) searchParams.set('intent', params.intent)
  if (params?.targetType) searchParams.set('targetType', params.targetType)
  if (params?.propertyType) searchParams.set('propertyType', params.propertyType)
  if (params?.city) searchParams.set('city', params.city)
  if (params?.state) searchParams.set('state', params.state)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const qs = searchParams.toString()
  const res = await request<any>(
    `/pm/alliance/discover${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').DiscoverAllianceListingsResponse
}

export async function getDiscoveredListing(uuid: string): Promise<import('../types/alliance.types').AllianceDiscoveredListingDetail> {
  const res = await request<any>(
    `/pm/alliance/discover/${uuid}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceDiscoveredListingDetail
}

export async function trackAllianceListing(uuid: string): Promise<{ success: boolean; isTracked: boolean }> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}/track`, {
    method: 'POST',
  })
  return (res?.data ?? res)
}

export async function untrackAllianceListing(uuid: string): Promise<{ success: boolean; isTracked: boolean }> {
  const res = await request<any>(`/pm/alliance/listings/${uuid}/track`, {
    method: 'DELETE',
  })
  return (res?.data ?? res)
}

// Stage 2: Referral & Lead API
export async function createAllianceReferral(
  listingUuid: string,
  payload: import('../types/alliance.types').CreateAllianceReferralPayload,
): Promise<import('../types/alliance.types').AllianceReferral> {
  const res = await request<any>(
    `/pm/alliance/listings/${listingUuid}/referrals`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceReferral
}

export async function listAllianceReferrals(
  params?: import('../types/alliance.types').ListAllianceReferralsParams,
): Promise<import('../types/alliance.types').ListAllianceReferralsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.leadStage) searchParams.set('leadStage', params.leadStage)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const qs = searchParams.toString()
  const res = await request<any>(
    `/pm/alliance/referrals${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').ListAllianceReferralsResponse
}

export async function getAllianceReferral(
  uuid: string,
): Promise<import('../types/alliance.types').AllianceReferral> {
  const res = await request<any>(
    `/pm/alliance/referrals/${uuid}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceReferral
}

export async function updateAllianceLeadStage(
  uuid: string,
  payload: import('../types/alliance.types').UpdateAllianceLeadStagePayload,
): Promise<import('../types/alliance.types').AllianceReferral> {
  const res = await request<any>(
    `/pm/alliance/referrals/${uuid}/stage`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceReferral
}

export async function closeAllianceReferral(
  uuid: string,
  payload?: import('../types/alliance.types').CloseAllianceReferralPayload,
): Promise<import('../types/alliance.types').AllianceReferral> {
  const res = await request<any>(
    `/pm/alliance/referrals/${uuid}/close`,
    {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceReferral
}

// Stage 3: Commission & Rating API
export async function convertAllianceReferral(
  uuid: string,
  payload: import('../types/alliance.types').ConvertAllianceReferralPayload,
): Promise<import('../types/alliance.types').ConvertAllianceReferralResponse> {
  const res = await request<any>(
    `/pm/alliance/referrals/${uuid}/convert`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return (res?.data ?? res) as import('../types/alliance.types').ConvertAllianceReferralResponse
}

export async function listAllianceCommissions(
  params?: import('../types/alliance.types').ListAllianceCommissionsParams,
): Promise<import('../types/alliance.types').ListAllianceCommissionsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.listingUuid) searchParams.set('listingUuid', params.listingUuid)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const qs = searchParams.toString()
  const res = await request<any>(
    `/pm/alliance/commissions${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').ListAllianceCommissionsResponse
}

export async function getAllianceCommission(
  uuid: string,
): Promise<import('../types/alliance.types').AllianceCommission> {
  const res = await request<any>(
    `/pm/alliance/commissions/${uuid}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceCommission
}

export async function submitAllianceRating(
  payload: import('../types/alliance.types').SubmitAllianceRatingPayload,
): Promise<import('../types/alliance.types').AllianceRating> {
  const res = await request<any>(
    '/pm/alliance/ratings',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceRating
}

export async function getSubjectRatingSummary(
  subjectType: string,
  subjectId: number,
): Promise<import('../types/alliance.types').AllianceRatingSummary> {
  const res = await request<any>(
    `/pm/alliance/ratings/summary?subjectType=${subjectType}&subjectId=${subjectId}`,
    { method: 'GET' },
  )
  return (res?.data ?? res) as import('../types/alliance.types').AllianceRatingSummary
}
