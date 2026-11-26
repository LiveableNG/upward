import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

export interface AdminInsuranceLedgerFilter {
  source?: string
  status?: string
  search?: string
}

@Injectable()
export class GetAdminInsuranceLedgerUseCase {
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

  async execute(filter?: AdminInsuranceLedgerFilter) {
    const [enrolments, rentProtecVaults, recoveryJournal] = await Promise.all([
      this.prisma.upward_insurance_enrolment.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { uuid: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.upward_rent_vault.findMany({
        where: { productOption: 'RENT_PROTEC' },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { uuid: true, firstName: true, lastName: true, email: true },
          },
          treasurySummary: true,
        },
      }),
      this.prisma.upward_savings_internal_ledger.findMany({
        where: { productOption: 'RENT_PROTEC' },
        orderBy: { entryDate: 'desc' },
        take: 40,
        include: {
          vault: {
            select: {
              uuid: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
    ])

    const standaloneRows = enrolments.map((e) => {
      const email = this.decryptSafe(e.user?.email)
      const decryptedFirst = this.decryptSafe(e.user?.firstName)
      const decryptedLast = this.decryptSafe(e.user?.lastName)
      const fallbackUserName = `${decryptedFirst} ${decryptedLast}`.trim()
      const decryptedFullName = this.decryptSafe(e.fullName)
      return {
        policyUuid: e.uuid,
        source: 'STANDALONE' as const,
        policyholderName: decryptedFullName || fallbackUserName || 'Tenant',
        policyholderEmail: email,
        userUuid: e.user?.uuid || '',
        annualRentNgn: Number(e.annualRent || 0),
        sumAssuredNgn: Number(e.sumAssured || e.annualRent || 0),
        premiumRatePct: Number(e.premiumRatePct || 2.0),
        premiumAmountNgn: Number(e.premiumAmount || 0),
        premiumRecoveredNgn: Number(e.premiumAmount || 0),
        unrecoveredPremiumNgn: 0,
        status: e.status || 'PENDING',
        paymentReference: e.paymentReference || null,
        landlordName: e.landlordName || null,
        propertyAddress: e.propertyAddress || e.address || null,
        occupation: e.occupation || null,
        employmentType: e.employmentType || null,
        coverageDate: e.rentStartDate || null,
        fundingProgressPct: 100,
        activationThresholdPct: 100,
        createdAt: e.createdAt.toISOString(),
      }
    })

    const rentProtecRows = rentProtecVaults.map((v) => {
      const email = this.decryptSafe(v.user?.email)
      const firstName = this.decryptSafe(v.user?.firstName)
      const lastName = this.decryptSafe(v.user?.lastName)
      const targetNgn = Number(v.targetAmountKobo) / 100
      const principalNgn = Number(v.currentPrincipalKobo) / 100
      const termDays = Math.max(
        1,
        Math.ceil(
          (v.contractualDueDate.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
      const activationThresholdPct =
        RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(termDays)
      const activationThresholdKobo =
        RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
          v.targetAmountKobo,
          termDays,
        )
      const fundingProgressPct =
        targetNgn > 0 ? Math.min(100, Number(((principalNgn / targetNgn) * 100).toFixed(1))) : 0

      const premiumRatePct = v.insurancePremiumPct > 0 ? v.insurancePremiumPct : 2.0
      const summary = v.treasurySummary
      const isCoverageActivated =
        (summary && summary.upfrontPremiumObligationKobo > 0n) ||
        v.currentPrincipalKobo >= activationThresholdKobo

      const upfrontPremiumNgn = isCoverageActivated
        ? summary && summary.upfrontPremiumObligationKobo > 0n
          ? Number(summary.upfrontPremiumObligationKobo) / 100
          : Number(((targetNgn * premiumRatePct) / 100).toFixed(2))
        : 0
      const recoveredNgn =
        isCoverageActivated && summary ? Number(summary.premiumRecoveredKobo) / 100 : 0
      const unrecoveredNgn = isCoverageActivated
        ? summary && summary.upfrontPremiumObligationKobo > 0n
          ? Number(summary.unrecoveredPremiumKobo) / 100
          : Math.max(0, upfrontPremiumNgn - recoveredNgn)
        : 0

      const mappedStatus =
        v.lockStatus === 'BROKEN_OUT'
          ? 'CANCELLED_EARLY_EXIT'
          : v.lockStatus === 'SETTLED'
            ? 'MATURED'
            : isCoverageActivated
              ? 'ACTIVE'
              : 'PENDING_ACTIVATION'

      return {
        policyUuid: v.uuid,
        source: 'RENT_PROTEC' as const,
        policyholderName: `${firstName} ${lastName}`.trim() || 'Tenant',
        policyholderEmail: email,
        userUuid: v.user?.uuid || '',
        annualRentNgn: targetNgn,
        sumAssuredNgn: targetNgn,
        premiumRatePct,
        premiumAmountNgn: upfrontPremiumNgn,
        premiumRecoveredNgn: recoveredNgn,
        unrecoveredPremiumNgn: unrecoveredNgn,
        status: mappedStatus,
        fundingProgressPct,
        activationThresholdPct,
        paymentReference: v.providerMembershipId || null,
        landlordName: null,
        propertyAddress: null,
        occupation: null,
        employmentType: null,
        coverageDate: v.contractualDueDate.toISOString().split('T')[0],
        createdAt: v.createdAt.toISOString(),
      }
    })

    const allRows = [...standaloneRows, ...rentProtecRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    const sourceFilter = (filter?.source || 'ALL').toUpperCase()
    const statusFilter = (filter?.status || 'ALL').toUpperCase()
    const q = (filter?.search || '').trim().toLowerCase()

    const filtered = allRows.filter((row) => {
      if (sourceFilter !== 'ALL' && row.source !== sourceFilter) return false
      if (statusFilter !== 'ALL' && row.status.toUpperCase() !== statusFilter) return false
      if (q) {
        const hay = `${row.policyholderName} ${row.policyholderEmail} ${row.policyUuid} ${row.landlordName || ''} ${row.paymentReference || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const activeOrPaidStandalone = standaloneRows.filter(
      (r) => r.status === 'ACTIVE' || r.status === 'PAID',
    )
    const activeRentProtec = rentProtecRows.filter(
      (r) => r.status === 'ACTIVE' || r.status === 'MATURED',
    )

    const totalSumAssuredNgn = [...activeOrPaidStandalone, ...activeRentProtec].reduce(
      (acc, r) => acc + r.sumAssuredNgn,
      0,
    )
    const standalonePremiumCollectedNgn = activeOrPaidStandalone.reduce(
      (acc, r) => acc + r.premiumAmountNgn,
      0,
    )
    const rentProtecPremiumPayableNgn = activeRentProtec.reduce(
      (acc, r) => acc + r.premiumAmountNgn,
      0,
    )
    const rentProtecPremiumRecoveredNgn = rentProtecRows.reduce(
      (acc, r) => acc + r.premiumRecoveredNgn,
      0,
    )
    const rentProtecUnrecoveredPremiumNgn = rentProtecRows.reduce(
      (acc, r) => acc + r.unrecoveredPremiumNgn,
      0,
    )

    return {
      success: true,
      data: {
        isSandbox: !isProductionRuntime(process.env.PAYSTACK_SECRET_KEY),
        summary: {
          totalPolicies: allRows.length,
          standaloneCount: standaloneRows.length,
          rentProtecCount: rentProtecRows.length,
          activePoliciesCount: activeOrPaidStandalone.length + activeRentProtec.length,
          totalSumAssuredNgn: Number(totalSumAssuredNgn.toFixed(2)),
          totalInsurerRemittanceNgn: Number(
            (standalonePremiumCollectedNgn + rentProtecPremiumPayableNgn).toFixed(2),
          ),
          standalonePremiumCollectedNgn: Number(standalonePremiumCollectedNgn.toFixed(2)),
          rentProtecPremiumPayableNgn: Number(rentProtecPremiumPayableNgn.toFixed(2)),
          rentProtecPremiumRecoveredNgn: Number(rentProtecPremiumRecoveredNgn.toFixed(2)),
          rentProtecUnrecoveredPremiumNgn: Number(rentProtecUnrecoveredPremiumNgn.toFixed(2)),
        },
        policies: filtered,
        recentRecoveryJournal: recoveryJournal.map((j) => {
          const fn = this.decryptSafe(j.vault?.user?.firstName)
          const ln = this.decryptSafe(j.vault?.user?.lastName)
          return {
            uuid: j.uuid,
            vaultUuid: j.vault?.uuid || '',
            policyholderName: `${fn} ${ln}`.trim() || 'Tenant',
            entryDate: j.entryDate.toISOString(),
            entryType: j.entryType,
            principalBaseNgn: Number(j.principalBaseKobo) / 100,
            grossArmRatePct: j.grossArmRatePct,
            customerRatePct: j.customerRatePct,
            grossArmYieldNgn: Number(j.grossArmYieldKobo) / 100,
            customerNetYieldNgn: Number(j.customerNetYieldKobo) / 100,
            yieldSpreadNgn: Number(j.yieldSpreadKobo) / 100,
            premiumRecoveryAppliedNgn: Number(j.premiumRecoveryAppliedKobo) / 100,
            netMarginDeltaNgn: Number(j.netMarginDeltaKobo) / 100,
            notes: j.notes,
          }
        }),
      },
    }
  }
}
