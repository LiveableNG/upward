export const REWARDS_REPOSITORY = Symbol('REWARDS_REPOSITORY')

export type RewardCategoryType = 'VOUCHER' | 'CASHBACK'

export type VoucherStatusType =
  | 'ACTIVE'
  | 'PARTIALLY_REDEEMED'
  | 'REDEEMED'
  | 'EXPIRED'
  | 'REVOKED'

export type VoucherSourceType =
  | 'FORM_COMPLETION'
  | 'GAME_WINNER'
  | 'CAMPAIGN_SIGNUP'
  | 'ADMIN_MANUAL'
  | 'OTHER'

export type VoucherRedemptionStatusType = 'APPLIED' | 'CONFIRMED' | 'RELEASED'

export interface RewardRule {
  id: number
  uuid: string
  triggerKey: string
  name: string
  description: string | null
  rewardCategory: RewardCategoryType
  rewardAmountKobo: bigint
  minQualifyingAmountKobo: bigint
  maxPerUser: number
  expiryDays: number | null
  campaignTag: string | null
  isActive: boolean
  updatedByAdminId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VoucherRedemptionRecord {
  id: number
  uuid: string
  voucherId: number
  userId: number
  orderId: number | null
  orderNumber: string | null
  amountDeductedKobo: bigint
  status: VoucherRedemptionStatusType
  createdAt: Date
  updatedAt: Date
}

export interface PromotionalVoucher {
  id: number
  uuid: string
  code: string
  userId: number
  amountKobo: bigint
  redeemedAmountKobo: bigint
  remainingAmountKobo: bigint
  currency: string
  status: VoucherStatusType
  sourceType: VoucherSourceType
  triggerKey: string | null
  campaignTag: string | null
  reason: string
  notes: string | null
  awardedByAdminId: string | null
  awardedByAdminEmail: string | null
  idempotencyKey: string | null
  expiresAt: Date | null
  redeemedAt: Date | null
  createdAt: Date
  updatedAt: Date
  redemptions?: VoucherRedemptionRecord[]
  user?: {
    id: number
    uuid: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    signupCampaignTag?: string | null
  }
}

export interface CashbackPool {
  id: number
  key: string
  availableBalanceKobo: bigint
  totalDisbursedKobo: bigint
  currency: string
  updatedByAdminId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CashbackReward {
  id: number
  uuid: string
  userId: number
  vaultId: number | null
  amountKobo: bigint
  currency: string
  triggerKey: string
  qualifyingActivityAmountKobo: bigint | null
  reason: string
  status: string
  awardedByAdminId: string | null
  awardedByAdminEmail: string | null
  idempotencyKey: string | null
  reference: string
  createdAt: Date
  user?: {
    id: number
    uuid: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
  }
}

export interface UserVoucherSummary {
  userId: number
  totalEarnedKobo: bigint
  totalRedeemedKobo: bigint
  totalExpiredKobo: bigint
  availableBalanceKobo: bigint
  activeVouchersCount: number
  vouchers: PromotionalVoucher[]
  redemptions: VoucherRedemptionRecord[]
  cashbackRewards: CashbackReward[]
  totalCashbackKobo: bigint
}

export interface CreateVoucherInput {
  userId: number
  amountKobo: bigint
  currency?: string
  sourceType: VoucherSourceType
  triggerKey?: string | null
  campaignTag?: string | null
  reason: string
  notes?: string | null
  awardedByAdminId?: string | null
  awardedByAdminEmail?: string | null
  idempotencyKey?: string | null
  expiresAt?: Date | null
}

export interface AwardCashbackInput {
  userId: number
  amountKobo: bigint
  triggerKey: string
  qualifyingActivityAmountKobo?: bigint | null
  reason: string
  awardedByAdminId?: string | null
  awardedByAdminEmail?: string | null
  idempotencyKey?: string | null
}

export interface ApplyVouchersToOrderResult {
  totalDiscountAppliedKobo: bigint
  redemptions: VoucherRedemptionRecord[]
}

export interface CampaignStatsSummary {
  campaignTag: string
  signupsCount: number
  vouchersAwardedCount: number
  totalVoucherValueKobo: bigint
  totalRedeemedKobo: bigint
}

export interface AdminUserRewardSearchResult {
  id: number
  uuid: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  signupCampaignTag: string | null
  availableVoucherBalanceKobo: bigint
  totalVouchersEarnedKobo: bigint
  totalVouchersRedeemedKobo: bigint
  totalCashbackEarnedKobo: bigint
  createdAt: Date
}

export interface AdminRewardsDashboardOverview {
  totalVouchersIssuedCount: number
  totalVouchersIssuedKobo: bigint
  totalVouchersRedeemedKobo: bigint
  totalActiveVoucherBalanceKobo: bigint
  totalCashbackCreditedCount: number
  totalCashbackCreditedKobo: bigint
  cashbackPool: CashbackPool
  campaignStats: CampaignStatsSummary[]
}

export interface RewardsRepository {
  ensureDefaultRulesAndPool(): Promise<void>
  findAllRules(): Promise<RewardRule[]>
  findRuleByTriggerKey(triggerKey: string): Promise<RewardRule | null>
  upsertRule(
    triggerKey: string,
    data: {
      name?: string
      description?: string | null
      rewardCategory?: RewardCategoryType
      rewardAmountKobo?: bigint
      minQualifyingAmountKobo?: bigint
      maxPerUser?: number
      expiryDays?: number | null
      campaignTag?: string | null
      isActive?: boolean
      updatedByAdminId?: string | null
    },
  ): Promise<RewardRule>

