import { Inject, Injectable } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import {
  serializeCashbackPool,
  serializeCashbackReward,
  serializePromotionalVoucher,
  serializeRewardRule,
} from '../dto/rewards.dto'

@Injectable()
export class AdminGetRewardsDashboardUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
  ) {}

  async execute(filter?: {
    status?: string
    sourceType?: string
    campaignTag?: string
    skip?: number
    take?: number
  }) {
    const [overview, rules, vouchersPage, cashbackPage] = await Promise.all([
      this.rewardsRepo.getAdminOverview(),
      this.rewardsRepo.findAllRules(),
      this.rewardsRepo.listRecentVouchers(filter),
      this.rewardsRepo.listRecentCashbackRewards({
        skip: filter?.skip ?? 0,
        take: filter?.take ?? 30,
      }),
    ])

    return {
      overview: {
        totalVouchersIssuedCount: overview.totalVouchersIssuedCount,
        totalVouchersIssuedKobo: overview.totalVouchersIssuedKobo.toString(),
        totalVouchersIssuedNaira: Number(overview.totalVouchersIssuedKobo) / 100,
        totalVouchersRedeemedKobo: overview.totalVouchersRedeemedKobo.toString(),
        totalVouchersRedeemedNaira: Number(overview.totalVouchersRedeemedKobo) / 100,
        totalActiveVoucherBalanceKobo: overview.totalActiveVoucherBalanceKobo.toString(),
        totalActiveVoucherBalanceNaira: Number(overview.totalActiveVoucherBalanceKobo) / 100,
        totalCashbackCreditedCount: overview.totalCashbackCreditedCount,
        totalCashbackCreditedKobo: overview.totalCashbackCreditedKobo.toString(),
        totalCashbackCreditedNaira: Number(overview.totalCashbackCreditedKobo) / 100,
        cashbackPool: serializeCashbackPool(overview.cashbackPool),
        campaignStats: overview.campaignStats.map((c) => ({
          campaignTag: c.campaignTag,
          signupsCount: c.signupsCount,
          vouchersAwardedCount: c.vouchersAwardedCount,
          totalVoucherValueKobo: c.totalVoucherValueKobo.toString(),
          totalVoucherValueNaira: Number(c.totalVoucherValueKobo) / 100,
          totalRedeemedKobo: c.totalRedeemedKobo.toString(),
          totalRedeemedNaira: Number(c.totalRedeemedKobo) / 100,
        })),
      },
      rules: rules.map(serializeRewardRule),
      vouchers: {
        items: vouchersPage.items.map(serializePromotionalVoucher),
        total: vouchersPage.total,
      },
      cashbackRewards: {
        items: cashbackPage.items.map(serializeCashbackReward),
        total: cashbackPage.total,
      },
    }
  }
}
