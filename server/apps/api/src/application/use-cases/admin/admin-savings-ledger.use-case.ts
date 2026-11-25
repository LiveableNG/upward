import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface AdminSavingsLedgerFilter {
  productOption?: string
  search?: string
}

@Injectable()
export class GetAdminSavingsLedgerUseCase {
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

  async execute(filter?: AdminSavingsLedgerFilter) {
    const whereVault: any = {}
    if (
      filter?.productOption === 'RENT_PROTEC' ||
      filter?.productOption === 'SAVE_AND_EARN'
    ) {
      whereVault.productOption = filter.productOption
    }

    const vaults = await this.prisma.upward_rent_vault.findMany({
      where: whereVault,
      orderBy: { createdAt: 'desc' },
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
        treasurySummary: true,
      },
    })

    const recentEntries = await this.prisma.upward_savings_internal_ledger.findMany({
      where:
        filter?.productOption === 'RENT_PROTEC' ||
        filter?.productOption === 'SAVE_AND_EARN'
          ? { productOption: filter.productOption }
          : undefined,
      orderBy: { entryDate: 'desc' },
      take: 100,
      include: {
        vault: {
          select: {
            uuid: true,
            productOption: true,
          },
        },
      },
    })

    const query = (filter?.search || '').trim().toLowerCase()

    let totalCustomerPrincipalKobo = 0n
    let totalCustomerYieldKobo = 0n
    let totalCustomerLiabilityKobo = 0n
    let totalGrossArmYieldKobo = 0n
    let totalPlatformSpreadKobo = 0n
    let totalUpfrontPremiumObligationKobo = 0n
    let totalPremiumRecoveredKobo = 0n
    let totalUnrecoveredPremiumKobo = 0n
    let totalNetPlatformMarginKobo = 0n

    const rows = vaults
      .map((v) => {
        const customerName = `${v.user?.firstName || ''} ${v.user?.lastName || ''}`.trim() || 'Tenant'
        const customerEmail = this.decryptSafe(v.user?.email)
        const summary = v.treasurySummary

        const principalKobo = v.currentPrincipalKobo
        const customerYieldKobo = v.accruedYieldKobo
        const customerLiabilityKobo = principalKobo + customerYieldKobo
        const grossArmYieldKobo = summary?.grossArmYieldAccruedKobo ?? customerYieldKobo
        const platformSpreadKobo = summary?.platformSpreadAccruedKobo ?? 0n
        const upfrontPremiumObligationKobo = summary?.upfrontPremiumObligationKobo ?? 0n
        const premiumRecoveredKobo = summary?.premiumRecoveredKobo ?? 0n
        const unrecoveredPremiumKobo = summary?.unrecoveredPremiumKobo ?? 0n
        const netPlatformMarginKobo = summary?.netPlatformMarginKobo ?? 0n

        return {
          vaultUuid: v.uuid,
          userUuid: v.user?.uuid || '',
          customerName,
          customerEmail,
          productOption: v.productOption,
          lockStatus: v.lockStatus,
          appliedAnnualRatePct: v.appliedAnnualRatePct,
          targetAmountNgn: Number(v.targetAmountKobo) / 100,
          // Ledger 1: Customer Liability Ledger
          customerPrincipalNgn: Number(principalKobo) / 100,
          customerAccruedYieldNgn: Number(customerYieldKobo) / 100,
          customerTotalLiabilityNgn: Number(customerLiabilityKobo) / 100,
          // Ledger 2: Upward Internal Treasury & Premium Recovery Ledger
          grossArmYieldNgn: Number(grossArmYieldKobo) / 100,
          platformSpreadNgn: Number(platformSpreadKobo) / 100,
          upfrontPremiumObligationNgn: Number(upfrontPremiumObligationKobo) / 100,
          premiumRecoveredNgn: Number(premiumRecoveredKobo) / 100,
          unrecoveredPremiumNgn: Number(unrecoveredPremiumKobo) / 100,
          netPlatformMarginNgn: Number(netPlatformMarginKobo) / 100,
          premiumRecoveryPct:
            upfrontPremiumObligationKobo > 0n
              ? Number(
                  (
                    (Number(premiumRecoveredKobo) / Number(upfrontPremiumObligationKobo)) *
                    100
                  ).toFixed(1),
                )
              : 100,
          lastAccrualDate: summary?.lastAccrualDate?.toISOString() || v.lastYieldSyncAt?.toISOString() || null,
          createdAt: v.createdAt.toISOString(),
          _raw: {
            principalKobo,
            customerYieldKobo,
            customerLiabilityKobo,
            grossArmYieldKobo,
            platformSpreadKobo,
            upfrontPremiumObligationKobo,
            premiumRecoveredKobo,
            unrecoveredPremiumKobo,
            netPlatformMarginKobo,
          },
        }
      })
      .filter((row) => {
        if (!query) return true
        return (
          row.customerName.toLowerCase().includes(query) ||
          row.customerEmail.toLowerCase().includes(query) ||
          row.vaultUuid.toLowerCase().includes(query)
        )
      })

