import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  SettlementAccount,
  CreateSettlementAccountDto,
  UpdateSettlementAccountDto,
} from '../services/paymentService';

export const SETTLEMENT_ACCOUNTS_QUERY_KEY = ['settlement-accounts'];

export function useSettlementAccounts() {
  const query = useQuery<SettlementAccount[]>({
    queryKey: SETTLEMENT_ACCOUNTS_QUERY_KEY,
    queryFn: api.getSettlementAccounts,
  });

  const accounts = query.data || [];
  const primaryAccount = accounts.find((a) => a.isPrimary) || accounts[0];

  return {
    ...query,
    accounts,
    primaryAccount,
  };
}

export function useCreateSettlementAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSettlementAccountDto) => api.createSettlementAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUpdateSettlementAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: UpdateSettlementAccountDto }) =>
      api.updateSettlementAccount(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useSetDefaultSettlementAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => api.setDefaultSettlementAccount(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useLinkPropertiesToAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, propertyUuids }: { uuid: string; propertyUuids: string[] }) =>
      api.linkPropertiesToSettlementAccount(uuid, propertyUuids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
    },
  });
}

export function useDeleteSettlementAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => api.deleteSettlementAccount(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
