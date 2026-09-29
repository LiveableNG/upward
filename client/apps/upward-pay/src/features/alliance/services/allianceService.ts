import { request } from '@/lib/api-client';
import type {
  PublicAllianceListingCard,
  PublicAllianceListingDetail,
  PublicAllianceReferralContext,
  PublicAllianceMarketplaceQuery,
  SubmitAllianceInquiryData,
  SubmitClientRatingData,
} from '../types/alliance.types';

export async function fetchMarketplaceListings(
  query: PublicAllianceMarketplaceQuery = {},
): Promise<{
  data: PublicAllianceListingCard[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.intent) params.set('intent', query.intent);
  if (query.targetType) params.set('targetType', query.targetType);
  if (query.propertyType) params.set('propertyType', query.propertyType);
  if (query.city) params.set('city', query.city);
  if (query.state) params.set('state', query.state);
  if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
  if (query.bedrooms !== undefined) params.set('bedrooms', String(query.bedrooms));
  if (query.bathrooms !== undefined) params.set('bathrooms', String(query.bathrooms));
  if (query.search) params.set('search', query.search);
  if (query.sortBy) params.set('sortBy', query.sortBy);

  const qs = params.toString();
  const url = `/public/alliance/listings${qs ? `?${qs}` : ''}`;
  const res = await request<any>(url, { method: 'GET' });
  return {
    data: res.data || [],
    meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function fetchMarketplaceListingDetail(
  uuid: string,
): Promise<PublicAllianceListingDetail> {
  const res = await request<any>(`/public/alliance/listings/${uuid}`, { method: 'GET' });
  return res.data || res;
}

export async function resolveReferralContext(
  shareToken: string,
): Promise<PublicAllianceReferralContext> {
  const res = await request<any>(`/public/alliance/referrals/${shareToken}`, { method: 'GET' });
  return res.data || res;
}

export async function submitAllianceInquiry(
  listingUuid: string,
  data: SubmitAllianceInquiryData,
): Promise<{ success: boolean; message: string; referralUuid?: string }> {
  const res = await request<any>(`/public/alliance/listings/${listingUuid}/inquiries`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data || res;
}

export async function submitClientAllianceRating(
  data: SubmitClientRatingData,
): Promise<any> {
  const res = await request<any>('/user/alliance/ratings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data || res;
}
