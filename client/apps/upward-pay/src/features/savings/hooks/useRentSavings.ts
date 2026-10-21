import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as savingsService from '../services/savingsService'

export const RENT_VAULT_QUERY_KEY = ['rent-vault', 'me']

export function useRentVault() {
  return useQuery({
    queryKey: RENT_VAULT_QUERY_KEY,
    queryFn: async () => {
      try {
        return await savingsService.getMyRentVault()
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) {
          return null
        }
        throw err
      }
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: false,
  })
}

export function useSimulateRentSavings() {
  return useMutation({
    mutationFn: (payload: savingsService.SimulateRentSavingsPayload) =>
      savingsService.simulateRentSavings(payload),
  })
}

export function useCreateRentVault() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: savingsService.CreateVaultPayload) =>
      savingsService.createRentVault(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}

export function useDisburseAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vaultId,
      payload,
    }: {
      vaultId: string
      payload: savingsService.DisburseAdvancePayload
    }) => savingsService.disburseEmergencyAdvance(vaultId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}

export function useExecuteSettlement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vaultId,
      payload,
    }: {
      vaultId: string
      payload: savingsService.ExecuteSettlementPayload
    }) => savingsService.executeLandlordSettlement(vaultId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}

export function useBreakoutRentVault() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vaultId: string) => savingsService.breakoutRentVault(vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}
