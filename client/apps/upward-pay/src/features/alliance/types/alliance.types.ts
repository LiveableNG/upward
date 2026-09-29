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

export interface PublicAllianceMarketplaceQuery {
  page?: number;
  limit?: number;
  intent?: AllianceListingIntent;
  targetType?: AllianceTargetType;
  propertyType?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  search?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export interface SubmitAllianceInquiryData {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  message: string;
  referralToken?: string;
}

export interface SubmitClientRatingData {
  referralUuid: string;
  score: number;
  review?: string;
}
