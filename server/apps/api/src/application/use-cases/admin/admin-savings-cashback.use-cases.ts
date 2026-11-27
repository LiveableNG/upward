import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

const DEFAULT_CAMPAIGN_CODE = 'ACTIVATION_DEC_2026'
const DEFAULT_CAMPAIGN_NAME = 'Rent Savings Activation Cashback (Dec 2026)'
const DEFAULT_REWARD_KOBO = 300000n // NGN 3,000
const DEFAULT_BUDGET_CAP_KOBO = 5000000n // NGN 50,000

export class UpsertCashbackCampaignDto {
  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  rewardAmountNgn?: number

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Type(() => Number)
  budgetCapNgn?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class CreditSavingsCashbackDto {
  @IsNotEmpty()
  @IsString()
  userUuid!: string

  @IsOptional()
  @IsString()
  campaignCode?: string

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  amountNgn?: number

  @IsOptional()
  @IsString()
  fundingSource?: string

  @IsOptional()
  @IsString()
  notes?: string
}

@Injectable()
export class GetSavingsCashbackOverviewUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptSafe(val?: string | null): string {
    if (!val) return ''
    try {
      return this.encryption.decrypt(val)
    } catch {
      return val
    }
  }

  async execute(campaignCode?: string) {
    const code = (campaignCode || DEFAULT_CAMPAIGN_CODE).trim().toUpperCase()

    let campaign = await this.prisma.upward_savings_cashback_campaign.findUnique({
      where: { code },
    })

    if (!campaign && code === DEFAULT_CAMPAIGN_CODE) {
      campaign = await this.prisma.upward_savings_cashback_campaign.create({
        data: {
          code: DEFAULT_CAMPAIGN_CODE,
          name: DEFAULT_CAMPAIGN_NAME,
          description:
            'NGN 3,000 real-money activation cashback credited into verified savers rent vaults (NGN 50,000 budget cap).',
          rewardAmountKobo: DEFAULT_REWARD_KOBO,
          budgetCapKobo: DEFAULT_BUDGET_CAP_KOBO,
          totalDisbursedKobo: 0n,
          isActive: true,
        },
      })
    }

    if (!campaign) {
      throw new NotFoundException(`Cashback campaign ${code} not found`)
    }

    const [grants, activeVaults] = await Promise.all([
      this.prisma.upward_savings_cashback_grant.findMany({
        where: { campaignId: campaign.id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { uuid: true, firstName: true, lastName: true, email: true },
          },
          vault: {
            select: { uuid: true, productOption: true, lockStatus: true },
          },
        },
      }),
      this.prisma.upward_rent_vault.findMany({
        where: { lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          user: {
            select: { id: true, uuid: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ])

    const creditedOrReservedUserIds = new Set(
      grants
        .filter((g) => g.status === 'CREDITED' || g.status === 'RESERVED')
        .map((g) => g.userId),
    )
    const creditedUserIds = new Set(
      grants.filter((g) => g.status === 'CREDITED').map((g) => g.userId),
    )
    const reservedUserIds = new Set(
      grants.filter((g) => g.status === 'RESERVED').map((g) => g.userId),
    )
    const remainingBudgetKobo =
      campaign.budgetCapKobo > campaign.totalDisbursedKobo
        ? campaign.budgetCapKobo - campaign.totalDisbursedKobo
        : 0n
    const slotsTotal =
      campaign.rewardAmountKobo > 0n
        ? Number(campaign.budgetCapKobo / campaign.rewardAmountKobo)
        : 0
    const slotsUsed = grants.filter(
      (g) => (g.status === 'CREDITED' || g.status === 'RESERVED') && g.amountKobo > 0n,
    ).length
    const reservedCount = grants.filter((g) => g.status === 'RESERVED').length
    const creditedCount = grants.filter((g) => g.status === 'CREDITED').length
    const waitlistedCount = grants.filter((g) => g.status === 'WAITLISTED').length

    return {
      success: true,
      data: {
        campaign: {
          uuid: campaign.uuid,
          code: campaign.code,
          name: campaign.name,
          description: campaign.description,
          rewardAmountNgn: Number(campaign.rewardAmountKobo) / 100,
          budgetCapNgn: Number(campaign.budgetCapKobo) / 100,
          totalDisbursedNgn: Number(campaign.totalDisbursedKobo) / 100,
          remainingBudgetNgn: Number(remainingBudgetKobo) / 100,
          slotsTotal,
          slotsUsed,
          slotsRemaining: Math.max(0, slotsTotal - slotsUsed),
          reservedCount,
          creditedCount,
          waitlistedCount,
          isActive: campaign.isActive,
          updatedAt: campaign.updatedAt.toISOString(),
        },
        grants: grants.map((g) => ({
          uuid: g.uuid,
          userUuid: g.user?.uuid || '',
          customerName:
            `${this.decryptSafe(g.user?.firstName)} ${this.decryptSafe(g.user?.lastName)}`.trim() ||
            'Tenant',
          customerEmail: this.decryptSafe(g.user?.email),
          vaultUuid: g.vault?.uuid || '',
          hasVault: Boolean(g.vaultId),
          productOption: g.vault?.productOption || 'PENDING_LAUNCH',
          amountNgn: Number(g.amountKobo) / 100,
          status: g.status,
          fundingSource: g.fundingSource,
          reference: g.reference,
          grantedByAdminId: g.grantedByAdminId,
          notes: g.notes,
          createdAt: g.createdAt.toISOString(),
        })),
        eligibleSavers: activeVaults.map((v) => ({
          userUuid: v.user?.uuid || '',
          vaultUuid: v.uuid,
          customerName:
            `${this.decryptSafe(v.user?.firstName)} ${this.decryptSafe(v.user?.lastName)}`.trim() ||
            'Tenant',
          customerEmail: this.decryptSafe(v.user?.email),
          productOption: v.productOption,
          currentPrincipalNgn: Number(v.currentPrincipalKobo) / 100,
          alreadyCredited: creditedUserIds.has(v.userId),
          hasReservedGrant: reservedUserIds.has(v.userId),
          alreadyAllocated: creditedOrReservedUserIds.has(v.userId),
          createdAt: v.createdAt.toISOString(),
        })),
      },
    }
  }
}

@Injectable()
export class UpsertSavingsCashbackCampaignUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: UpsertCashbackCampaignDto, adminId?: string) {
    const code = (dto.code || DEFAULT_CAMPAIGN_CODE).trim().toUpperCase()
    const rewardAmountKobo =
      dto.rewardAmountNgn !== undefined
        ? BigInt(Math.round(dto.rewardAmountNgn * 100))
        : DEFAULT_REWARD_KOBO
    const budgetCapKobo =
      dto.budgetCapNgn !== undefined
        ? BigInt(Math.round(dto.budgetCapNgn * 100))
        : DEFAULT_BUDGET_CAP_KOBO

    if (budgetCapKobo < rewardAmountKobo) {
      throw new BadRequestException('Budget cap must be at least equal to the reward amount.')
    }

    const campaign = await this.prisma.upward_savings_cashback_campaign.upsert({
      where: { code },
      create: {
        code,
        name: dto.name?.trim() || DEFAULT_CAMPAIGN_NAME,
        description: dto.description?.trim() || null,
        rewardAmountKobo,
        budgetCapKobo,
        isActive: dto.isActive ?? true,
        createdByAdminId: adminId || null,
      },
      update: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.rewardAmountNgn !== undefined ? { rewardAmountKobo } : {}),
        ...(dto.budgetCapNgn !== undefined ? { budgetCapKobo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    })

    return {
      success: true,
      data: {
        uuid: campaign.uuid,
        code: campaign.code,
        name: campaign.name,
        rewardAmountNgn: Number(campaign.rewardAmountKobo) / 100,
        budgetCapNgn: Number(campaign.budgetCapKobo) / 100,
        totalDisbursedNgn: Number(campaign.totalDisbursedKobo) / 100,
        isActive: campaign.isActive,
      },
    }
  }
}

@Injectable()
export class CreditSavingsCashbackUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreditSavingsCashbackDto, adminId?: string) {
    const code = (dto.campaignCode || DEFAULT_CAMPAIGN_CODE).trim().toUpperCase()

    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: dto.userUuid },
      select: { id: true, uuid: true, firstName: true, lastName: true },
    })
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    const vault = await this.prisma.upward_rent_vault.findFirst({
      where: {
        userId: user.id,
        lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!vault) {
      throw new BadRequestException(
        'User does not have an active Rent Vault. Complete savings opt-in / vault setup first.',
      )
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let campaign = await tx.upward_savings_cashback_campaign.findUnique({
        where: { code },
      })

      if (!campaign && code === DEFAULT_CAMPAIGN_CODE) {
        campaign = await tx.upward_savings_cashback_campaign.create({
          data: {
            code: DEFAULT_CAMPAIGN_CODE,
            name: DEFAULT_CAMPAIGN_NAME,
            rewardAmountKobo: DEFAULT_REWARD_KOBO,
            budgetCapKobo: DEFAULT_BUDGET_CAP_KOBO,
            totalDisbursedKobo: 0n,
            isActive: true,
            createdByAdminId: adminId || null,
          },
        })
      }

      if (!campaign) {
        throw new NotFoundException(`Cashback campaign ${code} not found.`)
      }
      if (!campaign.isActive) {
        throw new BadRequestException(`Cashback campaign ${code} is currently paused.`)
      }

      const existingGrant = await tx.upward_savings_cashback_grant.findUnique({
        where: {
          campaignId_userId: {
            campaignId: campaign.id,
            userId: user.id,
          },
        },
      })
      if (existingGrant && existingGrant.status === 'CREDITED') {
        throw new ConflictException(
          'This user has already received an activation cashback grant for this campaign.',
        )
      }

      const isPromotingReserved =
        Boolean(existingGrant && existingGrant.status === 'RESERVED' && existingGrant.amountKobo > 0n)

      const amountKobo = isPromotingReserved
        ? existingGrant!.amountKobo
        : dto.amountNgn !== undefined
          ? BigInt(Math.round(dto.amountNgn * 100))
          : campaign.rewardAmountKobo

      if (amountKobo <= 0n) {
        throw new BadRequestException('Cashback amount must be greater than zero.')
      }

      if (!isPromotingReserved && campaign.totalDisbursedKobo + amountKobo > campaign.budgetCapKobo) {
        const remainingNgn = Number(campaign.budgetCapKobo - campaign.totalDisbursedKobo) / 100
        throw new BadRequestException(
          `Campaign budget cap exceeded. Only NGN ${remainingNgn.toLocaleString()} remains in ${campaign.code}.`,
        )
      }

      const freshVault = await tx.upward_rent_vault.findUniqueOrThrow({
        where: { id: vault.id },
      })
      const currentBalanceKobo =
        freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo
      const newBalanceKobo = currentBalanceKobo + amountKobo
      const reference =
        isPromotingReserved && existingGrant?.reference
          ? existingGrant.reference
          : `CBK_${campaign.code}_${user.id}_${Date.now()}`

      const vaultTx = await tx.upward_rent_vault_transaction.create({
        data: {
          vaultId: freshVault.id,
          userId: user.id,
          type: 'CASHBACK',
          amountKobo,
          principalDeltaKobo: amountKobo,
          yieldDeltaKobo: 0n,
          balanceAfterKobo: newBalanceKobo,
          reference: isPromotingReserved ? `CBK_APPLY_${reference}` : reference,
          channel: 'ADMIN_CASHBACK',
          narration: `Activation Cashback Reward (${campaign.name})`,
          metadata: {
            campaignCode: campaign.code,
            fundingSource: dto.fundingSource || 'PAYSTACK_BALANCE',
            grantedByAdminId: adminId || null,
            notes: dto.notes || null,
          } as any,
        },
      })

      await tx.upward_rent_vault.update({
        where: { id: freshVault.id },
        data: {
          currentPrincipalKobo: { increment: amountKobo },
        },
      })

      if (!isPromotingReserved) {
        await tx.upward_savings_cashback_campaign.update({
          where: { id: campaign.id },
          data: {
            totalDisbursedKobo: { increment: amountKobo },
          },
        })
      }

      const grant = existingGrant
        ? await tx.upward_savings_cashback_grant.update({
            where: { id: existingGrant.id },
            data: {
              vaultId: freshVault.id,
              transactionId: vaultTx.id,
              amountKobo,
              status: 'CREDITED',
              fundingSource: dto.fundingSource || existingGrant.fundingSource || 'PAYSTACK_BALANCE',
              grantedByAdminId: adminId || existingGrant.grantedByAdminId || null,
              notes: dto.notes || existingGrant.notes || null,
            },
          })
        : await tx.upward_savings_cashback_grant.create({
            data: {
              campaignId: campaign.id,
              userId: user.id,
              vaultId: freshVault.id,
              transactionId: vaultTx.id,
              amountKobo,
              status: 'CREDITED',
              fundingSource: dto.fundingSource || 'PAYSTACK_BALANCE',
              reference,
              grantedByAdminId: adminId || null,
              notes: dto.notes || null,
            },
          })

      return { grant, vaultTx, newBalanceKobo }
    })

    return {
      success: true,
      message: `Credited NGN ${(Number(result.grant.amountKobo) / 100).toLocaleString()} activation cashback to vault.`,
      data: {
        grantUuid: result.grant.uuid,
        reference: result.grant.reference,
        amountNgn: Number(result.grant.amountKobo) / 100,
        newVaultBalanceNgn: Number(result.newBalanceKobo) / 100,
      },
    }
  }
}
