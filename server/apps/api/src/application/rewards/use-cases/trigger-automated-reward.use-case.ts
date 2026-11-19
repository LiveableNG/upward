import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
  VoucherSourceType,
} from '../../../domains/rewards/rewards.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  serializeCashbackReward,
  serializePromotionalVoucher,
} from '../dto/rewards.dto'

export interface TriggerAutomatedRewardParams {
  userId?: number
  userUuid?: string
  triggerKey: string
  qualifyingAmountKobo?: bigint
  campaignTag?: string | null
  customReason?: string
  notes?: string
  uniqueOccurrenceKey?: string
}

@Injectable()
export class TriggerAutomatedRewardUseCase {
  private readonly logger = new Logger(TriggerAutomatedRewardUseCase.name)

  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(params: TriggerAutomatedRewardParams) {
    let resolvedUserId = params.userId
    if (!resolvedUserId && params.userUuid) {
      const user = await this.userRepo.findByUuid(params.userUuid)
      if (!user?.id) {
        throw new NotFoundException('User not found')
      }
      resolvedUserId = user.id
    }

    if (!resolvedUserId) {
      return { awarded: false, reason: 'User identifier missing' }
    }

    const rule = await this.rewardsRepo.findRuleByTriggerKey(params.triggerKey)
    if (!rule || !rule.isActive) {
      return { awarded: false, reason: 'Reward trigger rule is inactive or not found' }
    }

    if (rule.rewardAmountKobo <= 0n) {
      return { awarded: false, reason: 'Reward amount is configured as zero' }
    }

    if (
      rule.minQualifyingAmountKobo > 0n &&
      (params.qualifyingAmountKobo ?? 0n) < rule.minQualifyingAmountKobo
    ) {
      return {
        awarded: false,
        reason: `Activity amount does not meet minimum qualifying threshold of ₦${Number(rule.minQualifyingAmountKobo) / 100}`,
      }
    }

    if (rule.rewardCategory === 'VOUCHER') {
      if (rule.maxPerUser > 0) {
        const currentCount = await this.rewardsRepo.countUserVouchersByTriggerKey(
          resolvedUserId,
          rule.triggerKey,
        )
        if (currentCount >= rule.maxPerUser) {
          return {
            awarded: false,
            reason: 'User has already earned the maximum voucher allowance for this activity',
          }
        }
      }

      const idempotencyKey = params.uniqueOccurrenceKey
        ? `VCH_${resolvedUserId}_${rule.triggerKey}_${params.uniqueOccurrenceKey}`
        : rule.maxPerUser === 1
          ? `VCH_${resolvedUserId}_${rule.triggerKey}`
          : null

      const sourceType: VoucherSourceType =
        rule.triggerKey === 'CAMPAIGN_SIGNUP_VOUCHER' || params.campaignTag
          ? 'CAMPAIGN_SIGNUP'
          : 'FORM_COMPLETION'

      const expiresAt =
        rule.expiryDays && rule.expiryDays > 0
          ? new Date(Date.now() + rule.expiryDays * 24 * 60 * 60 * 1000)
          : null

      const voucher = await this.rewardsRepo.createVoucher({
        userId: resolvedUserId,
        amountKobo: rule.rewardAmountKobo,
        sourceType,
        triggerKey: rule.triggerKey,
        campaignTag: params.campaignTag ?? rule.campaignTag ?? null,
        reason: params.customReason || rule.name,
        notes: params.notes ?? rule.description ?? null,
        idempotencyKey,
        expiresAt,
      })

      this.logger.log(
        `Awarded promotional voucher ${voucher.code} (₦${Number(voucher.amountKobo) / 100}) to user #${resolvedUserId} via trigger ${rule.triggerKey}`,
      )

      return {
        awarded: true,
        rewardCategory: 'VOUCHER' as const,
        voucher: serializePromotionalVoucher(voucher),
      }
    }

    // Cashback reward
    if (rule.maxPerUser > 0) {
      const currentCount = await this.rewardsRepo.countUserCashbackByTriggerKey(
        resolvedUserId,
        rule.triggerKey,
      )
      if (currentCount >= rule.maxPerUser) {
        return {
          awarded: false,
          reason: 'User has already earned the maximum cashback allowance for this activity',
        }
      }
    }

    const idempotencyKey = params.uniqueOccurrenceKey
      ? `CB_${resolvedUserId}_${rule.triggerKey}_${params.uniqueOccurrenceKey}`
      : rule.maxPerUser === 1
        ? `CB_${resolvedUserId}_${rule.triggerKey}`
        : null

    const cashback = await this.rewardsRepo.awardCashbackToSavingsWallet({
      userId: resolvedUserId,
      amountKobo: rule.rewardAmountKobo,
      triggerKey: rule.triggerKey,
      qualifyingActivityAmountKobo: params.qualifyingAmountKobo ?? null,
      reason: params.customReason || rule.name,
      idempotencyKey,
    })

    this.logger.log(
      `Credited cashback ${cashback.reference} (₦${Number(cashback.amountKobo) / 100}) to Savings Wallet for user #${resolvedUserId} via trigger ${rule.triggerKey}`,
    )

    return {
      awarded: true,
      rewardCategory: 'CASHBACK' as const,
      cashback: serializeCashbackReward(cashback),
    }
  }
}
