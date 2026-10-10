import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SplitProfile,
  CreateSplitProfileDto,
  UpdateSplitProfileDto,
  getSplitProfiles,
  createSplitProfile,
  updateSplitProfile,
  deleteSplitProfile,
  attachSplitProfileToProperties,
  assignPropertyRouting,
  AssignPropertyRoutingDto,
} from '../services/paymentService';

export const SPLIT_PROFILES_QUERY_KEY = ['split-profiles'];

const EMPTY_PROFILES: SplitProfile[] = [];

export function useSplitProfiles() {
  const query = useQuery<SplitProfile[]>({
    queryKey: SPLIT_PROFILES_QUERY_KEY,
    queryFn: () => getSplitProfiles(),
  });

  const profiles = query.data || EMPTY_PROFILES;
  const defaultProfile = profiles.find((p) => p.isDefault) || null;

  return {
    ...query,
    profiles,
    defaultProfile,
  };
}

export function useCreateSplitProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSplitProfileDto) => createSplitProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPLIT_PROFILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
    },
  });
}

export function useUpdateSplitProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: UpdateSplitProfileDto }) =>
      updateSplitProfile(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPLIT_PROFILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
    },
  });
}

export function useDeleteSplitProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => deleteSplitProfile(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPLIT_PROFILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
    },
  });
}

export function useAttachSplitProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, propertyUuids }: { uuid: string; propertyUuids: string[] }) =>
      attachSplitProfileToProperties(uuid, propertyUuids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPLIT_PROFILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-accounts'] });
    },
  });
}

export function useAssignPropertyRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPropertyRoutingDto) => assignPropertyRouting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPLIT_PROFILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-accounts'] });
    },
  });
}

