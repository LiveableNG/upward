import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { FeatureKey, Subscription, Wallet, SubscriptionTier } from '../types/subscription';

export function useSubscription() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();
  const isEmployee = user?.accountType === 'PM_EMPLOYEE';
  const isSubsDisabled = process.env.NEXT_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true';

  const { data: subscription, isLoading: isSubLoading } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () => api.get('/pm/subscription'),
  });

  const { data: wallet, isLoading: isWalletLoading } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: () => api.get('/pm/wallet'),
    enabled: !isEmployee && !isSubsDisabled,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: dva, isLoading: isDvaLoading } = useQuery({
    queryKey: ['pm_dva'],
    queryFn: () => api.get('/pm/subscription/wallet/dva').then(res => res.data),
    enabled: !isEmployee && !isSubsDisabled,
  });

  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['wallet_transactions'],
    queryFn: () => api.get('/pm/wallet/transactions'),
    enabled: !isEmployee && !isSubsDisabled,
  });

  const selectTierMutation = useMutation({
    mutationFn: (data: { tier: SubscriptionTier; billingMode?: 'active' | 'all' }) => {
      if (isEmployee) {
        throw new Error('Only the account admin can change subscription plans.');
      }
      return api.post('/pm/subscription/select-tier', data);
    },
    onSuccess: (data, variables) => {
      const TIER_ORDER = { FREE: 1, TIER_2: 2, TIER_3: 3 };
      const currentOrder = subscription ? TIER_ORDER[subscription.tier] : 1;
      const newOrder = TIER_ORDER[variables.tier];

      if (newOrder < currentOrder) {
        success('Subscription downgrade scheduled successfully');
      } else if (subscription && variables.tier === subscription.tier) {
        success('Scheduled downgrade cancelled successfully');
      } else {
        success('Subscription tier updated successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update subscription');
    },
  });

  const topUpMutation = useMutation({
    mutationFn: (data: { amount: number; reference: string }) => {
      if (isEmployee) {
        throw new Error('Only the account admin can top up the organization wallet.');
      }
      return api.post('/pm/wallet/top-up', data);
    },
    onSuccess: () => {
      success('Wallet topped up successfully');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to top up wallet');
    },
  });

  const generateDvaMutation = useMutation({
    mutationFn: () => {
      if (isEmployee) {
        throw new Error('Only the account admin can configure payment accounts.');
      }
      return api.post('/pm/subscription/wallet/dva/generate');
    },
    onSuccess: () => {
      success('Dedicated virtual account generated');
      queryClient.invalidateQueries({ queryKey: ['pm_dva'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to generate virtual account');
    },
  });

  const checkAccess = (feature: FeatureKey) => {
    if (isSubsDisabled) {
      return { hasAccess: true, requiredTier: 'FREE', limit: 1.0 };
    }

    const currentTier = subscription?.tier ?? 'FREE';
    const status = subscription?.status ?? 'ACTIVE';
    
    // LOCKED state overrides everything for paid features
    if (status === 'LOCKED' && feature !== FeatureKey.TENANCY_DATA_UPLOAD && feature !== FeatureKey.RENT_COLLECTION) {
      return { hasAccess: false, requiredTier: 'TIER_2', reason: 'LOCKED' };
    }

    switch (feature) {
      case FeatureKey.TENANCY_DATA_UPLOAD:
      case FeatureKey.RENT_COLLECTION:
        return { hasAccess: true, requiredTier: 'FREE' };
      case FeatureKey.DOCUMENT_MANAGEMENT:
      case FeatureKey.SERVICE_CHARGE_PAYMENTS:
        return {
          hasAccess: currentTier === 'TIER_2' || currentTier === 'TIER_3',
          requiredTier: 'TIER_2',
        };
      case FeatureKey.LISTING_BROKERAGE:
        return {
          hasAccess: currentTier === 'TIER_2' || currentTier === 'TIER_3',
          requiredTier: 'TIER_2',
          limit: currentTier === 'TIER_3' ? 1.0 : currentTier === 'TIER_2' ? 0.3 : 0.0,
        };
      case FeatureKey.BRANDING:
        return {
          hasAccess: currentTier === 'TIER_3',
          requiredTier: 'TIER_3',
        };
      default:
        return { hasAccess: true, requiredTier: 'FREE' };
    }
  };

  const activeSubscription = isSubsDisabled ? {
    id: 1,
    uuid: 'mock-sub-uuid',
    pmId: 1,
    tier: 'TIER_3' as SubscriptionTier,
    priceYearly: 0,
    priceMonthly: 0,
    unitBillingMode: 'active' as const,
    anniversaryDate: null,
    gracePeriodDays: 7,
    status: 'ACTIVE' as const,
    graceStartedAt: null,
    isInitialDepositPaid: true,
  } : subscription;

  return {
    subscription: activeSubscription,
    wallet: isEmployee ? undefined : wallet,
    isLoading: isSubsDisabled ? false : (isSubLoading || (!isEmployee && isWalletLoading)),
    checkAccess,
    selectTier: selectTierMutation.mutate,
    isSelectingTier: selectTierMutation.isPending,
    topUp: topUpMutation.mutate,
    isToppingUp: topUpMutation.isPending,
    dva: isEmployee ? null : dva,
    isDvaLoading: isSubsDisabled || isEmployee ? false : isDvaLoading,
    generateDva: generateDvaMutation.mutate,
    isGeneratingDva: generateDvaMutation.isPending,
    transactions: isEmployee ? [] : transactions,
    isTransactionsLoading: isSubsDisabled || isEmployee ? false : isTransactionsLoading,
    isEmployee,
  };
}
