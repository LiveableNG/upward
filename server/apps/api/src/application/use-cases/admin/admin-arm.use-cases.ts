import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  StreamableFile,
} from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { ArmMerchantOverview } from '../../../domains/rent-savings/asset-management.provider'
import { ARM_JOB_QUEUE, ArmJobType, IArmJobQueue } from '../../../domains/rent-savings/arm-job.interface'
import {
  GetSavingsConsentDocumentUseCase,
  GetSavingsKycDocumentUseCase,
} from '../rent-savings/get-savings-consent-document.use-case'

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

    const [vaults, settlements, kycRecords, jobCountsRaw] = await Promise.all([
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
      this.prisma.upward_arm_job
        .groupBy({
          by: ['status'],
          _count: { id: true },
        })
        .catch(() => []),
    ])

    const jobQueueSummary = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }
    for (const row of jobCountsRaw as Array<{ status: string; _count: { id: number } }>) {
      if (row.status === 'QUEUED') jobQueueSummary.queued = row._count.id
      if (row.status === 'PROCESSING') jobQueueSummary.processing = row._count.id
      if (row.status === 'COMPLETED') jobQueueSummary.completed = row._count.id
      if (row.status === 'FAILED') jobQueueSummary.failed = row._count.id
    }

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
    const liveDailyRate = liveYield?.isLive
      ? liveYield.dailyYieldRate
      : Math.pow(1 + 0.16, 1 / 365) - 1
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
        jobQueueSummary,
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
            savingsConsents: {
              orderBy: { acceptedAt: 'desc' },
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
        const latestConsent = u?.savingsConsents?.[0] || null
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

        const residentialAddress =
          [
            kyc?.residentialAddressNumber,
            kyc?.residentialStreet,
            kyc?.residentialTown,
            kyc?.residentialState,
          ]
            .filter(Boolean)
            .join(', ') ||
          kyc?.nextOfKinAddress ||
          null

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
          // Real Persisted B2B2C Consent Audit
          b2b2cConsentOnRecord: Boolean(latestConsent),
          consentUuid: latestConsent?.uuid || null,
          consentAcceptedAt: latestConsent?.acceptedAt?.toISOString() || null,
          consentTermsVersion: latestConsent?.termsVersion || null,
          consentDocVersion: latestConsent?.consentDocVersion || null,
          consentIpAddress: latestConsent?.ipAddress || null,
          hasConsentDocument: Boolean(latestConsent),
          // KYC & Proof of Address Details
          maskedBvn: kyc?.idNumberMasked || null,
          maskedNin: kyc?.ninMasked || null,
          meansOfIdType: kyc?.meansOfIdType || null,
          meansOfIdNumberMasked: kyc?.meansOfIdNumberMasked || null,
          meansOfIdFileName: kyc?.meansOfIdFileName || null,
          hasIdDocument: Boolean(kyc?.meansOfIdDocKey),
          residentialAddress,
          utilityBillFileName: kyc?.utilityBillFileName || null,
          hasUtilityBillDocument: Boolean(kyc?.utilityBillDocKey),
          addressVerificationStatus: kyc?.addressVerificationStatus || (kyc?.utilityBillDocKey ? 'SUBMITTED' : 'MISSING'),
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
        b2b2cConsentOnRecord: false,
        consentUuid: null,
        consentAcceptedAt: null,
        consentTermsVersion: null,
        consentDocVersion: null,
        consentIpAddress: null,
        hasConsentDocument: false,
        maskedBvn: null,
        maskedNin: null,
        meansOfIdType: null,
        meansOfIdNumberMasked: null,
        meansOfIdFileName: null,
        hasIdDocument: false,
        residentialAddress: null,
        utilityBillFileName: null,
        hasUtilityBillDocument: false,
        addressVerificationStatus: 'ARM_SANDBOX_ONLY',
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
              providerAccountNumber: true,
              dvaAccountNumber: true,
              dvaBankName: true,
              armPurchaseId: true,
              armWithdrawalId: true,
            },
          },
          armJobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              uuid: true,
              status: true,
              jobType: true,
              armInstructionId: true,
              armTransactionId: true,
              attempts: true,
              maxAttempts: true,
              lastError: true,
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
      const isNumeric = (v?: string | null) => Boolean(v && /^\d+$/.test(v.trim()))
      const membershipId =
        (isNumeric(meta.armMembershipId) ? String(meta.armMembershipId) : null) ||
        (isNumeric(tx.vault?.providerMembershipId) ? tx.vault?.providerMembershipId : null) ||
        (isNumeric(u.kycVerifications?.[0]?.armCustomerMembershipId)
          ? u.kycVerifications?.[0]?.armCustomerMembershipId
          : null) ||
        omnibusMembershipId
      const armAccountNumber =
        (typeof meta.armAccountNumber === 'string' ? meta.armAccountNumber : null) ||
        tx.vault?.providerAccountNumber ||
        `${membershipId}-ARMMMF-01`
      const linkedJob = (tx as any).armJobs?.[0] || null

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
      const armTransactionId = meta.armTransactionId || linkedJob?.armTransactionId || null
      const armInstructionId =
        armPurchaseId || armWithdrawalId || linkedJob?.armInstructionId || null
      const armLiveStatus =
        (armPurchaseId && liveArmStatusMap.get(String(armPurchaseId))) ||
        (armTransactionId && liveArmStatusMap.get(String(armTransactionId))) ||
        (meta.armSyncStatus ? String(meta.armSyncStatus) : null) ||
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
        armAccountNumber,
        armPurchaseId,
        armWithdrawalId,
        armTransactionId,
        armInstructionId,
        armLiveStatus,
        armSyncStatus: meta.armSyncStatus || linkedJob?.status || null,
        linkedJob,
        metadata: meta,
        vaultUuid: tx.vault?.uuid,
        dvaBankName: tx.vault?.dvaBankName || null,
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

