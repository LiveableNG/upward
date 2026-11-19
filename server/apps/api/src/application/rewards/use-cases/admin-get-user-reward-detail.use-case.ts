import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { serializeUserVoucherSummary } from '../dto/rewards.dto'

@Injectable()
export class AdminGetUserRewardDetailUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userUuid: string) {
    const user = await this.userRepo.findByUuid(userUuid)
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    const summary = await this.rewardsRepo.getUserVoucherSummary(user.id)

    return {
      user: {
        id: user.id,
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone ?? null,
        signupCampaignTag: user.signupCampaignTag ?? null,
        createdAt: user.createdAt,
      },
      summary: serializeUserVoucherSummary(summary),
    }
  }
}
