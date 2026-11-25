import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { ArmMerchantOverview } from '../../../domains/rent-savings/asset-management.provider'

@Injectable()
export class GetArmPortfolioStatsUseCase {
  private readonly logger = new Logger(GetArmPortfolioStatsUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AssetManagementProviderRegistry,
  ) {}

  async execute(forceRefresh = false) {
    const provider = this.providerRegistry.getProvider('ARM')
    let armOverview: ArmMerchantOverview | null = null
    if (provider.getMerchantOverview) {
      try {
        armOverview = await provider.getMerchantOverview(forceRefresh)
      } catch (err: any) {
        this.logger.warn(`Could not fetch live ARM merchant overview: ${err?.message}`)
      }
    }

    const [vaults, settlements, kycRecords] = await Promise.all([
      this.prisma.upward_rent_vault.findMany({
        select: {
          id: true,
          currentPrincipalKobo: true,
          accruedYieldKobo: true,
          lockStatus: true,
          userId: true,
        },
      }),
      this.prisma.upward_rent_settlement.findMany({
        select: {
          amountPaidToLandlordKobo: true,
          cashbackCreditedKobo: true,
        },
      }),
      this.prisma.upward_kyc_verification.findMany({
        where: {
          armCustomerMembershipId: { not: null },
        },
        select: { userId: true },
      }),
    ])

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

    const liveYield = armOverview?.yieldMetrics
    const liveRatePct = liveYield?.isLive
      ? Math.round(liveYield.annualNetYieldRate * 10000) / 100
      : 16.0
    const liveDailyRate = liveYield?.isLive ? liveYield.dailyYieldRate : 0.16 / 365
    const armLiveCustomersCount = (armOverview?.customers || []).filter(
      (c) => c.status !== 'Failed',
    ).length

    return {
      status: 'success',
      data: {
        partnerName: 'Asset & Resource Management Holding Company (ARM)',
        partnerShortName: 'ARM',
        productCode: liveYield?.productCode || 'ARMMMF',
        productName: liveYield?.productName || 'ARM Money Market Fund',
        annualYieldRatePct: 16.0,
        liveFundYieldRatePct: liveRatePct,
        dailyRate: liveDailyRate,
        netAssetValue: liveYield?.netAssetValue || null,
        valuationDate: liveYield?.valuationDate || null,
        rateUpdatedAtUtc: liveYield?.rateUpdatedAtUtc || null,
        factSheetLink: liveYield?.factSheetLink || null,
        totalPooledPrincipalNaira: Number(totalSubscribedKobo) / 100,
        totalAccruedYieldNaira: Number(totalAccruedYieldKobo) / 100,
        totalRedeemedNaira: Number(totalRedeemedKobo) / 100,
        totalCashbackPaidNaira: Number(totalCashbackKobo) / 100,
        activeSaversCount: uniqueActiveUserIds.size,
        totalEnrolledCustomersCount: allEnrolledUsers.size + armLiveCustomersCount,
        activeVaultsCount: activeVaults.length,
        settledVaultsCount: settledVaults.length,
        lastReconciledAt: armOverview?.fetchedAt || new Date().toISOString(),
        armSandbox: {
          connected: Boolean(armOverview?.connected),
          baseUrl: armOverview?.baseUrl || 'https://sandapi.arm.com.ng',
          merchantId: armOverview?.merchantId || null,
          businessName: armOverview?.businessName || 'GoodTenant',
          merchantMembershipId: armOverview?.merchantMembershipId || null,
          merchantType: armOverview?.merchantType || 'B2B2C',
          cashWalletBalanceNaira: armOverview?.cashWalletBalanceNaira ?? 0,
          virtualAccounts: armOverview?.virtualAccounts || [],
          onboardedCustomersCount: armOverview?.customers?.length ?? 0,
          masterPortfolioUnits: armOverview?.masterPortfolio?.units ?? 0,
          masterPortfolioMarketValueNaira:
            Number(armOverview?.masterPortfolio?.marketValueKobo ?? 0n) / 100,
        },
      },
    }
  }
}

@Injectable()
export class GetArmCustomersUseCase {
  private readonly logger = new Logger(GetArmCustomersUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly providerRegistry: AssetManagementProviderRegistry,
  ) {}

