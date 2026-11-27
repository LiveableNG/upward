import { request } from '@/lib/api-client'

export type SavingsCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
export type SavingsProductOption = 'SAVE_AND_EARN' | 'RENT_PROTEC'
export type SavingsLockMode = 'LOCKED' | 'FLEXIBLE'
export type SavingsPlanPattern = 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'
export type MeansOfIdentificationType = 'NIN' | 'INTERNATIONAL_PASSPORT' | 'DRIVERS_LICENSE'
export type SavingsKycDocumentKind = 'id_card' | 'utility_bill'

export interface UploadedKycDocument {
  doc_key: string
  file_name: string
  mime_type: string
  size_bytes: number
  kind: SavingsKycDocumentKind
}

export interface SimulateRentSavingsPayload {
  target_amount_kobo: number
  contractual_due_date: string
  initial_deposit_kobo?: number
  cadence: SavingsCadence
  product_option?: SavingsProductOption
  lock_mode?: SavingsLockMode
  plan_pattern?: SavingsPlanPattern
  monthly_income_kobo?: number
}

export interface CreateVaultPayload {
  target_amount_kobo: number
  contractual_due_date: string
  cadence: SavingsCadence
  preferred_funding_method: 'DVA' | 'CARD_TOKEN' | 'DIRECT_DEBIT'
  product_option?: SavingsProductOption
  lock_mode?: SavingsLockMode
  initial_deposit_kobo?: number
  planned_monthly_deposit_kobo?: number
  payday_day_of_month?: number
  card_authorization_code?: string
  consent_accepted?: boolean
  terms_version?: string
  consent_doc_version?: string
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
  minimum_initial_deposit_kobo?: number
  minimum_initial_deposit_pct?: number
  number_of_payments: number
  total_tenant_contribution_kobo: number
  projected_yield_kobo: number
  net_annual_yield_rate: number
  product_option?: SavingsProductOption
  lock_mode?: SavingsLockMode
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
  deposit_classification?: string | null
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
  lock_mode?: SavingsLockMode
  plan_pattern?: SavingsPlanPattern
  initial_deposit_kobo?: number
  minimum_initial_deposit_kobo?: number
  minimum_initial_deposit_pct?: number
  planned_monthly_deposit_kobo?: number
  current_month_paid_kobo?: number
  current_month_remaining_kobo?: number
  current_month_fulfilled?: boolean
  preferred_payday_day?: number
  is_rent_protec?: boolean
  insurance_premium_pct?: number
  has_completed_arm_kyc?: boolean
  address_verification_status?: string | null
  consent?: {
    consent_uuid: string
    terms_version: string
    consent_doc_version: string
    fund_code: string
    fund_name: string
    accepted_at: string
    has_document: boolean
  } | null
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
  has_verified_nin?: boolean
  has_completed_arm_kyc?: boolean
  has_signed_consent?: boolean
  consent_accepted_at?: string | null
  account_holder_first_name?: string | null
  account_holder_last_name?: string | null
  account_holder_full_name?: string | null
  strict_bank_name_match?: boolean
  bvn: string | null
  masked_bvn: string | null
  nin?: string | null
  masked_nin?: string | null
  means_of_id_type?: MeansOfIdentificationType
  means_of_id_number_masked?: string | null
  means_of_id_issue_date?: string | null
  means_of_id_expiry_date?: string | null
  means_of_id_doc_key?: string | null
  means_of_id_file_name?: string | null
  means_of_id_mime_type?: string | null
  residential_address_number?: string | null
  residential_street?: string | null
  residential_town?: string | null
  residential_state?: string | null
  utility_bill_issue_date?: string | null
  utility_bill_doc_key?: string | null
  utility_bill_file_name?: string | null
  utility_bill_mime_type?: string | null
  mothers_maiden_name: string | null
  occupation: string | null
  source_of_funds: 'Salary' | 'Business' | 'Savings' | 'Investment' | null
  income_range: string | null
  next_of_kin_name: string | null
  next_of_kin_relationship: string | null
  next_of_kin_phone: string | null
  next_of_kin_email: string | null
  next_of_kin_address: string | null
  settlement_bank?: {
    bank_code: string
    bank_name: string
    account_number: string
    account_name: string
  } | null
  settlement_bank_code?: string | null
  settlement_account_number?: string | null
  settlement_account_name?: string | null
  settlement_bank_name?: string | null
  kyc_address?: string | null
  target_rent?: number | null
  rent_due_date?: string | null
  property: {
    uuid: string
    name?: string
    address: string | null
    rent_amount: number | null
    rent_end_date: string | null
    landlord_name: string | null
    landlord_bank_code: string | null
    landlord_bank_name: string | null
    landlord_account_number: string | null
  } | null
}

