'use client';

import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { FeatureKey } from '@/features/pm/types/subscription';
import { usePricingModal } from '@/features/pm/hooks/usePricingModal';
import '@/styles/features/subscription-gate.css';

interface LockedFeaturePlaceholderProps {
  feature: FeatureKey;
  requiredTier: string;
  reason?: string;
}

export function LockedFeaturePlaceholder({ feature, requiredTier, reason }: LockedFeaturePlaceholderProps) {
  const { openPricing } = usePricingModal();

  const getFeatureFriendlyName = () => {
    switch (feature) {
      case FeatureKey.DOCUMENT_MANAGEMENT:
        return 'Document Management & Templates';
      case FeatureKey.SERVICE_CHARGE_PAYMENTS:
        return 'Service Charge Payments';
      case FeatureKey.LISTING_BROKERAGE:
        return 'Listing & Brokerage Announcements';
      default:
        return 'Premium Property Feature';
    }
  };

  const getWarningText = () => {
    if (reason === 'LOCKED') {
      return 'Access suspended due to overdue invoice. Please fund your wallet to restore access and retrieve your data.';
    }
    return `This feature is part of Upward Professional (Tier 2). Upgrade your subscription to restore access and activate data.`;
  };

  return (
    <div className="subscription-gate">
      <div className="subscription-gate__overlay" />
      <div className="subscription-gate__content">
        <div className="subscription-gate__icon-container">
          <Lock className="subscription-gate__icon" size={24} />
        </div>
        <h3 className="subscription-gate__title">
          {getFeatureFriendlyName()}
        </h3>
        <p className="subscription-gate__text">
          {getWarningText()}
        </p>
        <button className="subscription-gate__btn" onClick={openPricing}>
          <Sparkles size={16} />
          View Subscription Plans
        </button>
      </div>
    </div>
  );
}
