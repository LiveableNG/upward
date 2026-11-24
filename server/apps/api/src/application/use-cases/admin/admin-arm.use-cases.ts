import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetArmPortfolioStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const vaults = await this.prisma.upward_rent_vault.findMany({
      select: {
        id: true,
        currentPrincipalKobo: true,
        accruedYieldKobo: true,
        lockStatus: true,
        userId: true,
      },
    })

    const settlements = await this.prisma.upward_rent_settlement.findMany({
      select: {
        amountPaidToLandlordKobo: true,
        cashbackCreditedKobo: true,
      },
    })

    const kycRecords = await this.prisma.upward_kyc_verification.findMany({
      where: {
        armCustomerMembershipId: { not: null },
      },
      select: { userId: true },
    })

    const activeVaults = vaults.filter(
      (v) => v.lockStatus === 'LOCKED' || v.lockStatus === 'SETTLEMENT_READY',
    )
    const settledVaults = vaults.filter((v) => v.lockStatus === 'SETTLED')

    const totalSubscribedKobo = activeVaults.reduce(
      (sum, v) => sum + v.currentPrincipalKobo,
      0n,
    )
    const totalAccruedYieldKobo = activeVaults.reduce(
      (sum, v) => sum + v.accruedYieldKobo,
      0n,
    )
    const totalRedeemedKobo = settlements.reduce(
      (sum, s) => sum + s.amountPaidToLandlordKobo,
      0n,
    )
    const totalCashbackKobo = settlements.reduce(
      (sum, s) => sum + s.cashbackCreditedKobo,
      0n,
    )

    const uniqueActiveUserIds = new Set(activeVaults.map((v) => v.userId))
    const uniqueArmMembers = new Set(kycRecords.map((k) => k.userId))
    const allEnrolledUsers = new Set([...vaults.map((v) => v.userId), ...uniqueArmMembers])

    return {
      status: 'success',
      data: {
        partnerName: 'Asset & Resource Management Holding Company (ARM)',
        partnerShortName: 'ARM',
        productCode: 'ARMMMF',
        annualYieldRatePct: 16.0,
        dailyRate: 0.16 / 365,
        totalPooledPrincipalNaira: Number(totalSubscribedKobo) / 100,
        totalAccruedYieldNaira: Number(totalAccruedYieldKobo) / 100,
        totalRedeemedNaira: Number(totalRedeemedKobo) / 100,
        totalCashbackPaidNaira: Number(totalCashbackKobo) / 100,
        activeSaversCount: uniqueActiveUserIds.size,
        totalEnrolledCustomersCount: allEnrolledUsers.size,
        activeVaultsCount: activeVaults.length,
        settledVaultsCount: settledVaults.length,
        lastReconciledAt: new Date().toISOString(),
      },
    }
  }
}