  async execute(forceRefresh = false) {
    const provider = this.providerRegistry.getProvider('ARM')
    let armOverview: ArmMerchantOverview | null = null
    if (provider.getMerchantOverview) {
      try {
        armOverview = await provider.getMerchantOverview(forceRefresh)
      } catch (err: any) {
        this.logger.warn(`Could not fetch live ARM customers list: ${err?.message}`)
      }
    }

    const liveByEmail = new Map<string, ArmMerchantOverview['customers'][number]>()
    for (const c of armOverview?.customers || []) {
      if (c.customerEmail) {
        liveByEmail.set(c.customerEmail.trim().toLowerCase(), c)
      }
    }

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
    const matchedArmEmails = new Set<string>()
    const omnibusMembershipId = armOverview?.merchantMembershipId || '3005679'

    const localCustomers = await Promise.all(
      vaults.map(async (vault: any) => {
        const u = vault.user
        const kyc = u?.kycVerifications?.[0]
        const latestSettlement = vault.settlements?.[0]
        const score = vault.savingsScore || u?.rentSavingsScores?.[0]

        const email = this.encryption.decrypt(u.email)
        const liveCustomer = liveByEmail.get(email.trim().toLowerCase())
        if (liveCustomer) {
          matchedArmEmails.add(email.trim().toLowerCase())
        }

        // Reconcile newly assigned ARM membershipId / CRM account number back into local DB
        if (
          liveCustomer?.customerMembershipId &&
          kyc &&
          kyc.armCustomerMembershipId !== liveCustomer.customerMembershipId
        ) {
          await Promise.all([
            this.prisma.upward_kyc_verification.update({
              where: { id: kyc.id },
              data: {
                armCustomerMembershipId: liveCustomer.customerMembershipId,
                armCrmAccountNumber: liveCustomer.crmAccountNumber || kyc.armCrmAccountNumber,
                armSyncStatus: liveCustomer.status || kyc.armSyncStatus,
              },
            }),
            this.prisma.upward_rent_vault.update({
              where: { id: vault.id },
              data: {
                providerMembershipId: liveCustomer.customerMembershipId,
                providerAccountNumber:
                  liveCustomer.crmAccountNumber || vault.providerAccountNumber,
                providerCrmStatus: liveCustomer.status || vault.providerCrmStatus,
              },
            }),
          ]).catch(() => {})
        }

        const daysRemaining = Math.max(
          0,
          Math.ceil((vault.contractualDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        )

        const resolvedMembershipId =
          liveCustomer?.customerMembershipId ||
          kyc?.armCustomerMembershipId ||
          vault.providerMembershipId ||
          omnibusMembershipId

        const resolvedCrm =
          liveCustomer?.crmAccountNumber ||
          kyc?.armCrmAccountNumber ||
          vault.providerAccountNumber ||
          `${resolvedMembershipId}-ARMMMF-01`

        const resolvedSyncStatus =
          liveCustomer?.status ||
          kyc?.armSyncStatus ||
          vault.providerCrmStatus ||
          (vault.currentPrincipalKobo > 0n ? 'Submitted' : 'Pending')

        return {
          customerId: u.id,
          userUuid: u.uuid,
          source: 'UPWARD_VAULT' as const,
          fullName: `${this.encryption.decrypt(u.firstName)} ${this.encryption.decrypt(u.lastName)}`.trim(),
          email,
          phone: u.phone ? this.encryption.decrypt(u.phone) : null,
          gender: u.gender || 'Not Specified',
          isIdentityVerified: u.isIdentityVerified,
          savingsWalletEnabled: u.savingsWalletEnabled,
          // ARM Details
          armTrackingId: liveCustomer?.customerId || null,
          armCustomerMembershipId: resolvedMembershipId,
          armCrmAccountNumber: resolvedCrm,
          armSyncStatus: resolvedSyncStatus,
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
          dvaBankName: vault.dvaBankName || 'Wema Bank',
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
      }),
    )

    // Append live ARM-provisioned B2B2C customers from sandbox not yet paired with a local vault
    const armDirectCustomers = (armOverview?.customers || [])
      .filter(
        (c) =>
          c.customerEmail &&
          !matchedArmEmails.has(c.customerEmail.trim().toLowerCase()) &&
          c.status !== 'Failed',
      )
      .map((c, idx) => ({
        customerId: -(idx + 1),
        userUuid: `arm-sandbox-${c.customerId}`,
        source: 'ARM_SANDBOX' as const,
        fullName: `${c.customerFirstName} ${c.customerSurname}`.trim(),
        email: c.customerEmail,
        phone: null,
        gender: 'Not Specified',
        isIdentityVerified: true,
        savingsWalletEnabled: true,
        armTrackingId: c.customerId,
        armCustomerMembershipId: c.customerMembershipId,
        armCrmAccountNumber:
          c.crmAccountNumber ||
          (c.customerMembershipId ? `${c.customerMembershipId}-ARMMMF-01` : null),
        armSyncStatus: c.status,
        armCompletedSections: 63,
        b2b2cConsentOnRecord: true,
        vaultId: -(idx + 1),
        vaultUuid: `arm-vault-${c.customerId}`,
        lockStatus: 'ARM_PROVISIONED',
        productOption: 'SAVE_AND_EARN',
        cadence: 'MONTHLY',
        targetAmountNaira: 0,
        currentBalanceNaira: 0,
        currentPrincipalNaira: 0,
        accruedYieldNaira: 0,
        annualYieldRatePct: 16.0,
        contractualDueDate: c.createdAt.split('T')[0],
        unlockDate: c.createdAt.split('T')[0],
        daysRemaining: 0,
        dvaBankName: armOverview?.virtualAccounts?.[0]?.bankName || 'ARM Microfinance Bank',
        dvaAccountNumber: armOverview?.virtualAccounts?.[0]?.accountNumber || null,
        dvaAccountName: armOverview?.virtualAccounts?.[0]?.customerName || 'GoodTenant',
        dvaAssignmentStatus: 'ACTIVE',
        armPurchaseId: null,
        armWithdrawalId: null,
        transactionsCount: 0,
        upwardScore: 100,
        createdAt: c.createdAt,
      }))

    return {
      status: 'success',
      data: [...localCustomers, ...armDirectCustomers],
    }
  }
}

@Injectable()
export class GetArmTransactionsUseCase {
  private readonly logger = new Logger(GetArmTransactionsUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly providerRegistry: AssetManagementProviderRegistry,
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

    const provider = this.providerRegistry.getProvider('ARM')
    let omnibusMembershipId = '3005679'
    if (provider.getMerchantOverview) {
      try {
        const ov = await provider.getMerchantOverview(false)
        if (ov.merchantMembershipId) omnibusMembershipId = ov.merchantMembershipId
      } catch {
        // Use fallback omnibus ID
      }
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
              armPurchaseId: true,
              armWithdrawalId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    // Query live ARM transaction status for the top 8 purchase-linked transactions
    const liveArmStatusMap = new Map<string, string>()
    if (provider.getTransactionStatus) {
      const lookupCandidates = transactions
        .filter((tx) => {
          const meta = (tx.metadata as Record<string, any>) || {}
          return Boolean(meta.armPurchaseId || meta.armTransactionId)
        })
        .slice(0, 8)

      await Promise.all(
        lookupCandidates.map(async (tx) => {
          const meta = (tx.metadata as Record<string, any>) || {}
          const pId = meta.armPurchaseId ? String(meta.armPurchaseId) : undefined
          const tId = meta.armTransactionId ? String(meta.armTransactionId) : undefined
          const key = pId || tId
          if (!key) return
          try {
            const items = await provider.getTransactionStatus!({
              purchaseId: pId,
              transactionId: tId,
            })
            const first = items[0]
            if (first) {
              liveArmStatusMap.set(
                key,
                first.status ? 'Settled' : first.message || 'QueuePublication',
              )
            }
          } catch {
            // Non-blocking status enrichment
          }
        }),
      )
    }

    const formatted = transactions.map((tx) => {
      const u = tx.user
      const meta = (tx.metadata as Record<string, any>) || {}
      const senderName = `${this.encryption.decrypt(u.firstName)} ${this.encryption.decrypt(u.lastName)}`.trim()
      const senderEmail = this.encryption.decrypt(u.email)
      const membershipId =
        u.kycVerifications?.[0]?.armCustomerMembershipId ||
        tx.vault?.providerMembershipId ||
        omnibusMembershipId

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

      const armPurchaseId =
        meta.armPurchaseId || (tx.type === 'DEPOSIT' ? tx.vault?.armPurchaseId : null) || null
      const armWithdrawalId =
        meta.armWithdrawalId ||
        (tx.type === 'SETTLEMENT_DISBURSEMENT' || tx.type === 'LIQUIDATION_PENALTY'
          ? tx.vault?.armWithdrawalId
          : null) ||
        null
      const armTransactionId = meta.armTransactionId || null
      const armInstructionId = armPurchaseId || armWithdrawalId || null
      const armLiveStatus =
        (armPurchaseId && liveArmStatusMap.get(String(armPurchaseId))) ||
        (armTransactionId && liveArmStatusMap.get(String(armTransactionId))) ||
        (armInstructionId ? 'Submitted' : null)

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
        armPurchaseId,
        armWithdrawalId,
        armTransactionId,
        armInstructionId,
        armLiveStatus,
        vaultUuid: tx.vault?.uuid,
        dvaAccountNumber: tx.vault?.dvaAccountNumber,
        createdAt: tx.createdAt.toISOString(),
      }
    })

    let resultItems = formatted
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      resultItems = formatted.filter(
        (t) =>
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.narration?.toLowerCase().includes(q) ||
          t.armMembershipId.toLowerCase().includes(q) ||
          (t.armInstructionId && t.armInstructionId.toLowerCase().includes(q)),
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
