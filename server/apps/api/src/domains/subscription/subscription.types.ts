export enum FeatureKey {
  TENANCY_DATA_UPLOAD = 'TENANCY_DATA_UPLOAD',
  RENT_COLLECTION = 'RENT_COLLECTION',
  DOCUMENT_MANAGEMENT = 'DOCUMENT_MANAGEMENT',
  SERVICE_CHARGE_PAYMENTS = 'SERVICE_CHARGE_PAYMENTS',
  LISTING_BROKERAGE = 'LISTING_BROKERAGE',
  BRANDING = 'BRANDING',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export interface FeatureGateResult {
  hasAccess: boolean;
  requiredTier: SubscriptionTier | string;
  reason?: 'NOT_SUBSCRIBED' | 'GRACE_EXPIRED' | 'LOCKED';
  limit?: number; // Capped usage limit (e.g. 0.3 for 30% listing limit)
}
