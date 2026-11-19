import { Inject, Injectable } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import { AdminUpdateRewardRuleDto, serializeRewardRule } from '../dto/rewards.dto'

@Injectable()
export class AdminUpdateRewardRuleUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
  ) {}

  async execute(params: {
    triggerKey: string
    dto: AdminUpdateRewardRuleDto
    adminId?: string
  }) {
    const { triggerKey, dto, adminId } = params
    const rule = await this.rewardsRepo.upsertRule(triggerKey, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.rewardAmountNaira !== undefined
        ? { rewardAmountKobo: BigInt(Math.round(dto.rewardAmountNaira * 100)) }
        : {}),
      ...(dto.minQualifyingAmountNaira !== undefined
        ? { minQualifyingAmountKobo: BigInt(Math.round(dto.minQualifyingAmountNaira * 100)) }
        : {}),
      ...(dto.maxPerUser !== undefined ? { maxPerUser: dto.maxPerUser } : {}),
      ...(dto.expiryDays !== undefined ? { expiryDays: dto.expiryDays } : {}),
      ...(dto.campaignTag !== undefined ? { campaignTag: dto.campaignTag } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      updatedByAdminId: adminId || null,
    })

    return serializeRewardRule(rule)
  }
}
