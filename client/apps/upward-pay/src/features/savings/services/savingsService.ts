import { request } from '@/lib/api-client'

export interface SimulateRentSavingsPayload {
  target_amount_kobo: number
  contractual_due_date: string
  initial_deposit_kobo?: number
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  monthly_income_kobo?: number
}

export interface CreateVaultPayload {
  target_amount_kobo: number
  contractual_due_date: string
  cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  preferred_funding_method: 'DVA' | 'CARD_TOKEN'
  payday_day_of_month?: number
  card_authorization_code?: string
}

export interface DisburseAdvancePayload {
  amount_kobo: number
  destination_bank_code: string
  destination_account_number: string
  destination_account_name?: string
}

export interface ExecuteSettlementPayload {
  landlord_bank_code: string
  landlord_account_number: string
  landlord_name: string
  property_address?: string
  disburse_surplus_to_wallet?: boolean
}

export async function simulateRentSavings(payload: SimulateRentSavingsPayload) {
  const res = await request<{ status: string; data: any }>('/rent-calculator/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function createRentVault(payload: CreateVaultPayload) {
  const res = await request<{ status: string; data: any }>('/rent-vaults', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function getMyRentVault() {
  const res = await request<{ status: string; data: any }>('/rent-vaults/me', {
    method: 'GET',
  })
  return res.data
}

export async function disburseEmergencyAdvance(vaultId: string, payload: DisburseAdvancePayload) {
  const res = await request<{ status: string; data: any }>(
    `/rent-vaults/${vaultId}/advance/disburse`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function executeLandlordSettlement(
  vaultId: string,
  payload: ExecuteSettlementPayload,
) {
  const res = await request<{ status: string; data: any }>(
    `/rent-vaults/${vaultId}/settlement/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function breakoutRentVault(vaultId: string) {
  const res = await request<{ status: string; data: any }>(`/rent-vaults/${vaultId}/breakout`, {
    method: 'POST',
  })
  return res.data
}

export interface OnboardInvestorPayload {
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
  const res = await request<{ status: string; message: string; data: any }>(
    '/rent-vaults/onboard-investor',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}
