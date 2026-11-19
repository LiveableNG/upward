import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  CashbackPool,
  CashbackReward,
  PromotionalVoucher,
  RewardRule,
  UserVoucherSummary,
  VoucherRedemptionRecord,
  VoucherSourceType,
} from '../../../domains/rewards/rewards.repository'

export class AdminAwardVoucherDto {
  @IsNotEmpty()
  @IsString()
  userUuid!: string

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amountNaira!: number

  @IsOptional()
  @IsIn(['FORM_COMPLETION', 'GAME_WINNER', 'CAMPAIGN_SIGNUP', 'ADMIN_MANUAL', 'OTHER'])
  sourceType?: VoucherSourceType

  @IsNotEmpty()
  @IsString()
  reason!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  campaignTag?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  expiryDays?: number
}

export class AdminAwardCashbackDto {
  @IsNotEmpty()
  @IsString()
  userUuid!: string

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amountNaira!: number

  @IsNotEmpty()
  @IsString()
  reason!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  qualifyingActivityAmountNaira?: number
}

export class AdminUpdateRewardRuleDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rewardAmountNaira?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minQualifyingAmountNaira?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPerUser?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  expiryDays?: number | null

  @IsOptional()
  @IsString()
  campaignTag?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class AdminTopUpCashbackPoolDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amountNaira!: number
}

export class CompleteRewardActivityDto {
  @IsNotEmpty()
  @IsString()
  triggerKey!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  qualifyingAmountNaira?: number

  @IsOptional()
  @IsString()
  campaignTag?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export function serializeRewardRule(rule: RewardRule) {
  return {
    id: rule.id,
    uuid: rule.uuid,
    triggerKey: rule.triggerKey,
    name: rule.name,
    description: rule.description,
    rewardCategory: rule.rewardCategory,
    rewardAmountKobo: rule.rewardAmountKobo.toString(),
    rewardAmountNaira: Number(rule.rewardAmountKobo) / 100,
    minQualifyingAmountKobo: rule.minQualifyingAmountKobo.toString(),
    minQualifyingAmountNaira: Number(rule.minQualifyingAmountKobo) / 100,
    maxPerUser: rule.maxPerUser,
    expiryDays: rule.expiryDays,
    campaignTag: rule.campaignTag,
    isActive: rule.isActive,
    updatedByAdminId: rule.updatedByAdminId,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

export function serializeVoucherRedemption(r: VoucherRedemptionRecord) {
  return {
    id: r.id,
    uuid: r.uuid,
    voucherId: r.voucherId,
    userId: r.userId,
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    amountDeductedKobo: r.amountDeductedKobo.toString(),
    amountDeductedNaira: Number(r.amountDeductedKobo) / 100,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function serializePromotionalVoucher(v: PromotionalVoucher) {
  return {
    id: v.id,
    uuid: v.uuid,
    code: v.code,
    userId: v.userId,
    amountKobo: v.amountKobo.toString(),
    amountNaira: Number(v.amountKobo) / 100,
    redeemedAmountKobo: v.redeemedAmountKobo.toString(),
    redeemedAmountNaira: Number(v.redeemedAmountKobo) / 100,
    remainingAmountKobo: v.remainingAmountKobo.toString(),
    remainingAmountNaira: Number(v.remainingAmountKobo) / 100,
    currency: v.currency,
    status: v.status,
    sourceType: v.sourceType,
    triggerKey: v.triggerKey,
    campaignTag: v.campaignTag,
    reason: v.reason,
    notes: v.notes,
    awardedByAdminId: v.awardedByAdminId,
    awardedByAdminEmail: v.awardedByAdminEmail,
    expiresAt: v.expiresAt,
    redeemedAt: v.redeemedAt,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    redemptions: v.redemptions?.map(serializeVoucherRedemption),
    user: v.user,
  }
}

export function serializeCashbackReward(c: CashbackReward) {
  return {
    id: c.id,
    uuid: c.uuid,
    userId: c.userId,
    vaultId: c.vaultId,
    amountKobo: c.amountKobo.toString(),
    amountNaira: Number(c.amountKobo) / 100,
    currency: c.currency,
    triggerKey: c.triggerKey,
    qualifyingActivityAmountKobo: c.qualifyingActivityAmountKobo?.toString() ?? null,
    qualifyingActivityAmountNaira:
      c.qualifyingActivityAmountKobo != null
        ? Number(c.qualifyingActivityAmountKobo) / 100
        : null,
    reason: c.reason,
    status: c.status,
    awardedByAdminId: c.awardedByAdminId,
    awardedByAdminEmail: c.awardedByAdminEmail,
    reference: c.reference,
    createdAt: c.createdAt,
    user: c.user,
  }
}

export function serializeCashbackPool(pool: CashbackPool) {
  return {
    id: pool.id,
    key: pool.key,
    availableBalanceKobo: pool.availableBalanceKobo.toString(),
    availableBalanceNaira: Number(pool.availableBalanceKobo) / 100,
    totalDisbursedKobo: pool.totalDisbursedKobo.toString(),
    totalDisbursedNaira: Number(pool.totalDisbursedKobo) / 100,
    currency: pool.currency,
    updatedByAdminId: pool.updatedByAdminId,
    updatedAt: pool.updatedAt,
  }
}

export function serializeUserVoucherSummary(summary: UserVoucherSummary) {
  return {
    userId: summary.userId,
    availableBalanceKobo: summary.availableBalanceKobo.toString(),
    availableBalanceNaira: Number(summary.availableBalanceKobo) / 100,
    totalEarnedKobo: summary.totalEarnedKobo.toString(),
    totalEarnedNaira: Number(summary.totalEarnedKobo) / 100,
    totalRedeemedKobo: summary.totalRedeemedKobo.toString(),
    totalRedeemedNaira: Number(summary.totalRedeemedKobo) / 100,
    totalExpiredKobo: summary.totalExpiredKobo.toString(),
    totalExpiredNaira: Number(summary.totalExpiredKobo) / 100,
    activeVouchersCount: summary.activeVouchersCount,
    totalCashbackKobo: summary.totalCashbackKobo.toString(),
    totalCashbackNaira: Number(summary.totalCashbackKobo) / 100,
    vouchers: summary.vouchers.map(serializePromotionalVoucher),
    redemptions: summary.redemptions.map(serializeVoucherRedemption),
    cashbackRewards: summary.cashbackRewards.map(serializeCashbackReward),
  }
}
