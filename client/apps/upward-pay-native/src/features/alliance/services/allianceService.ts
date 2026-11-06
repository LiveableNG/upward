import { request } from '@/lib/api-client'

import type {
  PublicAllianceListingCard,
  PublicAllianceListingDetail,
  PublicAllianceMarketplaceQuery,
  SubmitAllianceInquiryData,
} from '@/features/alliance/types'

function unwrapListings(res: unknown): {
  data: PublicAllianceListingCard[]
  meta: { page: number; limit: number; total: number; totalPages: number }
} {
  const body = res as Record<string, unknown>
  const data = (body.data ?? body) as PublicAllianceListingCard[]
  const meta = (body.meta ?? {
    page: 1,
    limit: 20,
    total: Array.isArray(data) ? data.length : 0,
    totalPages: 1,
  }) as { page: number; limit: number; total: number; totalPages: number }
  return { data: Array.isArray(data) ? data : [], meta }
}

export async function fetchMarketplaceListings(query: PublicAllianceMarketplaceQuery = {}) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.intent) params.set('intent', query.intent)
  if (query.city) params.set('city', query.city)
  if (query.bedrooms !== undefined) params.set('bedrooms', String(query.bedrooms))
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)

  const qs = params.toString()
  const url = `/public/alliance/listings${qs ? `?${qs}` : ''}`
  const res = await request<unknown>(url, { method: 'GET' })
  return unwrapListings(res)
}

export async function fetchMarketplaceListingDetail(
  uuid: string,
): Promise<PublicAllianceListingDetail> {
  const res = await request<unknown>(`/public/alliance/listings/${encodeURIComponent(uuid)}`, {
    method: 'GET',
  })
  const body = res as Record<string, unknown>
  if (body.data && typeof body.data === 'object') {
    return body.data as PublicAllianceListingDetail
  }
  return res as PublicAllianceListingDetail
}

export async function submitAllianceInquiry(
  listingUuid: string,
  data: SubmitAllianceInquiryData,
): Promise<{ success: boolean; message: string; referralUuid?: string }> {
  const res = await request<unknown>(
    `/public/alliance/listings/${encodeURIComponent(listingUuid)}/inquiries`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  const body = res as Record<string, unknown>
  if (body.data && typeof body.data === 'object') {
    return body.data as { success: boolean; message: string; referralUuid?: string }
  }
  return res as { success: boolean; message: string; referralUuid?: string }
}
