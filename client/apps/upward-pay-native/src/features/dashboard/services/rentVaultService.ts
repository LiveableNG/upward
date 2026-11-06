import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type RentVault, type VaultDedicatedAccount } from '@/features/dashboard/types'
import { request } from '@/lib/api-client'

export const RENT_VAULT_QUERY_KEY = ['rent-vault', 'me'] as const

export type CreateVaultPayload = {
  target_amount_kobo: number
  contractual_due_date: string
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  preferred_funding_method: 'DVA' | 'CARD_TOKEN'
  payday_day_of_month?: number
}

function parseDedicatedAccount(raw: unknown): VaultDedicatedAccount | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  const account_number = String(d.account_number ?? d.accountNumber ?? '').trim()
  if (!account_number) return null
  return {
    bank_name: String(d.bank_name ?? d.bankName ?? 'Wema Bank'),
    account_number,
    account_name: String(d.account_name ?? d.accountName ?? 'Upward Rent Savings'),
  }
}

function normalizeVault(raw: unknown): RentVault | null {
  if (!raw || typeof raw !== 'object') return null
  const envelope = raw as Record<string, unknown>
  const data = (envelope.data as Record<string, unknown> | undefined) ?? envelope
  if (data.lock_status === undefined && data.target_amount_kobo === undefined) return null

  const vault = data as unknown as RentVault
  vault.dedicated_account = parseDedicatedAccount(data.dedicated_account)
  return vault
}

export async function fetchMyRentVault(): Promise<RentVault | null> {
  try {
    const res = await request<unknown>('/rent-vaults/me', { method: 'GET' })
    return normalizeVault(res)
  } catch (err) {
    const status = (err as Error & { status?: number }).status
    if (status === 404) return null
    throw err
  }
}

export function useRentVault() {
  return useQuery({
    queryKey: RENT_VAULT_QUERY_KEY,
    queryFn: fetchMyRentVault,
    staleTime: 30_000,
    retry: false,
  })
}

export async function createRentVault(payload: CreateVaultPayload): Promise<RentVault> {
  const res = await request<unknown>('/rent-vaults', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const normalized = normalizeVault(res)
  if (!normalized) throw new Error('Vault created but response was invalid')
  return normalized
}

export function useCreateRentVault() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRentVault,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
    },
  })
}
