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
  preferred_funding_method: 'DVA' | 'CARD_TOKEN' | 'DIRECT_DEBIT'
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

export interface SimulateRentSavingsData {
  days_remaining: number
  periodic_deposit_kobo: number
  number_of_payments: number
  total_tenant_contribution_kobo: number
  projected_yield_kobo: number
  net_annual_yield_rate: number
  affordability: {
    rent_to_income_ratio: number
    is_over_threshold?: boolean
    isOverThreshold?: boolean
    advisory_message?: string
    advisoryMessage?: string
  }
}

export interface BreakoutResultData {
  breakout_reference: string
  original_principal_kobo: number
  forfeited_yield_kobo: number
  recalculated_base_yield_kobo: number
  admin_fee_kobo: number
  advance_deduction_kobo: number
  net_payout_kobo: number
}

export interface EmergencyAdvanceResultData {
  advance_id: string
  borrowed_amount_kobo: number
  facility_fee_kobo: number
  total_repayable_kobo: number
  repayment_due_date: string
  remaining_vault_balance_kobo: number
  payout_transfer_reference: string
}

export interface SettlementResultData {
  settlement_reference: string
  nip_session_id: string
  amount_paid_to_landlord_kobo: number
  cashback_credited_kobo: number
  early_bird_bonus_applied: boolean
  settlement_status: string
  receipt_download_url: string
  sms_alert_dispatched: boolean
  upward_score_delta: string
  surplus_to_wallet_kobo?: number
}

export interface VaultTransactionItem {
  id: string
  uuid?: string
  type: string
  direction: 'CREDIT' | 'DEBIT'
  amount_kobo: number
  source_label: string
  narration?: string | null
  reference?: string | null
  receipt_url?: string | null
  created_at: string
}

export interface RentVaultData {
  vault_id: string
  lock_status: string
  current_balance_kobo: number
  principal_kobo: number
  vault_principal_kobo?: number
  deposit_balance_kobo?: number
  accrued_yield_kobo: number
  daily_yield_rate: number
  days_to_unlock: number
  days_remaining: number
  target_amount_kobo: number
  target_completion_percentage: number
  contractual_due_date: string
  unlock_date: string
  dedicated_account: {
    bank_name: string
    account_number: string
    account_name: string
    assignment_status: string
  } | null
  emergency_advance?: {
    has_active_loan: boolean
    active_loan_details: {
      advance_id: string
      borrowed_amount_kobo: number
      total_repayable_kobo: number
      repayment_due_date: string
      status: string
    } | null
    max_borrowable_kobo: number
  } | null
  savings_score: {
    total_score: number
    cadence_points?: number
    velocity_points?: number
    loan_discipline_points?: number
    consistency_points?: number
    goal_points?: number
  }
  transactions?: VaultTransactionItem[]
}

export interface SavingsOnboardingPrefillData {
  is_verified: boolean
  has_verified_bvn: boolean
  bvn: string
  masked_bvn: string | null
  mothers_maiden_name: string
  occupation: string
  source_of_funds: 'Salary' | 'Business' | 'Savings' | 'Investment'
  income_range: string
  next_of_kin_name: string
  next_of_kin_relationship: string
  next_of_kin_phone: string
  next_of_kin_email: string
  next_of_kin_address: string
  settlement_bank_code: string
  settlement_account_number: string
  settlement_account_name: string
  settlement_bank_name: string
  kyc_address?: string | null
  target_rent?: number | null
  rent_due_date?: string | null
  property: {
    uuid: string
    name: string
    address: string
    rent_amount: number | null
    rent_end_date: string | null
    landlord_name: string
    landlord_bank_code: string
    landlord_bank_name: string
    landlord_account_number: string
  } | null
}

export interface OnboardInvestorData {
  is_verified: boolean
  masked_bvn: string
  provider: string
  dedicated_account: {
    bank_name: string
    account_number: string
    account_name: string
    assignment_status?: string
  }
}

export async function simulateRentSavings(
  payload: SimulateRentSavingsPayload,
): Promise<SimulateRentSavingsData> {
  const res = await request<{ status: string; data: SimulateRentSavingsData }>(
    '/rent-calculator/simulate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function createRentVault(payload: CreateVaultPayload) {
  const res = await request<{ status: string; data: Record<string, unknown> }>('/rent-vaults', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function getMyRentVault(): Promise<RentVaultData> {
  const res = await request<{ status: string; data: RentVaultData }>('/rent-vaults/me', {
    method: 'GET',
  })
  return res.data
}

export async function consentToSavings() {
  const res = await request<{ status: string; message: string }>('/rent-vaults/consent', {
    method: 'POST',
  })
  return res
}

export async function disburseEmergencyAdvance(
  vaultId: string,
  payload: DisburseAdvancePayload,
): Promise<EmergencyAdvanceResultData> {
  const res = await request<{ status: string; data: EmergencyAdvanceResultData }>(
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
): Promise<SettlementResultData> {
  const res = await request<{ status: string; data: SettlementResultData }>(
    `/rent-vaults/${vaultId}/settlement/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function breakoutRentVault(vaultId: string): Promise<BreakoutResultData> {
  const res = await request<{ status: string; data: BreakoutResultData }>(
    `/rent-vaults/${vaultId}/breakout`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function simulateVaultDeposit(accountNumber: string, amountKobo: number) {
  const res = await request<{ status: string; reference?: string }>(
    '/payments/webhooks/rent-savings/paystack',
    {
      method: 'POST',
      body: JSON.stringify({
        event: 'charge.success',
        data: {
          reference: `TEST_DEP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount: amountKobo,
          currency: 'NGN',
          channel: 'dedicated_nuban',
          dedicated_account: {
            account_number: accountNumber,
          },
        },
      }),
    },
  )
  return res
}

export interface OnboardInvestorPayload {
  bvn?: string
  mothers_maiden_name: string
  occupation: string
  source_of_funds: 'Salary' | 'Business' | 'Savings' | 'Investment'
  income_range?: string
  next_of_kin_name: string
  next_of_kin_relationship: string
  next_of_kin_phone: string
  next_of_kin_email?: string
  next_of_kin_address?: string
  settlement_bank_code?: string
  settlement_account_number?: string
  settlement_account_name?: string
  settlement_bank_name?: string
  target_amount?: number
  rent_due_date?: string
}

export async function getSavingsOnboardingPrefill(): Promise<SavingsOnboardingPrefillData> {
  const res = await request<{ status: string; data: SavingsOnboardingPrefillData }>(
    '/rent-vaults/prefill',
    {
      method: 'GET',
    },
  )
  return res.data
}

export async function onboardSavingsInvestor(
  payload: OnboardInvestorPayload,
): Promise<OnboardInvestorData> {
  const res = await request<{ status: string; message: string; data: OnboardInvestorData }>(
    '/rent-vaults/onboard-investor',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}