    for (const row of rows) {
      totalCustomerPrincipalKobo += row._raw.principalKobo
      totalCustomerYieldKobo += row._raw.customerYieldKobo
      totalCustomerLiabilityKobo += row._raw.customerLiabilityKobo
      totalGrossArmYieldKobo += row._raw.grossArmYieldKobo
      totalPlatformSpreadKobo += row._raw.platformSpreadKobo
      totalUpfrontPremiumObligationKobo += row._raw.upfrontPremiumObligationKobo
      totalPremiumRecoveredKobo += row._raw.premiumRecoveredKobo
      totalUnrecoveredPremiumKobo += row._raw.unrecoveredPremiumKobo
      totalNetPlatformMarginKobo += row._raw.netPlatformMarginKobo
    }

    return {
      success: true,
      data: {
        summary: {
          vaultCount: rows.length,
          rentProtecCount: rows.filter((r) => r.productOption === 'RENT_PROTEC').length,
          saveAndEarnCount: rows.filter((r) => r.productOption === 'SAVE_AND_EARN').length,
          // Ledger 1 Totals
          totalCustomerPrincipalNgn: Number(totalCustomerPrincipalKobo) / 100,
          totalCustomerYieldNgn: Number(totalCustomerYieldKobo) / 100,
          totalCustomerLiabilityNgn: Number(totalCustomerLiabilityKobo) / 100,
          // Ledger 2 Totals
          totalGrossArmYieldNgn: Number(totalGrossArmYieldKobo) / 100,
          totalPlatformSpreadNgn: Number(totalPlatformSpreadKobo) / 100,
          totalUpfrontPremiumObligationNgn: Number(totalUpfrontPremiumObligationKobo) / 100,
          totalPremiumRecoveredNgn: Number(totalPremiumRecoveredKobo) / 100,
          totalUnrecoveredPremiumNgn: Number(totalUnrecoveredPremiumKobo) / 100,
          totalNetPlatformMarginNgn: Number(totalNetPlatformMarginKobo) / 100,
        },
        vaults: rows.map(({ _raw, ...rest }) => rest),
        recentJournal: recentEntries.map((e) => ({
          uuid: e.uuid,
          vaultUuid: e.vault?.uuid || '',
          entryDate: e.entryDate.toISOString(),
          entryType: e.entryType,
          productOption: e.productOption,
          principalBaseNgn: Number(e.principalBaseKobo) / 100,
          grossArmRatePct: e.grossArmRatePct,
          customerRatePct: e.customerRatePct,
          grossArmYieldNgn: Number(e.grossArmYieldKobo) / 100,
          customerNetYieldNgn: Number(e.customerNetYieldKobo) / 100,
          yieldSpreadNgn: Number(e.yieldSpreadKobo) / 100,
          premiumObligationDeltaNgn: Number(e.premiumObligationDeltaKobo) / 100,
          premiumRecoveryAppliedNgn: Number(e.premiumRecoveryAppliedKobo) / 100,
          netMarginDeltaNgn: Number(e.netMarginDeltaKobo) / 100,
          reference: e.reference,
          notes: e.notes,
        })),
      },
    }
  }
}