  getCashbackPool(): Promise<CashbackPool>
  topUpCashbackPool(amountKobo: bigint, adminId?: string): Promise<CashbackPool>

  createVoucher(input: CreateVoucherInput): Promise<PromotionalVoucher>
  findVoucherByIdempotencyKey(idempotencyKey: string): Promise<PromotionalVoucher | null>
  countUserVouchersByTriggerKey(userId: number, triggerKey: string): Promise<number>
  getUserVoucherSummary(userId: number): Promise<UserVoucherSummary>
  getAvailableVoucherBalanceKobo(userId: number): Promise<bigint>

  /**
   * Releases any unconfirmed ('APPLIED') voucher redemptions from older UNPAID orders
   * for this user, then applies available active vouchers (FIFO) up to maxDiscountKobo.
   */
  applyUserVouchersToOrder(params: {
    userId: number
    orderId?: number | null
    orderNumber?: string | null
    maxDiscountKobo: bigint
  }): Promise<ApplyVouchersToOrderResult>

  attachOrderToAppliedRedemptions(params: {
    userId: number
    redemptionIds: number[]
    orderId: number
    orderNumber: string
  }): Promise<void>

  confirmOrderVoucherRedemptions(orderId: number): Promise<void>
  releaseOrderVoucherRedemptions(orderId: number): Promise<void>
  releaseUnboundAppliedRedemptionsForUser(userId: number): Promise<void>

  awardCashbackToSavingsWallet(input: AwardCashbackInput): Promise<CashbackReward>
  findCashbackByIdempotencyKey(idempotencyKey: string): Promise<CashbackReward | null>
  countUserCashbackByTriggerKey(userId: number, triggerKey: string): Promise<number>

  // Admin queries
  getAdminOverview(): Promise<AdminRewardsDashboardOverview>
  searchUsersForRewards(query: string, limit?: number): Promise<AdminUserRewardSearchResult[]>
  listRecentVouchers(filter?: {
    userId?: number
    status?: string
    sourceType?: string
    campaignTag?: string
    skip?: number
    take?: number
  }): Promise<{ items: PromotionalVoucher[]; total: number }>
  listRecentCashbackRewards(filter?: {
    userId?: number
    triggerKey?: string
    skip?: number
    take?: number
  }): Promise<{ items: CashbackReward[]; total: number }>
}
