import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  AdminAwardVoucherDto,
  serializePromotionalVoucher,
  serializeUserVoucherSummary,
} from '../dto/rewards.dto'

@Injectable()
export class AdminAwardVoucherUseCase {
  constructor(
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo: RewardsRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(params: {
    dto: AdminAwardVoucherDto
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
      throw new BadRequestException('Voucher amount must be greater than zero')
    }

    const expiresAt =
      dto.expiryDays && dto.expiryDays > 0
        ? new Date(Date.now() + dto.expiryDays * 24 * 60 * 60 * 1000)
        : null

    const voucher = await this.rewardsRepo.createVoucher({
      userId: user.id,
      amountKobo,
      sourceType: dto.sourceType || 'ADMIN_MANUAL',
      triggerKey: dto.sourceType === 'GAME_WINNER' ? 'EXTERNAL_GAME_WIN' : 'ADMIN_MANUAL_AWARD',
      campaignTag: dto.campaignTag?.trim() || null,
      reason: dto.reason.trim(),
      notes: dto.notes?.trim() || null,
      awardedByAdminId: adminId || null,
      awardedByAdminEmail: adminEmail || null,
      expiresAt,
    })

    const summary = await this.rewardsRepo.getUserVoucherSummary(user.id)

    return {
      voucher: serializePromotionalVoucher(voucher),
      summary: serializeUserVoucherSummary(summary),
    }
  }
}
