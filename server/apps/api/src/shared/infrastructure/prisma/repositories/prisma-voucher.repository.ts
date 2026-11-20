import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  CreditVoucherParams,
  CreditVoucherResult,
  ReserveVoucherResult,
  VoucherCampaign,
  VoucherLedgerEntry,
  VoucherRepository,
  VoucherWallet,
} from '../../../../domains/vouchers/voucher.repository'

@Injectable()
export class PrismaVoucherRepository implements VoucherRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCampaignByCode(code: string): Promise<VoucherCampaign | null> {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return null

    const campaign = await this.prisma.upward_voucher_campaign.findFirst({
      where: {
        code: { equals: normalized, mode: 'insensitive' },
      },
    })
    return campaign as unknown as VoucherCampaign | null
  }

  async listCampaigns(): Promise<VoucherCampaign[]> {
    const campaigns = await this.prisma.upward_voucher_campaign.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })
    return campaigns as unknown as VoucherCampaign[]
  }

  async getWalletByUserId(userId: number): Promise<VoucherWallet | null> {
    const wallet = await this.prisma.upward_voucher_wallet.findUnique({
      where: { userId },
    })
    return wallet as unknown as VoucherWallet | null
  }

  async getAvailableBalanceKobo(userId: number): Promise<bigint> {
    const wallet = await this.prisma.upward_voucher_wallet.findUnique({
      where: { userId },
      select: { availableBalanceKobo: true },
    })
    return wallet?.availableBalanceKobo ?? 0n
  }

  async listLedgerByUserId(userId: number, limit = 100): Promise<VoucherLedgerEntry[]> {
    const entries = await this.prisma.upward_voucher_ledger_entry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        campaign: {
          select: { id: true, code: true, name: true, type: true },
        },
        grantedByAdmin: {
          select: { id: true, email: true },
        },
        order: {
          select: { id: true, uuid: true, orderNumber: true },
        },
      },
    })
    return entries as unknown as VoucherLedgerEntry[]
  }

  async creditVoucher(params: CreditVoucherParams): Promise<CreditVoucherResult> {
    if (params.amountKobo <= 0n) {
      throw new Error('Voucher credit amount must be greater than zero')
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Idempotency check
      const existingEntry = await tx.upward_voucher_ledger_entry.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        include: {
          campaign: { select: { id: true, code: true, name: true, type: true } },
          grantedByAdmin: { select: { id: true, email: true } },
          order: { select: { id: true, uuid: true, orderNumber: true } },
        },
      })

      if (existingEntry) {
        const wallet = await tx.upward_voucher_wallet.findUniqueOrThrow({
          where: { id: existingEntry.walletId },
        })
        return {
          wallet: wallet as unknown as VoucherWallet,
          entry: existingEntry as unknown as VoucherLedgerEntry,
          alreadyApplied: true,
        }
      }

      // 2. Ensure wallet exists and lock row for concurrency safety
      await tx.upward_voucher_wallet.upsert({
        where: { userId: params.userId },
        create: { userId: params.userId },
        update: {},
      })

      const lockedRows = await tx.$queryRaw<Array<{ id: number; availableBalanceKobo: bigint }>>`
        SELECT id, "availableBalanceKobo"
        FROM upward_voucher_wallet
        WHERE "userId" = ${params.userId}
        FOR UPDATE
      `
      const locked = lockedRows[0]
      if (!locked) {
        throw new Error(`Failed to lock voucher wallet for user ${params.userId}`)
      }

      // 3. Optional campaign budget enforcement
      if (params.campaignId) {
        const campaign = await tx.upward_voucher_campaign.findUnique({
          where: { id: params.campaignId },
        })
        if (campaign) {
          if (
            campaign.maxBudgetKobo !== null &&
            campaign.maxBudgetKobo !== undefined &&
            campaign.spentKobo + params.amountKobo > campaign.maxBudgetKobo
          ) {
            throw new Error(`Campaign "${campaign.code}" has exhausted its budget`)
          }
          await tx.upward_voucher_campaign.update({
            where: { id: campaign.id },
            data: { spentKobo: { increment: params.amountKobo } },
          })
        }
      }

      // 4. Increment wallet balance atomically
      const updatedWallet = await tx.upward_voucher_wallet.update({
        where: { id: locked.id },
        data: {
          availableBalanceKobo: { increment: params.amountKobo },
          lifetimeEarnedKobo: { increment: params.amountKobo },
          version: { increment: 1 },
        },
      })

      // 5. Append immutable ledger entry
      const entry = await tx.upward_voucher_ledger_entry.create({
        data: {
          walletId: updatedWallet.id,
          userId: params.userId,
          type: params.type,
          amountKobo: params.amountKobo,
          balanceAfterKobo: updatedWallet.availableBalanceKobo,
          idempotencyKey: params.idempotencyKey,
          campaignId: params.campaignId ?? null,
          grantedByAdminId: params.grantedByAdminId ?? null,
          reason: params.reason ?? null,
          metadata: params.metadata ?? undefined,
        },
        include: {
          campaign: { select: { id: true, code: true, name: true, type: true } },
          grantedByAdmin: { select: { id: true, email: true } },
          order: { select: { id: true, uuid: true, orderNumber: true } },
        },
      })

      return {
        wallet: updatedWallet as unknown as VoucherWallet,
        entry: entry as unknown as VoucherLedgerEntry,
        alreadyApplied: false,
      }
    })
  }

  async reserveVoucherForOrder(params: {
    userId: number
    orderId: number
    maxAmountKobo: bigint
    idempotencyKey: string
    reason?: string
  }): Promise<ReserveVoucherResult> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Idempotency check
      const existing = await tx.upward_voucher_ledger_entry.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      })
      if (existing) {
        const wallet = await tx.upward_voucher_wallet.findUniqueOrThrow({
          where: { id: existing.walletId },
        })
        return {
          reservedKobo: existing.amountKobo < 0n ? -existing.amountKobo : existing.amountKobo,
          wallet: wallet as unknown as VoucherWallet,
          entry: existing as unknown as VoucherLedgerEntry,
          alreadyReserved: true,
        }
      }

      // 2. Ensure wallet exists & lock row
      const wallet = await tx.upward_voucher_wallet.findUnique({
        where: { userId: params.userId },
      })
      if (!wallet || wallet.availableBalanceKobo <= 0n || params.maxAmountKobo <= 0n) {
        const fallbackWallet = wallet ?? (await tx.upward_voucher_wallet.create({
          data: { userId: params.userId },
        }))
        return {
          reservedKobo: 0n,
          wallet: fallbackWallet as unknown as VoucherWallet,
          entry: null,
          alreadyReserved: false,
        }
      }

      const lockedRows = await tx.$queryRaw<Array<{ id: number; availableBalanceKobo: bigint }>>`
        SELECT id, "availableBalanceKobo"
        FROM upward_voucher_wallet
        WHERE "userId" = ${params.userId}
        FOR UPDATE
      `
      const locked = lockedRows[0]
      if (!locked || locked.availableBalanceKobo <= 0n) {
        return {
          reservedKobo: 0n,
          wallet: wallet as unknown as VoucherWallet,
          entry: null,
          alreadyReserved: false,
        }
      }

      const reserveKobo =
        locked.availableBalanceKobo >= params.maxAmountKobo
          ? params.maxAmountKobo
          : locked.availableBalanceKobo

      if (reserveKobo <= 0n) {
        return {
          reservedKobo: 0n,
          wallet: wallet as unknown as VoucherWallet,
          entry: null,
          alreadyReserved: false,
        }
      }

      const updatedWallet = await tx.upward_voucher_wallet.update({
        where: { id: locked.id },
        data: {
          availableBalanceKobo: { decrement: reserveKobo },
          reservedBalanceKobo: { increment: reserveKobo },
          version: { increment: 1 },
        },
      })

      const entry = await tx.upward_voucher_ledger_entry.create({
        data: {
          walletId: updatedWallet.id,
          userId: params.userId,
          type: 'RESERVE_ORDER',
          amountKobo: -reserveKobo,
          balanceAfterKobo: updatedWallet.availableBalanceKobo,
          idempotencyKey: params.idempotencyKey,
          orderId: params.orderId,
          reason: params.reason ?? `Voucher reserved for commerce order #${params.orderId}`,
        },
      })

      return {
        reservedKobo: reserveKobo,
        wallet: updatedWallet as unknown as VoucherWallet,
        entry: entry as unknown as VoucherLedgerEntry,
        alreadyReserved: false,
      }
    })
  }

  async redeemReservedVoucherForOrder(
    orderId: number,
  ): Promise<{ redeemedKobo: bigint; alreadyRedeemed: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const redeemKey = `ORDER_REDEEM:${orderId}`
      const existingRedeem = await tx.upward_voucher_ledger_entry.findUnique({
        where: { idempotencyKey: redeemKey },
      })
      if (existingRedeem) {
        return {
          redeemedKobo:
            existingRedeem.amountKobo < 0n ? -existingRedeem.amountKobo : existingRedeem.amountKobo,
          alreadyRedeemed: true,
        }
      }

      const reserveEntry = await tx.upward_voucher_ledger_entry.findFirst({
        where: { orderId, type: 'RESERVE_ORDER' },
      })
      if (!reserveEntry) {
        return { redeemedKobo: 0n, alreadyRedeemed: false }
      }

      const reservedAmountKobo =
        reserveEntry.amountKobo < 0n ? -reserveEntry.amountKobo : reserveEntry.amountKobo

      // Lock wallet row
      const lockedRows = await tx.$queryRaw<Array<{ id: number; reservedBalanceKobo: bigint }>>`
        SELECT id, "reservedBalanceKobo"
        FROM upward_voucher_wallet
        WHERE id = ${reserveEntry.walletId}
        FOR UPDATE
      `
      const locked = lockedRows[0]
      if (!locked) {
        return { redeemedKobo: 0n, alreadyRedeemed: false }
      }

      const actualRedeem =
        locked.reservedBalanceKobo >= reservedAmountKobo
          ? reservedAmountKobo
          : locked.reservedBalanceKobo

      const updatedWallet = await tx.upward_voucher_wallet.update({
        where: { id: locked.id },
        data: {
          reservedBalanceKobo: { decrement: actualRedeem },
          lifetimeRedeemedKobo: { increment: actualRedeem },
          version: { increment: 1 },
        },
      })

      await tx.upward_voucher_ledger_entry.create({
        data: {
          walletId: updatedWallet.id,
          userId: reserveEntry.userId,
          type: 'REDEEM_ORDER',
          amountKobo: -actualRedeem,
          balanceAfterKobo: updatedWallet.availableBalanceKobo,
          idempotencyKey: redeemKey,
          orderId,
          reason: `Voucher redeemed on paid commerce order #${orderId}`,
        },
      })

      return { redeemedKobo: actualRedeem, alreadyRedeemed: false }
    })
  }

  async releaseReservedVoucherForOrder(
    orderId: number,
    reason: string,
  ): Promise<{ releasedKobo: bigint; alreadyReleased: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const releaseKey = `ORDER_RELEASE:${orderId}`
      const existingRelease = await tx.upward_voucher_ledger_entry.findUnique({
        where: { idempotencyKey: releaseKey },
      })
      if (existingRelease) {
        return { releasedKobo: existingRelease.amountKobo, alreadyReleased: true }
      }

      // Do not release if already redeemed on a paid order
      const existingRedeem = await tx.upward_voucher_ledger_entry.findFirst({
        where: { orderId, type: 'REDEEM_ORDER' },
      })
      if (existingRedeem) {
        return { releasedKobo: 0n, alreadyReleased: true }
      }

      const reserveEntry = await tx.upward_voucher_ledger_entry.findFirst({
        where: { orderId, type: 'RESERVE_ORDER' },
      })
      if (!reserveEntry) {
        return { releasedKobo: 0n, alreadyReleased: false }
      }

      const reservedAmountKobo =
        reserveEntry.amountKobo < 0n ? -reserveEntry.amountKobo : reserveEntry.amountKobo

      const lockedRows = await tx.$queryRaw<Array<{ id: number; reservedBalanceKobo: bigint }>>`
        SELECT id, "reservedBalanceKobo"
        FROM upward_voucher_wallet
        WHERE id = ${reserveEntry.walletId}
        FOR UPDATE
      `
      const locked = lockedRows[0]
      if (!locked || locked.reservedBalanceKobo <= 0n) {
        return { releasedKobo: 0n, alreadyReleased: false }
      }

      const actualRelease =
        locked.reservedBalanceKobo >= reservedAmountKobo
          ? reservedAmountKobo
          : locked.reservedBalanceKobo

      const updatedWallet = await tx.upward_voucher_wallet.update({
        where: { id: locked.id },
        data: {
          reservedBalanceKobo: { decrement: actualRelease },
          availableBalanceKobo: { increment: actualRelease },
          version: { increment: 1 },
        },
      })

      await tx.upward_voucher_ledger_entry.create({
        data: {
          walletId: updatedWallet.id,
          userId: reserveEntry.userId,
          type: 'RELEASE_ORDER',
          amountKobo: actualRelease,
          balanceAfterKobo: updatedWallet.availableBalanceKobo,
          idempotencyKey: releaseKey,
          orderId,
          reason: reason.slice(0, 250),
        },
      })

      return { releasedKobo: actualRelease, alreadyReleased: false }
    })
  }
}
