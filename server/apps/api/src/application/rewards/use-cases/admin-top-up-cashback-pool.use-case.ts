import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import { AdminTopUpCashbackPoolDto, serializeCashbackPool } from '../dto/rewards.dto'

@Injectable()
export class AdminTopUpCashbackPoolUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
  ) {}

  async execute(params: { dto: AdminTopUpCashbackPoolDto; adminId?: string }) {
    const amountKobo = BigInt(Math.round(params.dto.amountNaira * 100))
    if (amountKobo <= 0n) {
      throw new BadRequestException('Top-up amount must be greater than zero')
    }
    const pool = await this.rewardsRepo.topUpCashbackPool(amountKobo, params.adminId)
    return serializeCashbackPool(pool)
  }
}
