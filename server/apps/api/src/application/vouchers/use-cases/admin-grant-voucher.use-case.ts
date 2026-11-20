import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminGrantVoucherDto } from '../dto/voucher.dto'

@Injectable()
export class AdminGrantVoucherUseCase {
  private readonly logger = new Logger(AdminGrantVoucherUseCase.name)

  constructor(
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo: VoucherRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(params: {
    userIdentifier: string
    adminId: string
    dto: AdminGrantVoucherDto
  }) {
    const { userIdentifier, adminId, dto } = params

    if (!dto.amountNaira || dto.amountNaira <= 0) {
      throw new BadRequestException('Voucher amount must be greater than ₦0')
    }

    const user =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdentifier)
        ? await this.userRepo.findByUuid(userIdentifier)
        : !isNaN(Number(userIdentifier))
          ? await this.userRepo.findById(Number(userIdentifier))
          : null

    if (!user || !user.id) {
      throw new NotFoundException(`User '${userIdentifier}' not found`)
    }

    let campaignId: number | null = null
    if (dto.campaignCode?.trim()) {
      const campaign = await this.voucherRepo.findCampaignByCode(dto.campaignCode.trim())
      if (campaign) {
        campaignId = campaign.id
      }
    }

    const amountKobo = BigInt(Math.round(dto.amountNaira * 100))
    const entryType = dto.entryType || 'CREDIT_GAMING_REWARD'
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `ADMIN_GRANT:${adminId}:${user.id}:${randomUUID()}`

    const result = await this.voucherRepo.creditVoucher({
      userId: user.id,
      amountKobo,
      type: entryType,
      idempotencyKey,
      campaignId,
      grantedByAdminId: adminId,
      reason: dto.reason?.trim() || (entryType === 'CREDIT_GAMING_REWARD' ? 'Gaming Event Reward' : 'Admin Voucher Credit'),
      metadata: {
        emailSentRequested: dto.sendEmail !== false,
        emailSubject: dto.emailSubject?.trim() || null,
        customMessage: dto.customMessage?.trim() || null,
      },
    })

    let emailDispatched = false
    const shouldSendEmail = dto.sendEmail !== false && !result.alreadyApplied
    const isSyntheticPhoneEmail = user.email?.toLowerCase().endsWith('@upward.com')

    if (shouldSendEmail && user.email && !isSyntheticPhoneEmail) {
      emailDispatched = true
      this.emailService
        .sendGamingRewardVoucherEmail({
          userId: user.uuid,
          email: user.email,
          firstName: user.firstName || 'there',
          amountNaira: Number(amountKobo) / 100,
          totalBalanceNaira: Number(result.wallet.availableBalanceKobo) / 100,
          subject: dto.emailSubject?.trim() || undefined,
          customMessage: dto.customMessage?.trim() || undefined,
          reason: dto.reason?.trim() || undefined,
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send gaming reward voucher email to user ${user.uuid}`,
            err,
          ),
        )
    }

    return {
      alreadyApplied: result.alreadyApplied,
      emailDispatched,
      wallet: {
        uuid: result.wallet.uuid,
        currency: result.wallet.currency,
        availableBalanceKobo: result.wallet.availableBalanceKobo.toString(),
        availableBalanceNaira: Number(result.wallet.availableBalanceKobo) / 100,
        reservedBalanceKobo: result.wallet.reservedBalanceKobo.toString(),
        reservedBalanceNaira: Number(result.wallet.reservedBalanceKobo) / 100,
        lifetimeEarnedKobo: result.wallet.lifetimeEarnedKobo.toString(),
        lifetimeEarnedNaira: Number(result.wallet.lifetimeEarnedKobo) / 100,
        lifetimeRedeemedKobo: result.wallet.lifetimeRedeemedKobo.toString(),
        lifetimeRedeemedNaira: Number(result.wallet.lifetimeRedeemedKobo) / 100,
      },
      entry: {
        id: result.entry.id,
        uuid: result.entry.uuid,
        type: result.entry.type,
        amountKobo: result.entry.amountKobo.toString(),
        amountNaira: Number(result.entry.amountKobo) / 100,
        balanceAfterKobo: result.entry.balanceAfterKobo.toString(),
        balanceAfterNaira: Number(result.entry.balanceAfterKobo) / 100,
        reason: result.entry.reason,
        campaign: result.entry.campaign || null,
        grantedByAdmin: result.entry.grantedByAdmin || null,
        order: result.entry.order || null,
        createdAt: result.entry.createdAt,
      },
    }
  }
}