@Injectable()
export class GetArmJobsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private safeDecrypt(val?: string | null): string {
    if (!val) return ''
    try {
      return this.encryption.decrypt(val)
    } catch {
      return val
    }
  }

  async execute(filters?: {
    status?: string
    jobType?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, Number(filters?.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 50))
    const skip = (page - 1) * limit

    const where: any = {}
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }
    if (filters?.jobType && filters.jobType !== 'ALL') {
      where.jobType = filters.jobType
    }

    const [totalCount, jobs, grouped, groupedTypes] = await Promise.all([
      this.prisma.upward_arm_job.count({ where }),
      this.prisma.upward_arm_job.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              uuid: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          vault: {
            select: {
              uuid: true,
              dvaAccountNumber: true,
              providerMembershipId: true,
              providerAccountNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.upward_arm_job.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.upward_arm_job.groupBy({
        by: ['jobType'],
        _count: { id: true },
      }),
    ])

    const summary = { queued: 0, processing: 0, completed: 0, failed: 0 }
    for (const row of grouped) {
      if (row.status === 'QUEUED') summary.queued = row._count.id
      if (row.status === 'PROCESSING') summary.processing = row._count.id
      if (row.status === 'COMPLETED') summary.completed = row._count.id
      if (row.status === 'FAILED') summary.failed = row._count.id
    }

    const typeSummary = { subscribe: 0, redeem: 0, onboard: 0 }
    for (const row of groupedTypes) {
      if (row.jobType === 'SUBSCRIBE') typeSummary.subscribe = row._count.id
      if (row.jobType === 'REDEEM') typeSummary.redeem = row._count.id
      if (row.jobType === 'ONBOARD') typeSummary.onboard = row._count.id
    }

    let items = jobs.map((job) => {
      const fullName = job.user
        ? `${this.safeDecrypt(job.user.firstName)} ${this.safeDecrypt(job.user.lastName)}`.trim()
        : 'System / Omnibus'
      const email = job.user ? this.safeDecrypt(job.user.email) : ''
      const jobResult = (job.result as Record<string, any>) || null
      const jobPayload = (job.payload as Record<string, any>) || null
      const isNumeric = (v?: string | null) => Boolean(v && /^\d+$/.test(String(v).trim()))
      const armMembershipId =
        (isNumeric(jobResult?.membershipId) ? String(jobResult.membershipId) : null) ||
        (isNumeric(job.vault?.providerMembershipId) ? job.vault?.providerMembershipId : null) ||
        (isNumeric(jobPayload?.membershipId) ? String(jobPayload.membershipId) : null) ||
        '3005679'
      const armAccountNumber =
        jobResult?.accountNumber ||
        job.vault?.providerAccountNumber ||
        `${armMembershipId}-ARMMMF-01`

      return {
        id: job.id,
        uuid: job.uuid,
        idempotencyKey: job.idempotencyKey,
        jobType: job.jobType,
        status: job.status,
        reference: job.reference,
        amountNaira: job.amountKobo ? Number(job.amountKobo) / 100 : 0,
        armMembershipId,
        armAccountNumber,
        armTransactionId: job.armTransactionId,
        armInstructionId: job.armInstructionId,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lastError: job.lastError,
        payload: jobPayload,
        result: jobResult,
        customerName: fullName,
        customerEmail: email,
        vaultUuid: job.vault?.uuid || null,
        dvaAccountNumber: job.vault?.dvaAccountNumber || null,
        canRetry: job.status === 'FAILED' && !job.armInstructionId,
        notifiedUserAt: job.notifiedUserAt?.toISOString() || null,
        notifiedAdminAt: job.notifiedAdminAt?.toISOString() || null,
        lockedAt: job.lockedAt?.toISOString() || null,
        completedAt: job.completedAt?.toISOString() || null,
        failedAt: job.failedAt?.toISOString() || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      }
    })

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      items = items.filter(
        (j) =>
          j.reference.toLowerCase().includes(q) ||
          j.idempotencyKey.toLowerCase().includes(q) ||
          j.customerName.toLowerCase().includes(q) ||
          j.customerEmail.toLowerCase().includes(q) ||
          j.armMembershipId.toLowerCase().includes(q) ||
          j.armTransactionId.toLowerCase().includes(q) ||
          (j.armInstructionId && j.armInstructionId.toLowerCase().includes(q)) ||
          (j.lastError && j.lastError.toLowerCase().includes(q)),
      )
    }

    return {
      status: 'success',
      data: {
        summary,
        typeSummary,
        items,
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

@Injectable()
export class RetryArmJobUseCase {
  private readonly logger = new Logger(RetryArmJobUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ARM_JOB_QUEUE)
    private readonly armJobQueue?: IArmJobQueue,
  ) {}

  async execute(jobIdOrUuid: string) {
    const isNumeric = /^\d+$/.test(jobIdOrUuid)
    const job = await this.prisma.upward_arm_job.findFirst({
      where: isNumeric ? { id: parseInt(jobIdOrUuid, 10) } : { uuid: jobIdOrUuid },
    })

    if (!job) {
      throw new NotFoundException('ARM background job not found.')
    }

    if (job.armInstructionId || job.status === 'COMPLETED') {
      throw new BadRequestException(
        'This job already completed with an ARM instruction ID and cannot be retried.',
      )
    }

    if (job.status !== 'FAILED') {
      throw new BadRequestException(
        `Only FAILED jobs can be retried (current status: ${job.status}).`,
      )
    }

    // Atomic state reset guarded by status='FAILED' AND armInstructionId IS NULL
    const nextMaxAttempts = Math.max(job.maxAttempts, job.attempts + 3)
    const updated = await this.prisma.upward_arm_job.updateMany({
      where: {
        id: job.id,
        status: 'FAILED',
        armInstructionId: null,
      },
      data: {
        status: 'QUEUED',
        failedAt: null,
        lockedAt: null,
        notifiedAdminAt: null,
        maxAttempts: nextMaxAttempts,
      },
    })

    if (updated.count === 0) {
      throw new BadRequestException('Job state changed concurrently; retry aborted safely.')
    }

    let enqueued = false
    if (this.armJobQueue) {
      enqueued = await this.armJobQueue.enqueueJob(
        {
          id: job.id,
          uuid: job.uuid,
          idempotencyKey: job.idempotencyKey,
          jobType: job.jobType as ArmJobType,
        },
        { allowReplaceFailed: true },
      )
    }

    this.logger.log(
      `Admin triggered safe retry for ARM job ${job.uuid} (${job.idempotencyKey}), enqueued=${enqueued}`,
    )

    return {
      status: 'success',
      message: 'ARM background job re-queued safely (ARM transaction status will be verified first before re-submission).',
      data: {
        uuid: job.uuid,
        status: 'QUEUED',
        enqueued,
      },
    }
  }
}

@Injectable()
export class GetArmTransactionLiveStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AssetManagementProviderRegistry,
  ) {}

  async execute(transactionUuid: string) {
    const tx = await this.prisma.upward_rent_vault_transaction.findUnique({
      where: { uuid: transactionUuid },
      include: {
        vault: {
          select: {
            armPurchaseId: true,
            armWithdrawalId: true,
            providerMembershipId: true,
          },
        },
        armJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            armTransactionId: true,
            armInstructionId: true,
            status: true,
          },
        },
      },
    })

    if (!tx) {
      throw new NotFoundException('Vault transaction not found.')
    }

    const meta = (tx.metadata as Record<string, any>) || {}
    const purchaseId = meta.armPurchaseId ? String(meta.armPurchaseId) : undefined
    const transactionId =
      (meta.armTransactionId ? String(meta.armTransactionId) : undefined) ||
      tx.armJobs?.[0]?.armTransactionId ||
      undefined

    const provider = this.providerRegistry.getProvider('ARM')
    const liveItems =
      provider.getTransactionStatus && (purchaseId || transactionId)
        ? await provider.getTransactionStatus({ purchaseId, transactionId }).catch(() => [])
        : []

    return {
      status: 'success',
      data: {
        transactionUuid: tx.uuid,
        reference: tx.reference,
        purchaseId: purchaseId || null,
        withdrawalId: meta.armWithdrawalId ? String(meta.armWithdrawalId) : null,
        armTransactionId: transactionId || null,
        liveItems,
        checkedAt: new Date().toISOString(),
      },
    }
  }
}

@Injectable()
export class GetAdminArmCustomerDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getConsentDocUseCase: GetSavingsConsentDocumentUseCase,
    private readonly getKycDocUseCase: GetSavingsKycDocumentUseCase,
  ) {}

  async execute(
    userUuid: string,
    docType: 'consent' | 'id_card' | 'utility_bill',
    res: any,
  ): Promise<StreamableFile> {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    })
    if (!user) {
      throw new NotFoundException('Customer not found.')
    }

    if (docType === 'consent') {
      return this.getConsentDocUseCase.execute(user.id, res)
    }

    return this.getKycDocUseCase.execute(user.id, docType, res)
  }
}
