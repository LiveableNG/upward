import { Inject, Injectable } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'

@Injectable()
export class AdminSearchRewardUsersUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
  ) {}

  async execute(query: string, limit = 25) {
    const results = await this.rewardsRepo.searchUsersForRewards(query, limit)
    return results.map((u) => ({
      id: u.id,
      uuid: u.uuid,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      phone: u.phone,
      signupCampaignTag: u.signupCampaignTag,
      availableVoucherBalanceKobo: u.availableVoucherBalanceKobo.toString(),
      availableVoucherBalanceNaira: Number(u.availableVoucherBalanceKobo) / 100,
      totalVouchersEarnedKobo: u.totalVouchersEarnedKobo.toString(),
      totalVouchersEarnedNaira: Number(u.totalVouchersEarnedKobo) / 100,
      totalVouchersRedeemedKobo: u.totalVouchersRedeemedKobo.toString(),
      totalVouchersRedeemedNaira: Number(u.totalVouchersRedeemedKobo) / 100,
      totalCashbackEarnedKobo: u.totalCashbackEarnedKobo.toString(),
      totalCashbackEarnedNaira: Number(u.totalCashbackEarnedKobo) / 100,
      createdAt: u.createdAt,
    }))
  }
}
