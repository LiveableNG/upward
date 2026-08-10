import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { UpwardSubscriptionTier } from '@prisma/client';

export enum FeatureKey {
  TENANCY_DATA_UPLOAD = 'TENANCY_DATA_UPLOAD',
  RENT_COLLECTION = 'RENT_COLLECTION',
  DOCUMENT_MANAGEMENT = 'DOCUMENT_MANAGEMENT',
  SERVICE_CHARGE_PAYMENTS = 'SERVICE_CHARGE_PAYMENTS',
  LISTING_BROKERAGE = 'LISTING_BROKERAGE',
  BRANDING = 'BRANDING',
}

export interface FeatureGateResult {
  hasAccess: boolean;
  requiredTier: UpwardSubscriptionTier;
  reason?: 'NOT_SUBSCRIBED' | 'GRACE_EXPIRED' | 'LOCKED';
  limit?: number; // Capped usage limit (e.g. 0.3 for 30% listing limit)
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  private getRequiredTier(feature: FeatureKey): UpwardSubscriptionTier {
    switch (feature) {
      case FeatureKey.TENANCY_DATA_UPLOAD:
      case FeatureKey.RENT_COLLECTION:
        return UpwardSubscriptionTier.FREE;
      case FeatureKey.DOCUMENT_MANAGEMENT:
      case FeatureKey.SERVICE_CHARGE_PAYMENTS:
        return UpwardSubscriptionTier.TIER_2;
      case FeatureKey.LISTING_BROKERAGE:
        return UpwardSubscriptionTier.TIER_2;
      case FeatureKey.BRANDING:
        return UpwardSubscriptionTier.TIER_3;
      default:
        return UpwardSubscriptionTier.FREE;
    }
  }

  async checkAccess(pmId: number, feature: FeatureKey): Promise<FeatureGateResult> {
    if (process.env.DISABLE_SUBSCRIPTIONS === 'true') {
      return { hasAccess: true, requiredTier: UpwardSubscriptionTier.FREE };
    }

    const sub = await this.prisma.upward_subscription.findUnique({
      where: { pmId },
    });

    const currentTier = sub?.tier ?? UpwardSubscriptionTier.FREE;
    const requiredTier = this.getRequiredTier(feature);

    if (sub && sub.status === 'LOCKED' && requiredTier !== UpwardSubscriptionTier.FREE) {
      return { hasAccess: false, requiredTier, reason: 'LOCKED' };
    }

    if (requiredTier === UpwardSubscriptionTier.FREE) {
      return { hasAccess: true, requiredTier };
    }

    if (currentTier === UpwardSubscriptionTier.FREE) {
      return { hasAccess: false, requiredTier, reason: 'NOT_SUBSCRIBED' };
    }

    if (feature === FeatureKey.LISTING_BROKERAGE) {
      if (currentTier === UpwardSubscriptionTier.TIER_2) {
        return { hasAccess: true, requiredTier, limit: 0.3 };
      }
      if (currentTier === UpwardSubscriptionTier.TIER_3) {
        return { hasAccess: true, requiredTier, limit: 1.0 };
      }
    }

    return { hasAccess: true, requiredTier };
  }
}
