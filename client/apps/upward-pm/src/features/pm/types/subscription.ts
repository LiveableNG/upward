export enum FeatureKey {
  TENANCY_DATA_UPLOAD = 'TENANCY_DATA_UPLOAD',
  RENT_COLLECTION = 'RENT_COLLECTION',
  DOCUMENT_MANAGEMENT = 'DOCUMENT_MANAGEMENT',
  SERVICE_CHARGE_PAYMENTS = 'SERVICE_CHARGE_PAYMENTS',
  LISTING_BROKERAGE = 'LISTING_BROKERAGE',
  BRANDING = 'BRANDING',
}

export type SubscriptionTier = 'FREE' | 'TIER_2' | 'TIER_3';

export interface Subscription {
  id: number;
  uuid: string;
  pmId: number;
  tier: SubscriptionTier;
  priceYearly: number;
  priceMonthly: number;
  unitBillingMode: 'active' | 'all';
  anniversaryDate: number | null;
  gracePeriodDays: number;
  status: 'ACTIVE' | 'GRACE' | 'LOCKED';
  graceStartedAt: string | null;
  isInitialDepositPaid: boolean;
  pendingTier?: SubscriptionTier | null;
  pendingUnitBillingMode?: 'active' | 'all' | null;
}

export interface Wallet {
  id: number;
  uuid: string;
  balance: number;
  currency: string;
  isActive: boolean;
}
