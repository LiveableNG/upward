import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  AdminAwardCashbackDto,
  serializeCashbackReward,
  serializeUserVoucherSummary,
} from '../dto/rewards.dto'

@Injectable()
export class AdminAwardCashbackUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(params: {
    dto: AdminAwardCashbackDto
    adminId?: string
    adminEmail?: string
  }) {
    const { dto, adminId, adminEmail } = params
    const user = await this.userRepo.findByUuid(dto.userUuid)
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    const amountKobo = BigInt(Math.round(dto.amountNaira * 100))
    if (amountKobo <= 0n) {
      throw new BadRequestException('Cashback amount must be greater than zero')
    }

    const qualifyingKobo =
      dto.qualifyingActivityAmountNaira != null
        ? BigInt(Math.round(dto.qualifyingActivityAmountNaira * 100))
        : null

    const cashback = await this.rewardsRepo.awardCashbackToSavingsWallet({
      userId: user.id,
      amountKobo,
      triggerKey: 'ADMIN_MANUAL_CASHBACK',
      qualifyingActivityAmountKobo: qualifyingKobo,
      reason: dto.reason.trim(),
      awardedByAdminId: adminId || null,
      awardedByAdminEmail: adminEmail || null,
    })

    const summary = await this.rewardsRepo.getUserVoucherSummary(user.id)

    return {
      cashback: serializeCashbackReward(cashback),
      summary: serializeUserVoucherSummary(summary),
    }
  }
}
