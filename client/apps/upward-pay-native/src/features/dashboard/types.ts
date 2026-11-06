export type PendingPayment = {
  uuid: string
  amount: number
  currency: string
  total_amount: number
  amountPaid: number
  company_name: string
  property_address: string | null
  userPropertyUuid: string | null
  due_date?: string
  dueDate?: string
  latestProof?: { status: string } | null
  lineItemRecords?: Array<{
    id?: number
    name?: string
    totalAmount?: number
    amount?: number
    amountPaid?: number
  }>
  status?: string
  description?: string
}

export type TransactionCategory = 'all' | 'rent' | 'utilities' | 'deposit' | 'benefits'

export type CompletedPayment = {
  uuid: string
  amount: number
  currency: string
  paid_at: string
  company_name: string
  type: 'credit' | 'debit'
  channel?: string
  status?: string
  paystack_reference?: string
  property_address?: string
  transactionType?: 'PAYMENT' | 'FUTURE_CREDIT'
  isManual?: boolean
  apiType?: string
  category: TransactionCategory
}

export type RentDueInfo = {
  amount: number
  currency: string
  address: string
  days: number
  isOverdue: boolean
  isReviewing: boolean
  isRejected: boolean
  label: string
  href: string
}

export type ScorePaymentCycle = {
  id?: number
  uuid?: string
  amount: number
  dueDate: string
  paidDate?: string | null
  status: string
  ptValue?: number
  source: string
  excluded?: boolean
  propertyLabel?: string
}

export type ScoreProperty = {
  isVerified?: boolean
  isPmVerified?: boolean
  isPlatformLinked?: boolean
  company?: { platformId?: string }
  pm?: { isVerified?: boolean }
}

export type ScoreProfileData = {
  isScorable: boolean
  score: number
  maxScore: number
  band: string
  rank: string
  metrics: {
    ptPercentage: number
    longestStreak: number
    totalCycles?: number
    historyYears?: number
    discipline?: number
    savingsBonus?: number
    profileCompletion?: number
  }
  profile?: {
    profileCompletion: number
    profileSlug?: string | null
    uuid?: string
    isIdentityVerified?: boolean
    verificationOn?: boolean
  }
  cycles: ScorePaymentCycle[]
  properties: ScoreProperty[]
}

export type VaultDedicatedAccount = {
  bank_name: string
  account_number: string
  account_name: string
}

export type RentVaultEmergencyAdvance = {
  has_active_loan: boolean
  max_borrowable_kobo: number
  active_loan_details?: {
    advance_id: string
    borrowed_amount_kobo: number
    total_repayable_kobo: number
    repayment_due_date: string
    status: string
  } | null
}

export type RentVault = {
  vault_id?: string
  lock_status: string
  current_balance_kobo: number
  principal_kobo?: number
  target_amount_kobo: number
  accrued_yield_kobo: number
  daily_yield_rate?: number
  days_remaining: number
  days_to_unlock: number
  contractual_due_date: string
  target_completion_percentage: number
  dedicated_account?: VaultDedicatedAccount | null
  emergency_advance?: RentVaultEmergencyAdvance
}

export type ActivityListItem = CompletedPayment & {
  source?: 'upward' | 'gt'
}

export type BenefitsStatus = {
  isActive: boolean
  endsAt: string | null
}
