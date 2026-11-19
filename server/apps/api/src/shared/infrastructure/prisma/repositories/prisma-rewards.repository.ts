import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { randomBytes, randomUUID } from 'crypto'
import { PrismaService } from '../prisma.service'
import { EncryptionService } from '../../common/encryption.service'
import {
  AdminRewardsDashboardOverview,
  AdminUserRewardSearchResult,
  ApplyVouchersToOrderResult,
  AwardCashbackInput,
  CampaignStatsSummary,
  CashbackPool,
  CashbackReward,
  CreateVoucherInput,
  PromotionalVoucher,
  RewardCategoryType,
  RewardRule,
  RewardsRepository,
  UserVoucherSummary,
  VoucherRedemptionRecord,
  VoucherRedemptionStatusType,
  VoucherSourceType,
  VoucherStatusType,
} from '../../../../domains/rewards/rewards.repository'

const DEFAULT_RULES_SEED: Array<{
  triggerKey: string
  name: string
  description: string
  rewardCategory: RewardCategoryType
  rewardAmountKobo: bigint
  minQualifyingAmountKobo: bigint
  maxPerUser: number
  expiryDays: number | null
  campaignTag: string | null
}> = [
  {
    triggerKey: 'FORM_INCOME_INFO',
    name: 'Income Information Form',
    description: 'Awarded automatically when a user provides income information or sets an income goal.',
    rewardCategory: 'VOUCHER',
    rewardAmountKobo: 100000n, // ₦1,000
    minQualifyingAmountKobo: 0n,
    maxPerUser: 1,
    expiryDays: null,
    campaignTag: null,
  },
  {
    triggerKey: 'FORM_CAREER_GOALS',
    name: 'Career Goals Form',
    description: 'Awarded automatically when a user shares their career and professional development goals.',
    rewardCategory: 'VOUCHER',
    rewardAmountKobo: 100000n, // ₦1,000
    minQualifyingAmountKobo: 0n,
    maxPerUser: 1,
    expiryDays: null,
    campaignTag: null,
  },
  {
    triggerKey: 'FORM_FINANCIAL_GOALS',
    name: 'Financial & Lifestyle Goals Form',
    description: 'Awarded automatically when a user provides information about their financial, housing, or pay-less goals.',
    rewardCategory: 'VOUCHER',
    rewardAmountKobo: 100000n, // ₦1,000
    minQualifyingAmountKobo: 0n,
    maxPerUser: 1,
    expiryDays: null,
    campaignTag: null,
  },
  {
    triggerKey: 'FORM_HOME_INSURANCE',
    name: 'Home / Rent Support Insurance Form',
    description: 'Awarded automatically when a user completes the enrolment form under the Home / Rent Support Insurance section.',
    rewardCategory: 'VOUCHER',
    rewardAmountKobo: 100000n, // ₦1,000
    minQualifyingAmountKobo: 0n,
    maxPerUser: 1,
    expiryDays: null,
    campaignTag: null,
  },
  {
    triggerKey: 'CAMPAIGN_SIGNUP_VOUCHER',
    name: 'Promotional Sign-Up Page (/signup/voucher)',
    description: 'Awarded automatically when a new user registers through the promotional campaign sign-up page.',
    rewardCategory: 'VOUCHER',
    rewardAmountKobo: 100000n, // ₦1,000
    minQualifyingAmountKobo: 0n,
    maxPerUser: 1,
    expiryDays: null,
    campaignTag: 'voucher-signup',
  },
  {
    triggerKey: 'SAVINGS_INTEREST_INDICATION',
    name: 'Savings Interest & Plan Setup Cashback',
    description: 'Real monetary cashback credited directly to the user’s Savings Wallet when they indicate interest and set up their Savings Wallet plan.',
    rewardCategory: 'CASHBACK',
    rewardAmountKobo: 50000n, // ₦500 default cashback on savings setup/interest
    minQualifyingAmountKobo: 200000n, // ₦2,000 minimum target/interest amount
    maxPerUser: 1,
    expiryDays: null,
    campaignTag: null,
  },
  {
    triggerKey: 'SAVINGS_DEPOSIT_QUALIFYING',
    name: 'Qualifying Savings Deposit Cashback',
    description: 'Real monetary cashback credited directly to the user’s Savings Wallet when they save a qualifying amount (e.g. ₦2,000 or ₦3,000+).',
    rewardCategory: 'CASHBACK',
    rewardAmountKobo: 50000n, // ₦500 cashback per qualifying deposit
    minQualifyingAmountKobo: 200000n, // ₦2,000 minimum deposit
    maxPerUser: 5,
    expiryDays: null,
    campaignTag: null,
  },
]

@Injectable()
export class PrismaRewardsRepository implements RewardsRepository {
  private readonly logger = new Logger(PrismaRewardsRepository.name)
  private seeded = false

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

