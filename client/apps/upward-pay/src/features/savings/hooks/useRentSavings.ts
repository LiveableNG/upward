import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as savingsService from '../services/savingsService'

export const RENT_VAULT_QUERY_KEY = ['rent-vault', 'me']
export const RENT_VAULT_PREFILL_QUERY_KEY = ['rent-vault', 'prefill']
export const SAVINGS_INTEREST_STATUS_QUERY_KEY = ['savings-interest-status']

export function useSavingsInterestStatus(enabled = true) {
  return useQuery({
    queryKey: SAVINGS_INTEREST_STATUS_QUERY_KEY,
    queryFn: async () => {
      try {
        return await savingsService.getSavingsInterestStatus()
      } catch {
        return null
      }
    },
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  })
}

export function useIndicateSavingsInterest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (source?: string) => savingsService.indicateSavingsInterest(source),
    onSuccess: (data) => {
      queryClient.setQueryData(SAVINGS_INTEREST_STATUS_QUERY_KEY, data)
      queryClient.invalidateQueries({ queryKey: SAVINGS_INTEREST_STATUS_QUERY_KEY })
    },
  })
}

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

export function useRentVault(enabled = true) {
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
    enabled,
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
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_PREFILL_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
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
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_PREFILL_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
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

export function useUploadSavingsKycDocument() {
  return useMutation({
    mutationFn: ({
      kind,
      file,
    }: {
      kind: savingsService.SavingsKycDocumentKind
      file: File
    }) => savingsService.uploadSavingsKycDocument(kind, file),
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
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_PREFILL_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
            consent_accepted?: boolean
            accepted_terms?: boolean
            accepted_arm_mandate?: boolean
            accepted_lock_policy?: boolean
            terms_version?: string
            consent_doc_version?: string
            cadence?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
            product_option?: 'SAVE_AND_EARN' | 'RENT_PROTEC'
            lock_mode?: 'LOCKED' | 'FLEXIBLE'
            plan_pattern?: 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'
            initial_deposit_kobo?: number
            payday_day_of_month?: number
          },
    ) => {
      if (typeof input === 'string') {
        return savingsService.consentToSavings(input, { consent_accepted: true })
      }
      return savingsService.consentToSavings(input?.cadence, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_PREFILL_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateVaultSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paydayDayOfMonth: number) =>
      savingsService.updateVaultSchedule(paydayDayOfMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}

export function useSimulateVaultDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      accountNumber,
      amountKobo,
      depositKind,
    }: {
      accountNumber: string
      amountKobo: number
      depositKind?: 'MONTHLY' | 'EXTRA_TOPUP' | 'INITIAL_DEPOSIT'
    }) => savingsService.simulateVaultDeposit(accountNumber, amountKobo, depositKind),
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
