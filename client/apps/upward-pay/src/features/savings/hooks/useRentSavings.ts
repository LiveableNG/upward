import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as savingsService from '../services/savingsService'

export const RENT_VAULT_QUERY_KEY = ['rent-vault', 'me']
export const RENT_VAULT_PREFILL_QUERY_KEY = ['rent-vault', 'prefill']

export function useSavingsOnboardingPrefill(enabled = true) {
  return useQuery({
    queryKey: RENT_VAULT_PREFILL_QUERY_KEY,
    queryFn: async () => {
      try {
        return await savingsService.getSavingsOnboardingPrefill()
      } catch {
        return null
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}

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
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 15, // Poll every 15s while mounted so incoming bank transfers reflect automatically
    refetchOnWindowFocus: true,
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
    mutationFn: (
      input?:
        | 'DAILY'
        | 'WEEKLY'
        | 'MONTHLY'
        | 'QUARTERLY'
        | {
            cadence?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
            product_option?: 'SAVE_AND_EARN' | 'RENT_PROTEC'
            plan_pattern?: 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'
            initial_deposit_kobo?: number
          },
    ) => {
      if (typeof input === 'string') {
        return savingsService.consentToSavings(input)
      }
      return savingsService.consentToSavings(input?.cadence, input)
    },
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

export function useVerifyVaultFunding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => savingsService.verifyRentVaultFunding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}
