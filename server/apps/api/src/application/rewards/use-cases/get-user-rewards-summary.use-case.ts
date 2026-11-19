import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  serializeRewardRule,
  serializeUserVoucherSummary,
} from '../dto/rewards.dto'

@Injectable()
export class GetUserRewardsSummaryUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userIdentifier: number | string) {
    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else if (/^\d+$/.test(String(userIdentifier))) {
      resolvedUserId = Number(userIdentifier)
    } else {
      const user = await this.userRepo.findByUuid(String(userIdentifier))
      if (!user?.id) {
        throw new NotFoundException('User not found')
      }
      resolvedUserId = user.id
    }

    const [summary, rules] = await Promise.all([
      this.rewardsRepo.getUserVoucherSummary(resolvedUserId),
      this.rewardsRepo.findAllRules(),
    ])

    const completedTriggerKeys = new Set<string>()
    for (const v of summary.vouchers) {
      if (v.triggerKey && v.status !== 'REVOKED') {
        completedTriggerKeys.add(v.triggerKey)
      }
    }
    for (const c of summary.cashbackRewards) {
      if (c.triggerKey) {
        completedTriggerKeys.add(c.triggerKey)
      }
    }

    return {
      ...serializeUserVoucherSummary(summary),
      availableActivities: rules
        .filter((r) => r.isActive)
        .map((r) => ({
          ...serializeRewardRule(r),
          isCompleted: completedTriggerKeys.has(r.triggerKey),
        })),
    }
  }
}
