import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMarketplaceListings,
  fetchMarketplaceListingDetail,
  resolveReferralContext,
  submitAllianceInquiry,
  submitClientAllianceRating,
} from '../services/allianceService';
import type {
  PublicAllianceMarketplaceQuery,
  SubmitAllianceInquiryData,
  SubmitClientRatingData,
} from '../types/alliance.types';

export function useAllianceMarketplace(query: PublicAllianceMarketplaceQuery = {}) {
  return useQuery({
    queryKey: ['alliance-marketplace-listings', query],
    queryFn: () => fetchMarketplaceListings(query),
    staleTime: 60 * 1000,
  });
}

export function useAllianceListingDetail(uuid: string | undefined) {
  return useQuery({
    queryKey: ['alliance-listing-detail', uuid],
    queryFn: () => fetchMarketplaceListingDetail(uuid!),
    enabled: !!uuid,
    staleTime: 60 * 1000,
  });
}

export function useAllianceReferral(shareToken: string | undefined) {
  return useQuery({
    queryKey: ['alliance-referral-context', shareToken],
    queryFn: () => resolveReferralContext(shareToken!),
    enabled: !!shareToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitAllianceInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingUuid,
      data,
    }: {
      listingUuid: string;
      data: SubmitAllianceInquiryData;
    }) => submitAllianceInquiry(listingUuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-marketplace-listings'] });
    },
  });
}

export function useSubmitClientRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitClientRatingData) => submitClientAllianceRating(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listing-detail'] });
      queryClient.invalidateQueries({ queryKey: ['alliance-marketplace-listings'] });
      queryClient.invalidateQueries({ queryKey: ['user-alliance-journeys'] });
    },
  });
}

export function useUserAllianceJourneys() {
  return useQuery({
    queryKey: ['user-alliance-journeys'],
    queryFn: () => import('../services/allianceService').then((s) => s.fetchUserAllianceJourneys()),
    staleTime: 30 * 1000,
  });
}