export interface OnboardInvestorData {
  is_verified: boolean
  has_completed_arm_kyc?: boolean
  masked_bvn: string
  masked_nin?: string
  provider: string
  consent_uuid?: string | null
  consent_accepted_at?: string | null
  dedicated_account: {
    bank_name: string
    account_number: string
    account_name: string
    assignment_status?: string
  } | null
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

export async function updateVaultSchedule(paydayDayOfMonth: number): Promise<{
  vault_id: string
  preferred_payday_day: number
}> {
  const res = await request<{
    status: string
    data: { vault_id: string; preferred_payday_day: number }
  }>('/rent-vaults/me/schedule', {
    method: 'PATCH',
    body: JSON.stringify({ payday_day_of_month: paydayDayOfMonth }),
  })
  return res.data
}

export async function consentToSavings(
  cadence?: SavingsCadence,
  extra?: {
    consent_accepted?: boolean
    accepted_terms?: boolean
    accepted_arm_mandate?: boolean
    accepted_lock_policy?: boolean
    terms_version?: string
    consent_doc_version?: string
    product_option?: SavingsProductOption
    lock_mode?: SavingsLockMode
    plan_pattern?: SavingsPlanPattern
    initial_deposit_kobo?: number
    payday_day_of_month?: number
  },
) {
  const payload = {
    consent_accepted: extra?.consent_accepted ?? true,
    accepted_terms: extra?.accepted_terms ?? true,
    accepted_arm_mandate: extra?.accepted_arm_mandate ?? true,
    accepted_lock_policy: extra?.accepted_lock_policy ?? true,
    ...(cadence ? { cadence } : {}),
    ...(extra || {}),
  }
  const res = await request<{
    status: string
    message: string
    data?: {
      consent_uuid: string
      terms_version: string
      consent_doc_version: string
      accepted_at: string
      has_document: boolean
    }
  }>('/rent-vaults/consent', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res
}

/**
 * Algebraic breakeven deposit percentage for Rent Protec coverage activation:
 *   d_min(T) = clamp((2 * c_target) / (s * (T / 365)) - 1, 0.20, 0.45)
 * At s = 6.55% spread and c_target = 2.15%:
 *   7-11 months (>= 210 days) -> 20%
 *   6 months (180 days)       -> 33%
 */
export function getRentProtecMinimumDepositPct(
  daysToDueDate: number,
  spreadRateDecimal = 0.0655,
  targetCostDecimal = 0.0215,
): number {
  const safeDays = Math.max(1, daysToDueDate)
  const safeSpread = Math.max(0.01, spreadRateDecimal)
  const rawRatio = (2 * targetCostDecimal) / (safeSpread * (safeDays / 365)) - 1
  const clampedRatio = Math.min(0.45, Math.max(0.2, rawRatio))
  return Math.round(clampedRatio * 100)
}

/**
 * Recomputes the remaining monthly contribution after an Extra Top-Up.
 * Never increases above currentPlannedMonthlyNaira due to calendar rounding.
 */
export function recalculateReducedMonthlyNaira(params: {
  targetRentNaira: number
  newBalanceNaira: number
  activeDaysRemaining: number
  annualRatePct: number
  currentPlannedMonthlyNaira?: number
  maxMonths?: number
  currentMonthAlreadyFulfilled?: boolean
}): number {
  const {
    targetRentNaira,
    newBalanceNaira,
    activeDaysRemaining,
    annualRatePct,
    currentPlannedMonthlyNaira = 0,
    maxMonths = 11,
    currentMonthAlreadyFulfilled = false,
  } = params

  if (newBalanceNaira >= targetRentNaira) return 0

  const totalRemainingMonths = Math.min(
    Math.min(11, Math.max(1, maxMonths)),
    Math.max(1, Math.floor(Math.max(1, activeDaysRemaining) / 30)),
  )
  const futurePayments = currentMonthAlreadyFulfilled
    ? Math.max(1, totalRemainingMonths - 1)
    : totalRemainingMonths

  const monthlyRate = Math.pow(1 + Math.max(0, annualRatePct) / 100, 1 / 12) - 1
  const fvCurrent = newBalanceNaira * Math.pow(1 + monthlyRate, totalRemainingMonths)
  const deficit = Math.max(0, targetRentNaira - fvCurrent)
  if (deficit <= 0) return 0

  let discountSum = 0
  for (let i = 1; i <= futurePayments; i++) {
    discountSum += Math.pow(1 + monthlyRate, Math.max(0, futurePayments - i))
  }

  const recomputed = discountSum > 0 ? Math.ceil(deficit / discountSum) : 0
  if (currentPlannedMonthlyNaira > 0 && recomputed > currentPlannedMonthlyNaira) {
    return currentPlannedMonthlyNaira
  }
  return recomputed
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
    rawDaysToDueDate?: number
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
  const daysUntilDueDate = options?.rawDaysToDueDate ?? rawDays + 30
  const isRentProtecEligible = daysUntilDueDate >= minRentProtecMonths * 28

  const annualRateDecimal = annualRatePct / 100
  const minimumInitialDepositPct =
    productOption === 'RENT_PROTEC' ? getRentProtecMinimumDepositPct(daysUntilDueDate) : 0
  const requiredInitialDepositNaira =
    productOption === 'RENT_PROTEC'
      ? Math.round(targetRentNaira * (minimumInitialDepositPct / 100))
      : 0
  const effectiveInitialNaira =
    planPattern === 'INITIAL_DEPOSIT'
      ? productOption === 'RENT_PROTEC'
        ? Math.max(initialSavedNaira, requiredInitialDepositNaira)
        : initialSavedNaira > 0
          ? initialSavedNaira
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
    minimumInitialDepositNaira: requiredInitialDepositNaira,
    minimumInitialDepositPct,
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

export async function simulateVaultDeposit(
  accountNumber: string,
  amountKobo: number,
  depositKind?: 'MONTHLY' | 'EXTRA_TOPUP' | 'INITIAL_DEPOSIT',
) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Simulated deposits are only available in non-production environments.')
  }
  const res = await request<{
    status: string
    reference?: string
    arm_job_id?: string | null
    arm_job_status?: string | null
  }>('/rent-vaults/simulate-deposit', {
    method: 'POST',
    body: JSON.stringify({
      account_number: accountNumber,
      amount_kobo: amountKobo,
      ...(depositKind ? { deposit_kind: depositKind } : {}),
    }),
  })
  return res
}

export interface OnboardInvestorPayload {
  bvn?: string
  nin?: string
  means_of_id_type: MeansOfIdentificationType
  means_of_id_number?: string
  means_of_id_issue_date?: string
  means_of_id_expiry_date?: string
  means_of_id_doc_key: string
  means_of_id_mime_type?: string
  means_of_id_file_name?: string
  residential_address_number: string
  residential_street: string
  residential_town: string
  residential_state: string
  utility_bill_issue_date?: string
  utility_bill_doc_key: string
  utility_bill_mime_type?: string
  utility_bill_file_name?: string
  consent_accepted: boolean
  terms_version?: string
  consent_doc_version?: string
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
  lock_mode?: SavingsLockMode
  plan_pattern?: SavingsPlanPattern
  initial_deposit_kobo?: number
  planned_monthly_deposit_kobo?: number
  payday_day_of_month?: number
}

export async function uploadSavingsKycDocument(
  kind: SavingsKycDocumentKind,
  file: File,
): Promise<UploadedKycDocument> {
  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('fileName', file.name)
  formData.append('file', file)

  const res = await request<{ status: string; data: UploadedKycDocument }>(
    '/rent-vaults/kyc/upload-document',
    {
      method: 'POST',
      body: formData,
    },
  )
  return res.data
}

export function getSavingsConsentDocumentUrl(): string {
  const apiRoot =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '')
  return `${apiRoot.replace(/\/$/, '')}/rent-vaults/consent-document`
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

export async function verifyRentVaultFunding(): Promise<{
  detected: boolean
  newly_reconciled: number
  current_balance_kobo: number
}> {
  const res = await request<{
    status: string
    data: { detected: boolean; newly_reconciled: number; current_balance_kobo: number }
  }>('/rent-vaults/me/verify-funding', {
    method: 'POST',
  })
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

export interface SavingsInterestCampaignSummary {
  code: string
  name?: string
  reward_amount_ngn: number
  can_win_cashback: boolean
  slots_remaining: number
}

export interface SavingsInterestStatusData {
  has_indicated_interest: boolean
  grant_status: 'RESERVED' | 'CREDITED' | 'WAITLISTED' | 'REVERSED' | null
  allocated_amount_ngn: number
  reference: string | null
  claimed_at: string | null
  campaign: SavingsInterestCampaignSummary
}

export interface IndicateSavingsInterestResult extends SavingsInterestStatusData {
  already_claimed: boolean
  won_cashback: boolean
}

export async function getSavingsInterestStatus(): Promise<SavingsInterestStatusData> {
  const res = await request<{ status: string; data: SavingsInterestStatusData }>(
    '/rent-vaults/interest/status',
    {
      method: 'GET',
    },
  )
  return res.data
}

export async function indicateSavingsInterest(
  source?: string,
): Promise<IndicateSavingsInterestResult> {
  const res = await request<{ status: string; data: IndicateSavingsInterestResult }>(
    '/rent-vaults/interest',
    {
      method: 'POST',
      body: JSON.stringify(source ? { source } : {}),
    },
  )
  return res.data
}