@Injectable()
export class GetArmCustomersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute() {
    const vaults = await this.prisma.upward_rent_vault.findMany({
      include: {
        user: {
          include: {
            kycVerifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            rentSavingsScores: true,
            properties: {
              where: { isPastTenancy: false },
              take: 1,
            },
          },
        },
        savingsScore: true,
        settlements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()

    const customers = vaults.map((vault: any) => {
      const u = vault.user
      const kyc = u?.kycVerifications?.[0]
      const latestSettlement = vault.settlements?.[0]
      const score = vault.savingsScore || u?.rentSavingsScores?.[0]

      const daysRemaining = Math.max(
        0,
        Math.ceil((vault.contractualDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      )

      return {
        customerId: u.id,
        userUuid: u.uuid,
        fullName: `${this.encryption.decrypt(u.firstName)} ${this.encryption.decrypt(u.lastName)}`.trim(),
        email: this.encryption.decrypt(u.email),
        phone: u.phone ? this.encryption.decrypt(u.phone) : null,
        gender: u.gender || 'Not Specified',
        isIdentityVerified: u.isIdentityVerified,
        savingsWalletEnabled: u.savingsWalletEnabled,
        // ARM Details
        armCustomerMembershipId: kyc?.armCustomerMembershipId || vault.providerMembershipId || null,
        armCrmAccountNumber: kyc?.armCrmAccountNumber || vault.providerAccountNumber || null,
        armSyncStatus: kyc?.armSyncStatus || vault.providerCrmStatus || (vault.currentPrincipalKobo > 0n ? 'Approved' : 'Pending'),
        armCompletedSections: kyc?.armCompletedSections ?? (u.isIdentityVerified ? 63 : 0),
        b2b2cConsentOnRecord: true,
        // Vault & Balances
        vaultId: vault.id,
        vaultUuid: vault.uuid,
        lockStatus: vault.lockStatus,
        productOption: vault.productOption,
        cadence: vault.cadence,
        targetAmountNaira: Number(vault.targetAmountKobo) / 100,
        currentBalanceNaira: Number(vault.currentPrincipalKobo + vault.accruedYieldKobo) / 100,
        currentPrincipalNaira: Number(vault.currentPrincipalKobo) / 100,
        accruedYieldNaira: Number(vault.accruedYieldKobo) / 100,
        annualYieldRatePct: vault.appliedAnnualRatePct || 16.0,
        contractualDueDate: vault.contractualDueDate.toISOString().split('T')[0],
        unlockDate: vault.unlockDate.toISOString().split('T')[0],
        daysRemaining,
        // Dedicated Inflow Account
        dvaBankName: vault.dvaBankName || 'Providus Bank',
        dvaAccountNumber: vault.dvaAccountNumber || null,
        dvaAccountName: vault.dvaAccountName || null,
        dvaAssignmentStatus: vault.dvaAssignmentStatus,
        // Operations Trackers
        armPurchaseId: vault.armPurchaseId || null,
        armWithdrawalId: vault.armWithdrawalId || latestSettlement?.nipSessionId || null,
        transactionsCount: vault._count.transactions,
        upwardScore: score?.totalScore || 80,
        createdAt: vault.createdAt.toISOString(),
      }
    })

    return {
      status: 'success',
      data: customers,
    }
  }
}

@Injectable()
export class GetArmTransactionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(filters?: {
    type?: string
    search?: string
    vaultUuid?: string
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, Number(filters?.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 50))
    const skip = (page - 1) * limit

    const where: any = {}

    if (filters?.type && filters.type !== 'ALL') {
      where.type = filters.type
    }

    if (filters?.vaultUuid) {
      where.vault = { uuid: filters.vaultUuid }
    }

    const [totalCount, transactions] = await Promise.all([
      this.prisma.upward_rent_vault_transaction.count({ where }),
      this.prisma.upward_rent_vault_transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              uuid: true,
              firstName: true,
              lastName: true,
              email: true,
              kycVerifications: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { armCustomerMembershipId: true },
              },
            },
          },
          vault: {
            select: {
              uuid: true,
              providerMembershipId: true,
              dvaAccountNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    const formatted = transactions.map((tx) => {
      const u = tx.user
      const senderName = `${this.encryption.decrypt(u.firstName)} ${this.encryption.decrypt(u.lastName)}`.trim()
      const senderEmail = this.encryption.decrypt(u.email)
      const membershipId =
        u.kycVerifications?.[0]?.armCustomerMembershipId ||
        tx.vault?.providerMembershipId ||
        'ARM-GT-MEMBER'

      let flowCategory = 'Deposit Inflow'
      if (tx.type === 'DEPOSIT') {
        flowCategory = 'Subscription Inflow (Schedule of Units)'
      } else if (tx.type === 'YIELD_ACCRUAL') {
        flowCategory = 'ARM MMF Daily Compounding Yield'
      } else if (tx.type === 'SETTLEMENT_DISBURSEMENT') {
        flowCategory = 'Redemption Payout to Landlord'
      } else if (tx.type === 'CASHBACK') {
        flowCategory = 'Early-Bird Incentive Cashback'
      } else if (tx.type === 'LIQUIDATION_PENALTY' || tx.type === 'BREAKOUT_PAYOUT') {
        flowCategory = 'Early Liquidation / Fair Exit'
      }

      return {
        id: tx.id,
        uuid: tx.uuid,
        reference: tx.reference,
        type: tx.type,
        flowCategory,
        amountNaira: Number(tx.amountKobo) / 100,
        principalDeltaNaira: Number(tx.principalDeltaKobo) / 100,
        yieldDeltaNaira: Number(tx.yieldDeltaKobo) / 100,
        balanceAfterNaira: Number(tx.balanceAfterKobo) / 100,
        channel: tx.channel || 'DVA_NIP',
        narration: tx.narration,
        customerName: senderName,
        customerEmail: senderEmail,
        armMembershipId: membershipId,
        vaultUuid: tx.vault?.uuid,
        dvaAccountNumber: tx.vault?.dvaAccountNumber,
        createdAt: tx.createdAt.toISOString(),
      }
    })

    // Search filter in-memory for decrypted names/emails/references if requested
    let resultItems = formatted
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      resultItems = formatted.filter(
        (t) =>
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.narration?.toLowerCase().includes(q) ||
          t.armMembershipId.toLowerCase().includes(q),
      )
    }

    return {
      status: 'success',
      data: {
        items: resultItems,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    }
  }
}
