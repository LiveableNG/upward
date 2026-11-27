import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export const SAVINGS_INTEREST_CAMPAIGN_CODE = 'ACTIVATION_DEC_2026'
export const SAVINGS_INTEREST_CAMPAIGN_NAME = 'Rent Savings Activation Cashback (Dec 2026)'
export const SAVINGS_INTEREST_DEFAULT_REWARD_KOBO = 300_000n // NGN 3,000
export const SAVINGS_INTEREST_DEFAULT_BUDGET_CAP_KOBO = 5_000_000n // NGN 50,000

@Injectable()
export class GetSavingsInterestStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: number) {
    let campaign = await this.prisma.upward_savings_cashback_campaign.findUnique({
      where: { code: SAVINGS_INTEREST_CAMPAIGN_CODE },
    })

    if (!campaign) {
      campaign = await this.prisma.upward_savings_cashback_campaign.create({
        data: {
          code: SAVINGS_INTEREST_CAMPAIGN_CODE,
          name: SAVINGS_INTEREST_CAMPAIGN_NAME,
          description:
            'NGN 3,000 real-money activation cashback reserved for early savers and credited into their Rent Vault (NGN 50,000 budget cap).',
          rewardAmountKobo: SAVINGS_INTEREST_DEFAULT_REWARD_KOBO,
          budgetCapKobo: SAVINGS_INTEREST_DEFAULT_BUDGET_CAP_KOBO,
          totalDisbursedKobo: 0n,
          isActive: true,
        },
      })
    }

    const existingGrant = await this.prisma.upward_savings_cashback_grant.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaign.id,
          userId,
        },
      },
    })

    const remainingBudgetKobo =
      campaign.budgetCapKobo > campaign.totalDisbursedKobo
        ? campaign.budgetCapKobo - campaign.totalDisbursedKobo
        : 0n
    const slotsRemaining =
      campaign.isActive && campaign.rewardAmountKobo > 0n
        ? Number(remainingBudgetKobo / campaign.rewardAmountKobo)
        : 0
    const canWinCashback =
      campaign.isActive && remainingBudgetKobo >= campaign.rewardAmountKobo

    return {
      status: 'success',
      data: {
        has_indicated_interest: Boolean(existingGrant),
        grant_status: (existingGrant?.status as 'RESERVED' | 'CREDITED' | 'WAITLISTED' | 'REVERSED' | null) ?? null,
        allocated_amount_ngn: existingGrant ? Number(existingGrant.amountKobo) / 100 : 0,
        reference: existingGrant?.reference ?? null,
        claimed_at: existingGrant?.createdAt ? existingGrant.createdAt.toISOString() : null,
        campaign: {
          code: campaign.code,
          name: campaign.name,
          reward_amount_ngn: Number(campaign.rewardAmountKobo) / 100,
          can_win_cashback: canWinCashback,
          slots_remaining: Math.max(0, slotsRemaining),
        },
      },
    }
  }
}