  private mapRule(row: any): RewardRule {
    return {
      id: row.id,
      uuid: row.uuid,
      triggerKey: row.triggerKey,
      name: row.name,
      description: row.description ?? null,
      rewardCategory: (row.rewardCategory as RewardCategoryType) || 'VOUCHER',
      rewardAmountKobo: BigInt(row.rewardAmountKobo ?? 0),
      minQualifyingAmountKobo: BigInt(row.minQualifyingAmountKobo ?? 0),
      maxPerUser: row.maxPerUser ?? 1,
      expiryDays: row.expiryDays ?? null,
      campaignTag: row.campaignTag ?? null,
      isActive: Boolean(row.isActive),
      updatedByAdminId: row.updatedByAdminId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private mapRedemption(row: any): VoucherRedemptionRecord {
    return {
      id: row.id,
      uuid: row.uuid,
      voucherId: row.voucherId,
      userId: row.userId,
      orderId: row.orderId ?? null,
      orderNumber: row.orderNumber ?? null,
      amountDeductedKobo: BigInt(row.amountDeductedKobo ?? 0),
      status: (row.status as VoucherRedemptionStatusType) || 'APPLIED',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private mapVoucher(row: any): PromotionalVoucher {
    const now = new Date()
    let effectiveStatus = (row.status as VoucherStatusType) || 'ACTIVE'
    if (
      (effectiveStatus === 'ACTIVE' || effectiveStatus === 'PARTIALLY_REDEEMED') &&
      row.expiresAt &&
      new Date(row.expiresAt) < now &&
      BigInt(row.remainingAmountKobo ?? 0) > 0n
    ) {
      effectiveStatus = 'EXPIRED'
    }

    return {
      id: row.id,
      uuid: row.uuid,
      code: row.code,
      userId: row.userId,
      amountKobo: BigInt(row.amountKobo ?? 0),
      redeemedAmountKobo: BigInt(row.redeemedAmountKobo ?? 0),
      remainingAmountKobo:
        effectiveStatus === 'EXPIRED' || effectiveStatus === 'REVOKED'
          ? 0n
          : BigInt(row.remainingAmountKobo ?? 0),
      currency: row.currency || 'NGN',
      status: effectiveStatus,
      sourceType: (row.sourceType as VoucherSourceType) || 'OTHER',
      triggerKey: row.triggerKey ?? null,
      campaignTag: row.campaignTag ?? null,
      reason: row.reason,
      notes: row.notes ?? null,
      awardedByAdminId: row.awardedByAdminId ?? null,
      awardedByAdminEmail: row.awardedByAdminEmail ?? null,
      idempotencyKey: row.idempotencyKey ?? null,
      expiresAt: row.expiresAt ?? null,
      redeemedAt: row.redeemedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      redemptions: Array.isArray(row.redemptions)
        ? row.redemptions.map((r: any) => this.mapRedemption(r))
        : undefined,
      user: row.user
        ? {
            id: row.user.id,
            uuid: row.user.uuid,
            firstName: this.decryptSafe(row.user.firstName),
            lastName: this.decryptSafe(row.user.lastName),
            email: this.decryptSafe(row.user.email),
            phone: row.user.phone ? this.decryptSafe(row.user.phone) : null,
            signupCampaignTag: row.user.signupCampaignTag ?? null,
          }
        : undefined,
    }
  }

  private mapCashbackPool(row: any): CashbackPool {
    return {
      id: row.id,
      key: row.key,
      availableBalanceKobo: BigInt(row.availableBalanceKobo ?? 0),
      totalDisbursedKobo: BigInt(row.totalDisbursedKobo ?? 0),
      currency: row.currency || 'NGN',
      updatedByAdminId: row.updatedByAdminId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private mapCashbackReward(row: any): CashbackReward {
    return {
      id: row.id,
      uuid: row.uuid,
      userId: row.userId,
      vaultId: row.vaultId ?? null,
      amountKobo: BigInt(row.amountKobo ?? 0),
      currency: row.currency || 'NGN',
      triggerKey: row.triggerKey,
      qualifyingActivityAmountKobo:
        row.qualifyingActivityAmountKobo != null
          ? BigInt(row.qualifyingActivityAmountKobo)
          : null,
      reason: row.reason,
      status: row.status,
      awardedByAdminId: row.awardedByAdminId ?? null,
      awardedByAdminEmail: row.awardedByAdminEmail ?? null,
      idempotencyKey: row.idempotencyKey ?? null,
      reference: row.reference,
      createdAt: row.createdAt,
      user: row.user
        ? {
            id: row.user.id,
            uuid: row.user.uuid,
            firstName: this.decryptSafe(row.user.firstName),
            lastName: this.decryptSafe(row.user.lastName),
            email: this.decryptSafe(row.user.email),
            phone: row.user.phone ? this.decryptSafe(row.user.phone) : null,
          }
        : undefined,
    }
  }

  async ensureDefaultRulesAndPool(): Promise<void> {
    if (this.seeded) return
    try {
      for (const seed of DEFAULT_RULES_SEED) {
        await this.prisma.upward_reward_rule.upsert({
          where: { triggerKey: seed.triggerKey },
          create: {
            triggerKey: seed.triggerKey,
            name: seed.name,
            description: seed.description,
            rewardCategory: seed.rewardCategory,
            rewardAmountKobo: seed.rewardAmountKobo,
            minQualifyingAmountKobo: seed.minQualifyingAmountKobo,
            maxPerUser: seed.maxPerUser,
            expiryDays: seed.expiryDays,
            campaignTag: seed.campaignTag,
            isActive: true,
          },
          update: {},
        })
      }

      await this.prisma.upward_cashback_pool.upsert({
        where: { key: 'DEFAULT_POOL' },
        create: {
          key: 'DEFAULT_POOL',
          availableBalanceKobo: 5000000000n, // ₦50,000,000 initial pool
          totalDisbursedKobo: 0n,
          currency: 'NGN',
        },
        update: {},
      })

      this.seeded = true
    } catch (err: any) {
      this.logger.warn(`Failed to seed default reward rules/pool (non-fatal): ${err?.message}`)
    }
  }

  async findAllRules(): Promise<RewardRule[]> {
    await this.ensureDefaultRulesAndPool()
    const rows = await this.prisma.upward_reward_rule.findMany({
      orderBy: [{ rewardCategory: 'asc' }, { id: 'asc' }],
    })
    return rows.map((r) => this.mapRule(r))
  }

  async findRuleByTriggerKey(triggerKey: string): Promise<RewardRule | null> {
    await this.ensureDefaultRulesAndPool()
    const row = await this.prisma.upward_reward_rule.findUnique({
      where: { triggerKey },
    })
    return row ? this.mapRule(row) : null
  }

  async upsertRule(
    triggerKey: string,
    data: {
      name?: string
      description?: string | null
      rewardCategory?: RewardCategoryType
      rewardAmountKobo?: bigint
      minQualifyingAmountKobo?: bigint
      maxPerUser?: number
      expiryDays?: number | null
      campaignTag?: string | null
      isActive?: boolean
      updatedByAdminId?: string | null
    },
  ): Promise<RewardRule> {
    await this.ensureDefaultRulesAndPool()
    const existing = await this.prisma.upward_reward_rule.findUnique({
      where: { triggerKey },
    })

    if (existing) {
      const updated = await this.prisma.upward_reward_rule.update({
        where: { triggerKey },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.rewardCategory !== undefined ? { rewardCategory: data.rewardCategory } : {}),
          ...(data.rewardAmountKobo !== undefined
            ? { rewardAmountKobo: data.rewardAmountKobo }
            : {}),
          ...(data.minQualifyingAmountKobo !== undefined
            ? { minQualifyingAmountKobo: data.minQualifyingAmountKobo }
            : {}),
          ...(data.maxPerUser !== undefined ? { maxPerUser: data.maxPerUser } : {}),
          ...(data.expiryDays !== undefined ? { expiryDays: data.expiryDays } : {}),
          ...(data.campaignTag !== undefined ? { campaignTag: data.campaignTag } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.updatedByAdminId !== undefined
            ? { updatedByAdminId: data.updatedByAdminId }
            : {}),
        },
      })
      return this.mapRule(updated)
    }

    const created = await this.prisma.upward_reward_rule.create({
      data: {
        triggerKey,
        name: data.name || triggerKey,
        description: data.description ?? null,
        rewardCategory: data.rewardCategory || 'VOUCHER',
        rewardAmountKobo: data.rewardAmountKobo ?? 100000n,
        minQualifyingAmountKobo: data.minQualifyingAmountKobo ?? 0n,
        maxPerUser: data.maxPerUser ?? 1,
        expiryDays: data.expiryDays ?? null,
        campaignTag: data.campaignTag ?? null,
        isActive: data.isActive ?? true,
        updatedByAdminId: data.updatedByAdminId ?? null,
      },
    })
    return this.mapRule(created)
  }

  async getCashbackPool(): Promise<CashbackPool> {
    await this.ensureDefaultRulesAndPool()
    const pool = await this.prisma.upward_cashback_pool.upsert({
      where: { key: 'DEFAULT_POOL' },
      create: {
        key: 'DEFAULT_POOL',
        availableBalanceKobo: 5000000000n,
        totalDisbursedKobo: 0n,
        currency: 'NGN',
      },
      update: {},
    })
    return this.mapCashbackPool(pool)
  }

  async topUpCashbackPool(amountKobo: bigint, adminId?: string): Promise<CashbackPool> {
    await this.ensureDefaultRulesAndPool()
    const updated = await this.prisma.upward_cashback_pool.update({
      where: { key: 'DEFAULT_POOL' },
      data: {
        availableBalanceKobo: { increment: amountKobo },
        ...(adminId ? { updatedByAdminId: adminId } : {}),
      },
    })
    return this.mapCashbackPool(updated)
  }

  async findVoucherByIdempotencyKey(idempotencyKey: string): Promise<PromotionalVoucher | null> {
    const row = await this.prisma.upward_promotional_voucher.findUnique({
      where: { idempotencyKey },
      include: { redemptions: true, user: true },
    })
    return row ? this.mapVoucher(row) : null
  }

  async countUserVouchersByTriggerKey(userId: number, triggerKey: string): Promise<number> {
    return this.prisma.upward_promotional_voucher.count({
      where: {
        userId,
        triggerKey,
        status: { not: 'REVOKED' },
      },
    })
  }

  async createVoucher(input: CreateVoucherInput): Promise<PromotionalVoucher> {
    if (input.idempotencyKey) {
      const existing = await this.findVoucherByIdempotencyKey(input.idempotencyKey)
      if (existing) return existing
    }

    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const rand = randomBytes(3).toString('hex').toUpperCase()
    const code = `UPW-VCH-${ym}-${rand}`

    const created = await this.prisma.upward_promotional_voucher.create({
      data: {
        code,
        userId: input.userId,
        amountKobo: input.amountKobo,
        redeemedAmountKobo: 0n,
        remainingAmountKobo: input.amountKobo,
        currency: input.currency || 'NGN',
        status: 'ACTIVE',
        sourceType: input.sourceType,
        triggerKey: input.triggerKey ?? null,
        campaignTag: input.campaignTag ?? null,
        reason: input.reason,
        notes: input.notes ?? null,
        awardedByAdminId: input.awardedByAdminId ?? null,
        awardedByAdminEmail: input.awardedByAdminEmail ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        expiresAt: input.expiresAt ?? null,
      },
      include: {
        redemptions: true,
        user: true,
      },
    })

    // Create in-app notification for the user so both web and existing mobile app display the earned voucher
    try {
      const amountNaira = Number(input.amountKobo) / 100
      const formattedNaira = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(amountNaira)

      const balanceKobo = await this.getAvailableVoucherBalanceKobo(input.userId)
      const formattedBalance = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(Number(balanceKobo) / 100)

      await this.prisma.upward_notification.create({
        data: {
          userId: input.userId,
          title: `You earned a ${formattedNaira} Promotional Voucher!`,
          message: `${input.reason}. Your total available Marketplace Voucher balance is now ${formattedBalance}. Redeem it automatically on any Upward Marketplace purchase.`,
          type: 'REWARD_VOUCHER',
          url: '/dashboard/lifestyle',
          isRead: false,
        },
      })
    } catch (notifErr: any) {
      this.logger.warn(`Failed to create voucher notification: ${notifErr?.message}`)
    }

    return this.mapVoucher(created)
  }

  private async expireOverdueVouchersForUser(userId: number): Promise<void> {
    const now = new Date()
    await this.prisma.upward_promotional_voucher.updateMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] },
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    })
  }

