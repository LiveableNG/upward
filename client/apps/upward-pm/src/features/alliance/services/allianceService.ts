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
  return request<AlliancePmProfile>('/pm/alliance/profile', { method: 'GET' })
}

export async function updateAllianceProfile(data: { pmTitle?: string; bio?: string }): Promise<AlliancePmProfile> {
  return request<AlliancePmProfile>('/pm/alliance/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function listAllianceListings(params?: ListAllianceListingsParams): Promise<ListAllianceListingsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.targetType) searchParams.set('targetType', params.targetType)
  if (params?.sourceType) searchParams.set('sourceType', params.sourceType)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const qs = searchParams.toString()
  return request<ListAllianceListingsResponse>(`/pm/alliance/listings${qs ? `?${qs}` : ''}`, { method: 'GET' })
}

export async function getAllianceListing(uuid: string): Promise<AllianceListing> {
  return request<AllianceListing>(`/pm/alliance/listings/${uuid}`, { method: 'GET' })
}

export async function createAllianceListing(payload: CreateAllianceListingPayload): Promise<AllianceListing> {
  return request<AllianceListing>('/pm/alliance/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAllianceListing(uuid: string, payload: UpdateAllianceListingPayload): Promise<AllianceListing> {
  return request<AllianceListing>(`/pm/alliance/listings/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function publishAllianceListing(uuid: string): Promise<AllianceListing> {
  return request<AllianceListing>(`/pm/alliance/listings/${uuid}/publish`, {
    method: 'POST',
  })
}

export async function unpublishAllianceListing(uuid: string): Promise<AllianceListing> {
  return request<AllianceListing>(`/pm/alliance/listings/${uuid}/unpublish`, {
    method: 'POST',
  })
}

export async function archiveAllianceListing(uuid: string): Promise<AllianceListing> {
  return request<AllianceListing>(`/pm/alliance/listings/${uuid}/archive`, {
    method: 'POST',
  })
}

export async function requestMediaUploadUrl(
  listingUuid: string,
  payload: { filename: string; mimeType: string; fileSize: number },
): Promise<{ storageKey: string; uploadUrl: string; publicUrl: string; mediaUuid: string; maxFileSize: number }> {
  return request(`/pm/alliance/listings/${listingUuid}/media/upload-url`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function confirmMediaUpload(
  listingUuid: string,
  payload: { storageKey: string; mimeType: string; fileSize: number; publicUrl: string },
): Promise<AllianceListingMedia> {
  return request<AllianceListingMedia>(`/pm/alliance/listings/${listingUuid}/media/confirm`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listListingMedia(listingUuid: string): Promise<AllianceListingMedia[]> {
  return request<AllianceListingMedia[]>(`/pm/alliance/listings/${listingUuid}/media`, { method: 'GET' })
}

export async function reorderListingMedia(listingUuid: string, mediaUuids: string[]): Promise<AllianceListingMedia[]> {
  return request<AllianceListingMedia[]>(`/pm/alliance/listings/${listingUuid}/media/order`, {
    method: 'PATCH',
    body: JSON.stringify({ mediaUuids }),
  })
}

export async function deleteListingMedia(listingUuid: string, mediaUuid: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/pm/alliance/listings/${listingUuid}/media/${mediaUuid}`, {
    method: 'DELETE',
  })
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
  return request<import('../types/alliance.types').DiscoverAllianceListingsResponse>(
    `/pm/alliance/discover${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
}

export async function getDiscoveredListing(uuid: string): Promise<import('../types/alliance.types').AllianceDiscoveredListingDetail> {
  return request<import('../types/alliance.types').AllianceDiscoveredListingDetail>(
    `/pm/alliance/discover/${uuid}`,
    { method: 'GET' },
  )
}
