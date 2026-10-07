'use client';

import React from 'react';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { FeatureKey } from '@/features/pm/types/subscription';
import { LockedFeaturePlaceholder } from './LockedFeaturePlaceholder';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'default' | 'compact';
}

export function FeatureGate({ feature, children, fallback, variant }: FeatureGateProps) {
  const { checkAccess, isLoading } = useSubscription();

  if (isLoading) {
    return <div className="feature-gate__loader animate-pulse" />;
  }

  const { hasAccess, requiredTier, reason } = checkAccess(feature);

  if (!hasAccess) {
    return fallback || (
      <LockedFeaturePlaceholder 
        feature={feature} 
        requiredTier={requiredTier} 
        reason={reason}
        variant={variant}
      />
    );
  }

  return <>{children}</>;
}