  async getAvailableVoucherBalanceKobo(userId: number): Promise<bigint> {
    await this.expireOverdueVouchersForUser(userId)
    const activeVouchers = await this.prisma.upward_promotional_voucher.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] },
        remainingAmountKobo: { gt: 0n },
      },
      select: { remainingAmountKobo: true },
    })

    return activeVouchers.reduce(
      (sum, v) => sum + BigInt(v.remainingAmountKobo ?? 0),
      0n,
    )
  }

  async getUserVoucherSummary(userId: number): Promise<UserVoucherSummary> {
    await this.expireOverdueVouchersForUser(userId)

    const [vouchersRows, redemptionsRows, cashbackRows] = await Promise.all([
      this.prisma.upward_promotional_voucher.findMany({
        where: { userId },
        include: { redemptions: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_voucher_redemption.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_cashback_reward.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const vouchers = vouchersRows.map((v) => this.mapVoucher(v))
    const redemptions = redemptionsRows.map((r) => this.mapRedemption(r))
    const cashbackRewards = cashbackRows.map((c) => this.mapCashbackReward(c))

    let totalEarnedKobo = 0n
    let totalRedeemedKobo = 0n
    let totalExpiredKobo = 0n
    let availableBalanceKobo = 0n
    let activeVouchersCount = 0

    for (const v of vouchers) {
      if (v.status === 'REVOKED') continue
      totalEarnedKobo += v.amountKobo
      totalRedeemedKobo += v.redeemedAmountKobo
      if (v.status === 'EXPIRED') {
        totalExpiredKobo += v.amountKobo - v.redeemedAmountKobo
      } else if (
        (v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED') &&
        v.remainingAmountKobo > 0n
      ) {
        availableBalanceKobo += v.remainingAmountKobo
        activeVouchersCount += 1
      }
    }

    const totalCashbackKobo = cashbackRewards.reduce((sum, c) => sum + c.amountKobo, 0n)

    return {
      userId,
      totalEarnedKobo,
      totalRedeemedKobo,
      totalExpiredKobo,
      availableBalanceKobo,
      activeVouchersCount,
      vouchers,
      redemptions,
      cashbackRewards,
      totalCashbackKobo,
    }
  }

  async applyUserVouchersToOrder(params: {
    userId: number
    orderId?: number | null
    orderNumber?: string | null
    maxDiscountKobo: bigint
  }): Promise<ApplyVouchersToOrderResult> {
    if (params.maxDiscountKobo <= 0n) {
      return { totalDiscountAppliedKobo: 0n, redemptions: [] }
    }

    await this.expireOverdueVouchersForUser(params.userId)

    return this.prisma.$transaction(async (tx) => {
      // 1. If the user had any previous 'APPLIED' (unpaid/abandoned) voucher redemptions,
      // release them back to the user's vouchers first so abandoned checkouts never lock vouchers.
      const staleApplied = await tx.upward_voucher_redemption.findMany({
        where: {
          userId: params.userId,
          status: 'APPLIED',
        },
        include: {
          order: {
            select: { id: true, paymentStatus: true, status: true },
          },
        },
      })

      for (const stale of staleApplied) {
        const isOrderPaid = stale.order?.paymentStatus === 'PAID'
        if (isOrderPaid) {
          await tx.upward_voucher_redemption.update({
            where: { id: stale.id },
            data: { status: 'CONFIRMED' },
          })
          continue
        }

        const voucher = await tx.upward_promotional_voucher.findUnique({
          where: { id: stale.voucherId },
        })
        if (voucher) {
          const restoredRemaining =
            BigInt(voucher.remainingAmountKobo) + BigInt(stale.amountDeductedKobo)
          const restoredRedeemed =
            BigInt(voucher.redeemedAmountKobo) > BigInt(stale.amountDeductedKobo)
              ? BigInt(voucher.redeemedAmountKobo) - BigInt(stale.amountDeductedKobo)
              : 0n
          const nextStatus: VoucherStatusType =
            restoredRedeemed > 0n ? 'PARTIALLY_REDEEMED' : 'ACTIVE'

          await tx.upward_promotional_voucher.update({
            where: { id: voucher.id },
            data: {
              remainingAmountKobo: restoredRemaining,
              redeemedAmountKobo: restoredRedeemed,
              status: nextStatus,
              redeemedAt: null,
            },
          })
        }

        await tx.upward_voucher_redemption.update({
          where: { id: stale.id },
          data: { status: 'RELEASED' },
        })
      }

      // 2. Fetch available active vouchers in FIFO order (earliest expiring first, then oldest created)
      const activeVouchers = await tx.upward_promotional_voucher.findMany({
        where: {
          userId: params.userId,
          status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] },
          remainingAmountKobo: { gt: 0n },
        },
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
      })

      let remainingToDiscount = params.maxDiscountKobo
      let totalDiscountAppliedKobo = 0n
      const createdRedemptions: VoucherRedemptionRecord[] = []

      for (const v of activeVouchers) {
        if (remainingToDiscount <= 0n) break
        const available = BigInt(v.remainingAmountKobo)
        if (available <= 0n) continue

        const deduct = available <= remainingToDiscount ? available : remainingToDiscount
        const newRemaining = available - deduct
        const newRedeemed = BigInt(v.redeemedAmountKobo) + deduct
        const newStatus: VoucherStatusType =
          newRemaining === 0n ? 'REDEEMED' : 'PARTIALLY_REDEEMED'

        await tx.upward_promotional_voucher.update({
          where: { id: v.id },
          data: {
            remainingAmountKobo: newRemaining,
            redeemedAmountKobo: newRedeemed,
            status: newStatus,
            redeemedAt: newRemaining === 0n ? new Date() : v.redeemedAt,
          },
        })

        const redemptionRow = await tx.upward_voucher_redemption.create({
          data: {
            voucherId: v.id,
            userId: params.userId,
            orderId: params.orderId ?? null,
            orderNumber: params.orderNumber ?? null,
            amountDeductedKobo: deduct,
            status: 'APPLIED',
          },
        })

        createdRedemptions.push(this.mapRedemption(redemptionRow))
        totalDiscountAppliedKobo += deduct
        remainingToDiscount -= deduct
      }

      return {
        totalDiscountAppliedKobo,
        redemptions: createdRedemptions,
      }
    })
  }

  async attachOrderToAppliedRedemptions(params: {
    userId: number
    redemptionIds: number[]
    orderId: number
    orderNumber: string
  }): Promise<void> {
    if (!params.redemptionIds || params.redemptionIds.length === 0) return
    await this.prisma.upward_voucher_redemption.updateMany({
      where: {
        id: { in: params.redemptionIds },
        userId: params.userId,
      },
      data: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
      },
    })
  }

  async confirmOrderVoucherRedemptions(orderId: number): Promise<void> {
    await this.prisma.upward_voucher_redemption.updateMany({
      where: {
        orderId,
        status: 'APPLIED',
      },
      data: {
        status: 'CONFIRMED',
      },
    })
  }

  async releaseOrderVoucherRedemptions(orderId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const redemptions = await tx.upward_voucher_redemption.findMany({
        where: {
          orderId,
          status: 'APPLIED',
        },
      })

      for (const r of redemptions) {
        const voucher = await tx.upward_promotional_voucher.findUnique({
          where: { id: r.voucherId },
        })
        if (voucher) {
          const restoredRemaining =
            BigInt(voucher.remainingAmountKobo) + BigInt(r.amountDeductedKobo)
          const restoredRedeemed =
            BigInt(voucher.redeemedAmountKobo) > BigInt(r.amountDeductedKobo)
              ? BigInt(voucher.redeemedAmountKobo) - BigInt(r.amountDeductedKobo)
              : 0n
          const nextStatus: VoucherStatusType =
            restoredRedeemed > 0n ? 'PARTIALLY_REDEEMED' : 'ACTIVE'

          await tx.upward_promotional_voucher.update({
            where: { id: voucher.id },
            data: {
              remainingAmountKobo: restoredRemaining,
              redeemedAmountKobo: restoredRedeemed,
              status: nextStatus,
              redeemedAt: null,
            },
          })
        }

        await tx.upward_voucher_redemption.update({
          where: { id: r.id },
          data: { status: 'RELEASED' },
        })
      }
    })
  }

  async releaseUnboundAppliedRedemptionsForUser(userId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const redemptions = await tx.upward_voucher_redemption.findMany({
        where: {
          userId,
          orderId: null,
          status: 'APPLIED',
        },
      })

      for (const r of redemptions) {
        const voucher = await tx.upward_promotional_voucher.findUnique({
          where: { id: r.voucherId },
        })
        if (voucher) {
          const restoredRemaining =
            BigInt(voucher.remainingAmountKobo) + BigInt(r.amountDeductedKobo)
          const restoredRedeemed =
            BigInt(voucher.redeemedAmountKobo) > BigInt(r.amountDeductedKobo)
              ? BigInt(voucher.redeemedAmountKobo) - BigInt(r.amountDeductedKobo)
              : 0n
          const nextStatus: VoucherStatusType =
            restoredRedeemed > 0n ? 'PARTIALLY_REDEEMED' : 'ACTIVE'

          await tx.upward_promotional_voucher.update({
            where: { id: voucher.id },
            data: {
              remainingAmountKobo: restoredRemaining,
              redeemedAmountKobo: restoredRedeemed,
              status: nextStatus,
              redeemedAt: null,
            },
          })
        }

        await tx.upward_voucher_redemption.update({
          where: { id: r.id },
          data: { status: 'RELEASED' },
        })
      }
    })
  }

  async findCashbackByIdempotencyKey(idempotencyKey: string): Promise<CashbackReward | null> {
    const row = await this.prisma.upward_cashback_reward.findUnique({
      where: { idempotencyKey },
      include: { user: true },
    })
    return row ? this.mapCashbackReward(row) : null
  }

  async countUserCashbackByTriggerKey(userId: number, triggerKey: string): Promise<number> {
    return this.prisma.upward_cashback_reward.count({
      where: {
        userId,
        triggerKey,
      },
    })
  }

  async awardCashbackToSavingsWallet(input: AwardCashbackInput): Promise<CashbackReward> {
    await this.ensureDefaultRulesAndPool()

    if (input.idempotencyKey) {
      const existing = await this.findCashbackByIdempotencyKey(input.idempotencyKey)
      if (existing) return existing
    }

    const rewardRecord = await this.prisma.$transaction(async (tx) => {
      // 1. Verify and deduct from the designated Cashback/Rewards balance pool
      const pool = await tx.upward_cashback_pool.upsert({
        where: { key: 'DEFAULT_POOL' },
        create: {
          key: 'DEFAULT_POOL',
          availableBalanceKobo: 5000000000n,
          totalDisbursedKobo: 0n,
          currency: 'NGN',
        },
        update: {},
      })

      if (BigInt(pool.availableBalanceKobo) < input.amountKobo) {
        throw new BadRequestException(
          'Designated Cashback/Rewards pool balance is insufficient to fund this cashback reward.',
        )
      }

      await tx.upward_cashback_pool.update({
        where: { key: 'DEFAULT_POOL' },
        data: {
          availableBalanceKobo: { decrement: input.amountKobo },
          totalDisbursedKobo: { increment: input.amountKobo },
        },
      })

      // 2. Find or auto-provision the user's active Savings Wallet (upward_rent_vault)
      let vault = await tx.upward_rent_vault.findFirst({
        where: {
          userId: input.userId,
          lockStatus: { notIn: ['SETTLED', 'BROKEN_OUT'] },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!vault) {
        const activeProp = await tx.upward_user_property.findFirst({
          where: { userId: input.userId, isPastTenancy: false },
          orderBy: { createdAt: 'desc' },
        })
        const defaultTargetKobo =
          activeProp?.rentAmount && activeProp.rentAmount > 0
            ? BigInt(Math.round(activeProp.rentAmount * 100))
            : input.qualifyingActivityAmountKobo && input.qualifyingActivityAmountKobo > 0n
              ? input.qualifyingActivityAmountKobo
              : 120000000n // Default ₦1,200,000 target if no property yet

        const defaultDueDate =
          activeProp?.rentEndDate && new Date(activeProp.rentEndDate) > new Date()
            ? new Date(activeProp.rentEndDate)
            : new Date(Date.now() + 330 * 24 * 60 * 60 * 1000)

        const defaultUnlockDate = new Date(defaultDueDate.getTime() - 30 * 24 * 60 * 60 * 1000)

        vault = await tx.upward_rent_vault.create({
          data: {
            userId: input.userId,
            targetAmountKobo: defaultTargetKobo,
            currentPrincipalKobo: 0n,
            accruedYieldKobo: 0n,
            cadence: 'MONTHLY',
            productOption: 'SAVE_AND_EARN',
            planPattern: 'INITIAL_DEPOSIT',
            initialDepositKobo: 0n,
            appliedAnnualRatePct: 14.0,
            insurancePremiumPct: 0,
            contractualDueDate: defaultDueDate,
            unlockDate: defaultUnlockDate,
            lockStatus: 'LOCKED',
            preferredFundingMethod: 'DVA',
            dvaAssignmentStatus: 'PENDING',
            autoBypassPmApproval: true,
            investmentProvider: 'ARM',
          },
        })
      }

      // 3. Move the actual monetary value into the user's Savings Wallet principal
      const currentBalanceKobo =
        BigInt(vault.currentPrincipalKobo) + BigInt(vault.accruedYieldKobo)
      const newBalanceKobo = currentBalanceKobo + input.amountKobo
      const reference = `UPW_CB_${randomUUID()}`

      await tx.upward_rent_vault.update({
        where: { id: vault.id },
        data: {
          currentPrincipalKobo: { increment: input.amountKobo },
        },
      })

      await tx.upward_rent_vault_transaction.create({
        data: {
          vaultId: vault.id,
          userId: input.userId,
          type: 'CASHBACK',
          amountKobo: input.amountKobo,
          principalDeltaKobo: input.amountKobo,
          yieldDeltaKobo: 0n,
          balanceAfterKobo: newBalanceKobo,
          reference,
          channel: 'REWARDS_POOL',
          narration: input.reason,
          metadata: {
            triggerKey: input.triggerKey,
            fundedFromPool: 'DEFAULT_POOL',
            qualifyingActivityAmountKobo: input.qualifyingActivityAmountKobo?.toString() ?? null,
          },
        },
      })

      // 4. Record in upward_cashback_reward audit ledger
      const reward = await tx.upward_cashback_reward.create({
        data: {
          userId: input.userId,
          vaultId: vault.id,
          amountKobo: input.amountKobo,
          currency: 'NGN',
          triggerKey: input.triggerKey,
          qualifyingActivityAmountKobo: input.qualifyingActivityAmountKobo ?? null,
          reason: input.reason,
          status: 'CREDITED_TO_VAULT',
          awardedByAdminId: input.awardedByAdminId ?? null,
          awardedByAdminEmail: input.awardedByAdminEmail ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          reference,
        },
        include: { user: true },
      })

      return reward
    })

    // 5. Notify user in-app
    try {
      const amountNaira = Number(input.amountKobo) / 100
      const formattedNaira = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(amountNaira)

      await this.prisma.upward_notification.create({
        data: {
          userId: input.userId,
          title: `${formattedNaira} Cashback Credited to Your Savings Wallet!`,
          message: `${input.reason}. ${formattedNaira} has been funded into your Savings Wallet and now earns daily compound returns.`,
          type: 'REWARD_CASHBACK',
          url: '/dashboard/savings',
          isRead: false,
        },
      })
    } catch (notifErr: any) {
      this.logger.warn(`Failed to create cashback notification: ${notifErr?.message}`)
    }

    return this.mapCashbackReward(rewardRecord)
  }

  async getAdminOverview(): Promise<AdminRewardsDashboardOverview> {
    await this.ensureDefaultRulesAndPool()

    const [allVouchers, allCashback, pool, campaignSignups] = await Promise.all([
      this.prisma.upward_promotional_voucher.findMany({
        where: { status: { not: 'REVOKED' } },
      }),
      this.prisma.upward_cashback_reward.findMany(),
      this.getCashbackPool(),
      this.prisma.upward_user.groupBy({
        by: ['signupCampaignTag'],
        where: { signupCampaignTag: { not: null } },
        _count: { id: true },
      }),
    ])

    const now = new Date()
    let totalVouchersIssuedKobo = 0n
    let totalVouchersRedeemedKobo = 0n
    let totalActiveVoucherBalanceKobo = 0n

    const campaignMap = new Map<string, CampaignStatsSummary>()

    for (const group of campaignSignups) {
      if (!group.signupCampaignTag) continue
      campaignMap.set(group.signupCampaignTag, {
        campaignTag: group.signupCampaignTag,
        signupsCount: group._count.id,
        vouchersAwardedCount: 0,
        totalVoucherValueKobo: 0n,
        totalRedeemedKobo: 0n,
      })
    }

    for (const v of allVouchers) {
      const amount = BigInt(v.amountKobo ?? 0)
      const redeemed = BigInt(v.redeemedAmountKobo ?? 0)
      const remaining = BigInt(v.remainingAmountKobo ?? 0)
      const isExpired =
        v.status === 'EXPIRED' || (v.expiresAt && new Date(v.expiresAt) < now)

      totalVouchersIssuedKobo += amount
      totalVouchersRedeemedKobo += redeemed
      if (!isExpired && (v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED')) {
        totalActiveVoucherBalanceKobo += remaining
      }

      if (v.campaignTag) {
        const existing = campaignMap.get(v.campaignTag) || {
          campaignTag: v.campaignTag,
          signupsCount: 0,
          vouchersAwardedCount: 0,
          totalVoucherValueKobo: 0n,
          totalRedeemedKobo: 0n,
        }
        existing.vouchersAwardedCount += 1
        existing.totalVoucherValueKobo += amount
        existing.totalRedeemedKobo += redeemed
        campaignMap.set(v.campaignTag, existing)
      }
    }

    const totalCashbackCreditedKobo = allCashback.reduce(
      (sum, c) => sum + BigInt(c.amountKobo ?? 0),
      0n,
    )

    return {
      totalVouchersIssuedCount: allVouchers.length,
      totalVouchersIssuedKobo,
      totalVouchersRedeemedKobo,
      totalActiveVoucherBalanceKobo,
      totalCashbackCreditedCount: allCashback.length,
      totalCashbackCreditedKobo,
      cashbackPool: pool,
      campaignStats: Array.from(campaignMap.values()),
    }
  }

  async searchUsersForRewards(
    query: string,
    limit = 25,
  ): Promise<AdminUserRewardSearchResult[]> {
    const users = await this.prisma.upward_user.findMany({
      include: {
        promotionalVouchers: true,
        cashbackRewards: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const q = (query || '').trim().toLowerCase()
    const now = new Date()

    const mapped: AdminUserRewardSearchResult[] = []

    for (const u of users) {
      const firstName = this.decryptSafe(u.firstName)
      const lastName = this.decryptSafe(u.lastName)
      const email = this.decryptSafe(u.email)
      const phone = u.phone ? this.decryptSafe(u.phone) : null
      const fullName = `${firstName} ${lastName}`.trim()

      if (q) {
        const matches =
          email.toLowerCase().includes(q) ||
          fullName.toLowerCase().includes(q) ||
          (phone && phone.toLowerCase().includes(q)) ||
          u.uuid.toLowerCase().includes(q) ||
          (u.signupCampaignTag && u.signupCampaignTag.toLowerCase().includes(q))
        if (!matches) continue
      }

      let availableVoucherBalanceKobo = 0n
      let totalVouchersEarnedKobo = 0n
      let totalVouchersRedeemedKobo = 0n

      for (const v of u.promotionalVouchers || []) {
        if (v.status === 'REVOKED') continue
        const amount = BigInt(v.amountKobo ?? 0)
        const redeemed = BigInt(v.redeemedAmountKobo ?? 0)
        const remaining = BigInt(v.remainingAmountKobo ?? 0)
        const isExpired =
          v.status === 'EXPIRED' || (v.expiresAt && new Date(v.expiresAt) < now)

        totalVouchersEarnedKobo += amount
        totalVouchersRedeemedKobo += redeemed
        if (!isExpired && (v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED')) {
          availableVoucherBalanceKobo += remaining
        }
      }

      const totalCashbackEarnedKobo = (u.cashbackRewards || []).reduce(
        (sum, c) => sum + BigInt(c.amountKobo ?? 0),
        0n,
      )

      mapped.push({
        id: u.id,
        uuid: u.uuid,
        firstName,
        lastName,
        email,
        phone,
        signupCampaignTag: u.signupCampaignTag ?? null,
        availableVoucherBalanceKobo,
        totalVouchersEarnedKobo,
        totalVouchersRedeemedKobo,
        totalCashbackEarnedKobo,
        createdAt: u.createdAt,
      })

      if (mapped.length >= limit) break
    }

    return mapped
  }

  async listRecentVouchers(filter?: {
    userId?: number
    status?: string
    sourceType?: string
    campaignTag?: string
    skip?: number
    take?: number
  }): Promise<{ items: PromotionalVoucher[]; total: number }> {
    const where: any = {}
    if (filter?.userId) where.userId = filter.userId
    if (filter?.status) where.status = filter.status
    if (filter?.sourceType) where.sourceType = filter.sourceType
    if (filter?.campaignTag) where.campaignTag = filter.campaignTag

    const [rows, total] = await Promise.all([
      this.prisma.upward_promotional_voucher.findMany({
        where,
        include: {
          user: true,
          redemptions: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter?.skip ?? 0,
        take: filter?.take ?? 50,
      }),
      this.prisma.upward_promotional_voucher.count({ where }),
    ])

    return {
      items: rows.map((r) => this.mapVoucher(r)),
      total,
    }
  }

  async listRecentCashbackRewards(filter?: {
    userId?: number
    triggerKey?: string
    skip?: number
    take?: number
  }): Promise<{ items: CashbackReward[]; total: number }> {
    const where: any = {}
    if (filter?.userId) where.userId = filter.userId
    if (filter?.triggerKey) where.triggerKey = filter.triggerKey

    const [rows, total] = await Promise.all([
      this.prisma.upward_cashback_reward.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: filter?.skip ?? 0,
        take: filter?.take ?? 50,
      }),
      this.prisma.upward_cashback_reward.count({ where }),
    ])

    return {
      items: rows.map((r) => this.mapCashbackReward(r)),
      total,
    }
  }
}
