import { Injectable, Logger } from '@nestjs/common'
import { IsOptional, IsString } from 'class-validator'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import {
  SAVINGS_INTEREST_CAMPAIGN_CODE,
  SAVINGS_INTEREST_CAMPAIGN_NAME,
  SAVINGS_INTEREST_DEFAULT_BUDGET_CAP_KOBO,
  SAVINGS_INTEREST_DEFAULT_REWARD_KOBO,
} from './get-savings-interest-status.use-case'

export class IndicateSavingsInterestDto {
  @IsOptional()
  @IsString()
  source?: string
}

@Injectable()
export class IndicateSavingsInterestUseCase {
  private readonly logger = new Logger(IndicateSavingsInterestUseCase.name)

  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: number, dto?: IndicateSavingsInterestDto) {
    const source = (dto?.source || 'savings_cta').trim().slice(0, 64)

    const result = await this.prisma.$transaction(async (tx) => {
      let campaign = await tx.upward_savings_cashback_campaign.findUnique({
        where: { code: SAVINGS_INTEREST_CAMPAIGN_CODE },
      })

      if (!campaign) {
        campaign = await tx.upward_savings_cashback_campaign.create({
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

      // Row-level lock on the campaign to serialize concurrent claims against budgetCapKobo
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT id FROM upward_savings_cashback_campaign WHERE id = ${campaign.id} FOR UPDATE`
        const lockedCampaign = await tx.upward_savings_cashback_campaign.findUnique({
          where: { id: campaign.id },
        })
        if (lockedCampaign) {
          campaign = lockedCampaign
        }
      }

      const existingGrant = await tx.upward_savings_cashback_grant.findUnique({
        where: {
          campaignId_userId: {
            campaignId: campaign.id,
            userId,
          },
        },
      })

      if (existingGrant) {
        return {
          alreadyClaimed: true,
          wonCashback:
            existingGrant.amountKobo > 0n &&
            (existingGrant.status === 'RESERVED' || existingGrant.status === 'CREDITED'),
          grant: existingGrant,
          campaign,
        }
      }

      const hasBudget =
        campaign.isActive &&
        campaign.rewardAmountKobo > 0n &&
        campaign.totalDisbursedKobo + campaign.rewardAmountKobo <= campaign.budgetCapKobo

      if (hasBudget) {
        const rewardAmountKobo = campaign.rewardAmountKobo
        const reference = `INT_CBK_${campaign.code}_${userId}_${Date.now()}`

        const updatedCampaign = await tx.upward_savings_cashback_campaign.update({
          where: { id: campaign.id },
          data: {
            totalDisbursedKobo: { increment: rewardAmountKobo },
          },
        })

        const grant = await tx.upward_savings_cashback_grant.create({
          data: {
            campaignId: campaign.id,
            userId,
            vaultId: null,
            transactionId: null,
            amountKobo: rewardAmountKobo,
            status: 'RESERVED',
            fundingSource: 'SELF_CLAIM_INTEREST',
            reference,
            notes: `Early savings interest cashback reserved via ${source}`,
          },
        })

        return {
          alreadyClaimed: false,
          wonCashback: true,
          grant,
          campaign: updatedCampaign || campaign,
        }
      }

      // Campaign cap reached or paused: record interest cleanly without exceeding budget
      const reference = `INT_WL_${campaign.code}_${userId}_${Date.now()}`
      const grant = await tx.upward_savings_cashback_grant.create({
        data: {
          campaignId: campaign.id,
          userId,
          vaultId: null,
          transactionId: null,
          amountKobo: 0n,
          status: 'WAITLISTED',
          fundingSource: 'INTEREST_WAITLIST',
          reference,
          notes: `Early savings interest recorded via ${source} (cashback slots full)`,
        },
      })

      return {
        alreadyClaimed: false,
        wonCashback: false,
        grant,
        campaign,
      }
    })

    const allocatedAmountNgn = Number(result.grant.amountKobo) / 100

    // Send an in-app notification on first-time interest indication
    if (!result.alreadyClaimed && this.prisma.upward_notification) {
      await this.prisma.upward_notification
        .create({
          data: {
            userId,
            title: result.wonCashback
              ? `You got ₦${allocatedAmountNgn.toLocaleString()} towards your rent!`
              : "You're on the Rent Savings list!",
            message: result.wonCashback
              ? `Your ₦${allocatedAmountNgn.toLocaleString()} Rent Savings bonus is saved for you. We'll let you know as soon as Rent Savings opens.`
              : "We'll let you know as soon as Rent Savings opens so you can start saving for your next rent.",
            type: 'GENERAL',
            url: '/dashboard/savings',
          },
        })
        .catch((err: any) => {
          this.logger.warn(`Failed to create savings interest notification: ${err?.message}`)
        })
    }

    const remainingBudgetKobo =
      result.campaign.budgetCapKobo > result.campaign.totalDisbursedKobo
        ? result.campaign.budgetCapKobo - result.campaign.totalDisbursedKobo
        : 0n
    const slotsRemaining =
      result.campaign.isActive && result.campaign.rewardAmountKobo > 0n
        ? Number(remainingBudgetKobo / result.campaign.rewardAmountKobo)
        : 0

    return {
      status: 'success',
      data: {
        already_claimed: result.alreadyClaimed,
        won_cashback: result.wonCashback,
        has_indicated_interest: true,
        grant_status: result.grant.status,
        allocated_amount_ngn: allocatedAmountNgn,
        reference: result.grant.reference,
        claimed_at: result.grant.createdAt
          ? result.grant.createdAt.toISOString()
          : new Date().toISOString(),
        campaign: {
          code: result.campaign.code,
          name: result.campaign.name,
          reward_amount_ngn: Number(result.campaign.rewardAmountKobo) / 100,
          can_win_cashback:
            result.campaign.isActive &&
            remainingBudgetKobo >= result.campaign.rewardAmountKobo,
          slots_remaining: Math.max(0, slotsRemaining),
        },
      },
    }
  }
}
