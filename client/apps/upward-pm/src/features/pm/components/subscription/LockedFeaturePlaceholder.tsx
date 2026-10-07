'use client';

import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { FeatureKey } from '@/features/pm/types/subscription';
import { usePricingModal } from '@/features/pm/hooks/usePricingModal';
import '@/styles/features/subscription-gate.css';

interface LockedFeaturePlaceholderProps {
  feature: FeatureKey;
  requiredTier: string;
  reason?: string;
  variant?: 'default' | 'compact';
  title?: string;
  description?: string;
}

export function LockedFeaturePlaceholder({
  feature,
  requiredTier,
  reason,
  variant = 'default',
  title,
  description
}: LockedFeaturePlaceholderProps) {
  const { openPricing } = usePricingModal();
  const { user } = useAuth();
  const isEmployee = user?.accountType === 'PM_EMPLOYEE';

  const getFeatureFriendlyName = () => {
    switch (feature) {
      case FeatureKey.DOCUMENT_MANAGEMENT:
        return 'Document Management & Templates';
      case FeatureKey.SERVICE_CHARGE_PAYMENTS:
        return 'Service Charge Payments';
      case FeatureKey.LISTING_BROKERAGE:
        return 'Listing & Brokerage Announcements';
      case FeatureKey.BRANDING:
        return 'Branding & White-labelling';
      case FeatureKey.AUTOMATED_RENT_RECEIPTS:
        return 'Automated Rent Receipts via Email';
      case FeatureKey.REPORTS_AND_TEAM_ACTIVITY:
        return 'Advanced Reports';
      default:
        return 'Premium Property Feature';
    }
  };

  const getWarningText = () => {
    if (reason === 'LOCKED') {
      return isEmployee
        ? 'Access to this feature is temporarily suspended due to an overdue organization invoice. Please contact your administrator.'
        : 'Access suspended due to overdue invoice. Please fund your wallet to restore access and retrieve your data.';
    }
    if (feature === FeatureKey.REPORTS_AND_TEAM_ACTIVITY) {
      return 'Unlock rent collection reports and team activity tracking.';
    }
    return isEmployee
      ? `This feature is locked under your organization's current plan. Kindly contact your administrator to activate a subscription.`
      : requiredTier === 'TIER_3'
      ? `This feature is exclusive to Upward Enterprise (Tier 3). Upgrade your subscription to unlock advanced reporting & audit features.`
      : `This feature is part of Upward Professional (Tier 2). Upgrade your subscription to restore access and activate data.`;
  };

  if (variant === 'compact') {
    const tierLabel = requiredTier === 'TIER_3' ? 'Upward Enterprise' : 'Upward Professional';
    const displayTitle = title || getFeatureFriendlyName();
    const displayDesc = description || getWarningText();

    return (
      <div className="subscription-gate-compact">
        <div className="subscription-gate-compact__body">
          <div className="subscription-gate-compact__header">
            <div className="subscription-gate-compact__title-wrap">
              <div className="subscription-gate-compact__icon-badge">
                <Lock size={13} className="subscription-gate-compact__lock-icon" />
              </div>
              <h4 className="subscription-gate-compact__title">
                {displayTitle}
              </h4>
            </div>
            <span className="subscription-gate-compact__badge">
              {tierLabel}
            </span>
          </div>
          <p className="subscription-gate-compact__text">
            {displayDesc}
          </p>
        </div>

        <div className="subscription-gate-compact__action">
          <button
            type="button"
            className="subscription-gate-compact__btn"
            onClick={openPricing}
          >
            {isEmployee ? (
              <>
                <span>Contact Administrator</span>
                <Lock size={13} />
              </>
            ) : (
              <>
                <span>View plans</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-gate">
      <div className="subscription-gate__overlay" />
      <div className="subscription-gate__content">
        <div className="subscription-gate__icon-container">
          <Lock className="subscription-gate__icon" size={24} />
        </div>
        <h3 className="subscription-gate__title">
          {title || (feature === FeatureKey.REPORTS_AND_TEAM_ACTIVITY ? 'Rent Collection Reports & Team Activity Dashboard' : getFeatureFriendlyName())}
        </h3>
        <p className="subscription-gate__text">
          {description || getWarningText()}
        </p>
        <button className="subscription-gate__btn" onClick={openPricing}>
          {isEmployee ? (
            <>
              <Lock size={16} />
              <span>Contact Administrator</span>
            </>
          ) : (
            <>
              <span>View subscription plans</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
