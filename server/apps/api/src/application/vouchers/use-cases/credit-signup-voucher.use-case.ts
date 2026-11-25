import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { EmailService } from '../../../shared/infrastructure/email/email.service'

export interface CreditSignupVoucherInput {
  userId: number
  userUuid?: string
  email: string
  firstName: string
  voucherCode?: string | null
  source?: 'SIGNUP' | 'SHADOW_CONVERSION' | 'SOCIAL_OAUTH' | 'COMPLETE_PROFILE'
}

export interface CreditSignupVoucherResult {
  credited: boolean
  amountKobo: bigint
  totalBalanceKobo: bigint
  campaignCode?: string
  reason?: string
}

@Injectable()
export class CreditSignupVoucherUseCase {
  private readonly logger = new Logger(CreditSignupVoucherUseCase.name)

  constructor(
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo: VoucherRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(input: CreditSignupVoucherInput): Promise<CreditSignupVoucherResult> {
    const rawCode = input.voucherCode?.trim()
    if (!rawCode) {
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'No voucher code supplied' }
    }

    // Strict allow-list validation for campaign codes
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(rawCode)) {
      this.logger.warn(`Ignoring malformed voucher code on signup for userId=${input.userId}`)
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'Invalid voucher code format' }
    }

    const campaign = await this.voucherRepo.findCampaignByCode(rawCode)
    if (!campaign) {
      this.logger.warn(`Signup voucher campaign not found: code=${rawCode}`)
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'Campaign not found' }
    }

    const now = new Date()
    if (!campaign.isActive) {
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'Campaign inactive' }
    }
    if (campaign.startsAt && now < campaign.startsAt) {
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'Campaign not started' }
    }
    if (campaign.expiresAt && now > campaign.expiresAt) {
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'Campaign expired' }
    }
    if (campaign.defaultAmountKobo <= 0n) {
      return { credited: false, amountKobo: 0n, totalBalanceKobo: 0n, reason: 'Campaign amount is zero' }
    }

    const idempotencyKey = `SIGNUP_CAMPAIGN:${campaign.id}:USER:${input.userId}`

    try {
      const result = await this.voucherRepo.creditVoucher({
        userId: input.userId,
        amountKobo: campaign.defaultAmountKobo,
        type: 'CREDIT_SIGNUP_LINK',
        idempotencyKey,
        campaignId: campaign.id,
        reason: `Signup link voucher (${campaign.code})`,
        metadata: {
          campaignCode: campaign.code,
          campaignName: campaign.name,
          conversionSource: input.source || 'SIGNUP',
        },
      })

      if (!result.alreadyApplied) {
        const isSyntheticPhoneEmail = input.email?.toLowerCase().endsWith('@upward.com')
        if (input.email && !isSyntheticPhoneEmail) {
          this.emailService
            .sendSignupVoucherEmail({
              userId: input.userUuid || String(input.userId),
              email: input.email,
              firstName: input.firstName || 'there',
              amountNaira: Number(campaign.defaultAmountKobo) / 100,
              totalBalanceNaira: Number(result.wallet.availableBalanceKobo) / 100,
              campaignName: campaign.name,
            })
            .catch((err) =>
              this.logger.error(
                `Failed to send signup voucher email for userId=${input.userId}`,
                err,
              ),
            )
        }
      }

      return {
        credited: !result.alreadyApplied,
        amountKobo: campaign.defaultAmountKobo,
        totalBalanceKobo: result.wallet.availableBalanceKobo,
        campaignCode: campaign.code,
        reason: result.alreadyApplied ? 'Already credited' : undefined,
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to credit signup voucher (code=${campaign.code}) for userId=${input.userId}: ${err?.message}`,
      )
      return {
        credited: false,
        amountKobo: 0n,
        totalBalanceKobo: 0n,
        reason: err?.message || 'Credit failed',
      }
    }
  }
}
