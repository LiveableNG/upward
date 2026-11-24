import { request } from '@/lib/api-client'

export type SavingsCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
export type SavingsProductOption = 'SAVE_AND_EARN' | 'RENT_PROTEC'
export type SavingsPlanPattern = 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'

export interface SimulateRentSavingsPayload {
  target_amount_kobo: number
  contractual_due_date: string
  initial_deposit_kobo?: number
  cadence: SavingsCadence
  product_option?: SavingsProductOption
  plan_pattern?: SavingsPlanPattern
  monthly_income_kobo?: number
}

export interface CreateVaultPayload {
  target_amount_kobo: number
  contractual_due_date: string
  cadence: SavingsCadence
  preferred_funding_method: 'DVA' | 'CARD_TOKEN' | 'DIRECT_DEBIT'
  product_option?: SavingsProductOption
  initial_deposit_kobo?: number
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
  months_remaining?: number
  periodic_deposit_kobo: number
  first_period_deposit_kobo?: number
  last_period_deposit_kobo?: number
  required_initial_deposit_kobo?: number
  number_of_payments: number
  total_tenant_contribution_kobo: number
  projected_yield_kobo: number
  net_annual_yield_rate: number
  product_option?: SavingsProductOption
  plan_pattern?: SavingsPlanPattern
  is_rent_protec_eligible?: boolean
  rent_protec_ineligibility_reason?: string | null
  insurance_premium_kobo?: number
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
  cadence?: SavingsCadence
  product_option?: SavingsProductOption
  plan_pattern?: SavingsPlanPattern
  initial_deposit_kobo?: number
  is_rent_protec?: boolean
  insurance_premium_pct?: number
  current_balance_kobo: number
  principal_kobo: number
  vault_principal_kobo?: number
  deposit_balance_kobo?: number
  accrued_yield_kobo: number
  annual_yield_rate_pct?: number
  daily_yield_rate: number
  days_to_unlock: number
  days_remaining: number
  target_amount_kobo: number
  target_completion_percentage: number
  contractual_due_date: string
  unlock_date: string
  pay_less_projection?: {
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    periodic_deposit_kobo: number
    number_of_payments: number
    total_tenant_contribution_kobo: number
    projected_yield_kobo: number
    rent_discount_pct: number
  } | null
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

export async function consentToSavings(
  cadence?: SavingsCadence,
  extra?: {
    product_option?: SavingsProductOption
    plan_pattern?: SavingsPlanPattern
    initial_deposit_kobo?: number
  },
) {
  const payload = {
    ...(cadence ? { cadence } : {}),
    ...(extra || {}),
  }
  const res = await request<{ status: string; message: string }>('/rent-vaults/consent', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res
}

/**
 * Rent Protec / Save & Earn compound yield calculator
 * Uses effective monthly rate r_m = (1 + r_a)^(1/12) - 1 and caps horizon at <= 11 months.
 */
export function calculatePayLessPlan(
  targetRentNaira: number,
  runwayDays: number,
  cadence: SavingsCadence = 'MONTHLY',
  initialSavedNaira = 0,
  annualRatePct = 16.0,
  options?: {
    productOption?: SavingsProductOption
    planPattern?: SavingsPlanPattern
    maxMonths?: number
    minRentProtecMonths?: number
    insurancePremiumPct?: number
    customStepStartNaira?: number
    customStepIncrementNaira?: number
  },
) {
  const maxMonths = Math.min(11, Math.max(1, options?.maxMonths ?? 11))
  const minRentProtecMonths = Math.max(1, options?.minRentProtecMonths ?? 6)
  const productOption: SavingsProductOption = options?.productOption ?? 'SAVE_AND_EARN'
  const planPattern: SavingsPlanPattern = options?.planPattern ?? 'INITIAL_DEPOSIT'

  // Active savings horizon capped at <= 11 months (strictly releases 30 days before due date).
  const rawDays = Math.max(1, Math.round(runwayDays))
  const monthsRemaining = Math.min(maxMonths, Math.max(1, Math.floor(rawDays / 30)))
  const days = Math.min(rawDays, maxMonths * 30)
  const isRentProtecEligible = rawDays >= (minRentProtecMonths - 1) * 28

  const annualRateDecimal = annualRatePct / 100
  const missedMonths = Math.max(0, maxMonths - monthsRemaining)
  const forcedDepositRatio =
    productOption === 'RENT_PROTEC' && missedMonths > 0
      ? Math.min(0.45, Math.max(0.15, (missedMonths / maxMonths) * 0.5))
      : 0
  const requiredInitialDepositNaira = Math.round(targetRentNaira * forcedDepositRatio)
  const effectiveInitialNaira =
    planPattern === 'INITIAL_DEPOSIT'
      ? initialSavedNaira > 0
        ? initialSavedNaira
        : productOption === 'RENT_PROTEC'
          ? requiredInitialDepositNaira
          : 0
      : initialSavedNaira > 0
        ? initialSavedNaira
        : 0

  let numberOfPayments = monthsRemaining
  let periodRate = Math.pow(1 + annualRateDecimal, 1 / 12) - 1
  if (cadence === 'WEEKLY') {
    numberOfPayments = Math.max(1, Math.min(maxMonths * 4, Math.floor(days / 7)))
    periodRate = Math.pow(1 + annualRateDecimal, 1 / 52) - 1
  } else if (cadence === 'QUARTERLY') {
    numberOfPayments = Math.max(1, Math.floor(monthsRemaining / 3))
    periodRate = Math.pow(1 + annualRateDecimal, 1 / 4) - 1
  } else if (cadence === 'DAILY') {
    numberOfPayments = Math.max(1, days)
    periodRate = Math.pow(1 + annualRateDecimal, 1 / 365) - 1
  }

  const fvInitial = effectiveInitialNaira * Math.pow(1 + periodRate, numberOfPayments)
  const deficit = Math.max(0, targetRentNaira - fvInitial)

  let schedule: number[] = []
  let stepIncrementNaira = 0

  if (planPattern === 'STEP_UP') {
    let sumDiscount = 0
    let sumIndexDiscount = 0
    for (let i = 1; i <= numberOfPayments; i++) {
      const discountFactor = Math.pow(1 + periodRate, numberOfPayments - i)
      sumDiscount += discountFactor
      sumIndexDiscount += (i - 1) * discountFactor
    }

    let startNaira = 0
    if (options?.customStepStartNaira !== undefined && options.customStepStartNaira >= 0) {
      startNaira = Math.round(options.customStepStartNaira)
      const rem = Math.max(0, deficit - startNaira * sumDiscount)
      stepIncrementNaira = sumIndexDiscount > 0 ? Math.ceil(rem / sumIndexDiscount) : 0
    } else if (options?.customStepIncrementNaira !== undefined && options.customStepIncrementNaira >= 0) {
      stepIncrementNaira = Math.round(options.customStepIncrementNaira)
      const rem = Math.max(0, deficit - stepIncrementNaira * sumIndexDiscount)
      startNaira = sumDiscount > 0 ? Math.ceil(rem / sumDiscount) : 0
    } else {
      const equalAmt = sumDiscount > 0 ? deficit / sumDiscount : deficit
      startNaira =
        numberOfPayments > 1
          ? Math.max(5_000, Math.round((equalAmt * 0.6) / 5_000) * 5_000)
          : Math.ceil(equalAmt)
      const rem = Math.max(0, deficit - startNaira * sumDiscount)
      stepIncrementNaira = sumIndexDiscount > 0 ? Math.ceil(rem / sumIndexDiscount) : 0
    }

    for (let i = 1; i <= numberOfPayments; i++) {
      schedule.push(Math.max(0, startNaira + (i - 1) * stepIncrementNaira))
    }
  } else {
    const weights: number[] = []
    for (let i = 1; i <= numberOfPayments; i++) {
      if (planPattern === 'ACCELERATED') {
        const taperFactor = cadence === 'WEEKLY' ? 0.015 : 0.06
        weights.push(Math.max(0.4, 1 - taperFactor * (i - 1)))
      } else {
        weights.push(1)
      }
    }

    let denominator = 0
    for (let i = 1; i <= numberOfPayments; i++) {
      const periodsRemaining = Math.max(0, numberOfPayments - i)
      denominator += weights[i - 1] * Math.pow(1 + periodRate, periodsRemaining)
    }

    const basePayment = deficit > 0 && denominator > 0 ? Math.ceil(deficit / denominator) : 0
    schedule = weights.map((w) => Math.max(0, Math.ceil(basePayment * w)))
  }

  const periodicDepositNaira = schedule[0] ?? 0
  const lastPeriodDepositNaira = schedule[schedule.length - 1] ?? 0
  const totalPeriodicContributionNaira = schedule.reduce((sum, p) => sum + p, 0)
  const totalTenantContributionNaira = effectiveInitialNaira + totalPeriodicContributionNaira

  let futureValue = fvInitial
  for (let i = 1; i <= numberOfPayments; i++) {
    futureValue +=
      (schedule[i - 1] ?? 0) * Math.pow(1 + periodRate, Math.max(0, numberOfPayments - i))
  }
  const projectedYieldNaira = Math.max(0, Math.round(futureValue - totalTenantContributionNaira))
  const rentDiscountPct =
    targetRentNaira > 0
      ? Math.round((projectedYieldNaira / targetRentNaira) * 1000) / 10
      : 0

  return {
    cadence,
    productOption,
    planPattern,
    monthsRemaining,
    isRentProtecEligible,
    requiredInitialDepositNaira: effectiveInitialNaira,
    periodicDepositNaira,
    firstPeriodDepositNaira: periodicDepositNaira,
    lastPeriodDepositNaira,
    stepIncrementNaira,
    numberOfPayments,
    totalTenantContributionNaira,
    projectedYieldNaira,
    rentDiscountPct,
  }
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
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Simulated deposits are only available in non-production environments.')
  }
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
  cadence?: SavingsCadence
  product_option?: SavingsProductOption
  plan_pattern?: SavingsPlanPattern
  initial_deposit_kobo?: number
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
