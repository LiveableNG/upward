export type AllianceListingIntent = 'RENT' | 'SALE';
export type AllianceTargetType = 'PROPERTY' | 'UNIT';

export interface PublicPmQualification {
  code: string;
  title: string;
  category: string;
  badgeIcon?: string | null;
}

export interface PublicPmProfile {
  uuid: string;
  displayName: string;
  companyName?: string | null;
  pmTitle?: string | null;
  bio?: string | null;
  qualifications: PublicPmQualification[];
}

export interface PublicRatingSummary {
  averageScore: number;
  totalRatings: number;
}

export interface PublicAllianceListingMedia {
  uuid: string;
  publicUrl: string;
  mimeType: string;
  sortOrder: number;
}

export interface PublicAllianceListingCard {
  uuid: string;
  title: string;
  description?: string | null;
  intent: AllianceListingIntent;
  targetType: AllianceTargetType;
  price?: number | null;
  currency: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  primaryMedia?: PublicAllianceListingMedia | null;
  mediaCount: number;
  pm: PublicPmProfile;
  ratingSummary?: PublicRatingSummary;
  publishedAt?: string | null;
}

export interface PublicAllianceListingDetail extends PublicAllianceListingCard {
  media: PublicAllianceListingMedia[];
  unitName?: string | null;
  propertyName?: string | null;
}

export interface PublicAllianceReferralContext {
  referralUuid: string;
  shareToken: string;
  status: string;
  clientName: string;
  listing: PublicAllianceListingDetail;
  referringPm: PublicPmProfile;
}

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchPublicListings(
  params: Record<string, string | number | boolean | undefined | null> = {},
): Promise<{
  items: PublicAllianceListingCard[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  try {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.set(k, String(v));
      }
    });
    const url = `${getApiUrl()}/public/alliance/listings${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    const payload = await res.json();
    return {
      items: payload.data || [],
      meta: payload.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    };
  } catch (err) {
    console.error('Failed to fetch public alliance listings', err);
    return { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  }
}

export async function fetchPublicListingDetail(
  uuid: string,
): Promise<PublicAllianceListingDetail | null> {
  try {
    const url = `${getApiUrl()}/public/alliance/listings/${uuid}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.data || null;
  } catch (err) {
    console.error(`Failed to fetch public listing detail for ${uuid}`, err);
    return null;
  }
}

export async function fetchReferralContext(
  shareToken: string,
): Promise<PublicAllianceReferralContext | null> {
  try {
    const url = `${getApiUrl()}/public/alliance/referrals/${shareToken}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.data || null;
  } catch (err) {
    console.error(`Failed to resolve referral token ${shareToken}`, err);
    return null;
  }
}

export async function submitInquiry(
  listingUuid: string,
  data: {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    message: string;
    referralToken?: string;
  },
): Promise<{ success: boolean; message: string }> {
  const url = `${getApiUrl()}/public/alliance/listings/${listingUuid}/inquiries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit inquiry');
  }
  return res.json();
}
