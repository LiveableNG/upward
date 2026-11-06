import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as savingsService from '../services/savingsService'

export const RENT_VAULT_QUERY_KEY = ['rent-vault', 'me']

export function useRentVault() {
  return useQuery({
    queryKey: RENT_VAULT_QUERY_KEY,
    queryFn: async () => {
      try {
        return await savingsService.getMyRentVault()
      } catch (err: unknown) {
        const error = err as { status?: number; statusCode?: number }
        if (error?.status === 404 || error?.statusCode === 404) {
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

export function useOnboardSavingsInvestor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: savingsService.OnboardInvestorPayload) =>
      savingsService.onboardSavingsInvestor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}

export function useConsentToSavings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => savingsService.consentToSavings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}

export function useSimulateVaultDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountNumber, amountKobo }: { accountNumber: string; amountKobo: number }) =>
      savingsService.simulateVaultDeposit(accountNumber, amountKobo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}
