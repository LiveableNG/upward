import { request } from '@/lib/api-client'

export type SimulateRentSavingsPayload = {
  target_amount_kobo: number
  contractual_due_date: string
  initial_deposit_kobo?: number
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  monthly_income_kobo?: number
}

export type SimulateRentSavingsResult = {
  periodic_deposit_kobo: number
  projected_yield_kobo: number
  days_remaining: number
  total_contribution_kobo?: number
  affordability_note?: string | null
}

export async function simulateRentSavings(payload: SimulateRentSavingsPayload) {
  const res = await request<{ data?: SimulateRentSavingsResult } | SimulateRentSavingsResult>(
    '/rent-calculator/simulate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  if (res && typeof res === 'object' && 'data' in res && res.data) {
    return res.data
  }
  return res as SimulateRentSavingsResult
}

export type DisburseAdvancePayload = {
  amount_kobo: number
  destination_bank_code: string
  destination_account_number: string
  destination_account_name?: string
}

export async function disburseEmergencyAdvance(vaultId: string, payload: DisburseAdvancePayload) {
  return request<unknown>(`/rent-vaults/${vaultId}/advance/disburse`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function breakoutRentVault(vaultId: string) {
  return request<{
    breakout_reference?: string
    original_principal_kobo?: number
    recalculated_base_yield_kobo?: number
    admin_fee_kobo?: number
    advance_deduction_kobo?: number
    net_payout_kobo?: number
  }>(`/rent-vaults/${vaultId}/breakout`, {
    method: 'POST',
  })
}

export type OnboardInvestorPayload = {
  bvn: string
  mothers_maiden_name: string
  occupation: string
  source_of_funds: 'Salary' | 'Business' | 'Savings' | 'Investment'
  income_range?: string
  next_of_kin_name: string
  next_of_kin_relationship: string
  next_of_kin_phone: string
  next_of_kin_email?: string
  next_of_kin_address?: string
  settlement_bank_code: string
  settlement_account_number: string
  settlement_account_name: string
  settlement_bank_name?: string
}

export async function onboardSavingsInvestor(payload: OnboardInvestorPayload) {
  return request('/rent-vaults/onboard-investor', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type ExecuteSettlementPayload = {
  landlord_bank_code: string
  landlord_account_number: string
  landlord_name: string
  property_address?: string
  disburse_surplus_to_wallet?: boolean
}

export async function executeLandlordSettlement(
  vaultId: string,
  payload: ExecuteSettlementPayload,
) {
  return request<{
    settlement_reference?: string
    net_payout_kobo?: number
    settlement_status?: string
  }>(`/rent-vaults/${vaultId}/settlement/execute`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
