import { request } from '@/lib/api-client'
import {
  AlliancePmProfile,
  AllianceListing,
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
