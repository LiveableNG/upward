import { BadRequestException, ForbiddenException, Injectable, Optional } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

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
        const firstName = this.decryptSafe(v.user?.firstName)
        const lastName = this.decryptSafe(v.user?.lastName)
        const customerName = `${firstName} ${lastName}`.trim() || 'Tenant'
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
        isSandbox: !isProductionRuntime(process.env.PAYSTACK_SECRET_KEY),
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

@Injectable()
export class SimulateDailyNavAccrualUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformRates: PlatformRatesService,
    @Optional()
    private readonly providerRegistry?: AssetManagementProviderRegistry,
  ) {}

  async execute(params?: { days?: number; vaultUuid?: string }) {
    if (isProductionRuntime(process.env.PAYSTACK_SECRET_KEY)) {
      throw new ForbiddenException('Accrual simulation is disabled in production.')
    }

    const days = Math.min(90, Math.max(1, Math.round(Number(params?.days || 1))))
    const now = new Date()
    const rates = await this.platformRates.getRates()

    let grossArmAnnualRatePct = Math.max(rates.savingsAnnualRatePct, 16.55)
    try {
      const armProvider = this.providerRegistry?.getProvider('ARM')
      const metrics = armProvider ? await armProvider.getYieldMetrics('ARMMMF') : null
      if (metrics?.annualNetYieldRate && metrics.annualNetYieldRate > 0) {
        grossArmAnnualRatePct = Number((metrics.annualNetYieldRate * 100).toFixed(4))
      }
    } catch {
      // keep fallback gross rate
    }
    const grossArmDailyRate = grossArmAnnualRatePct / 100 / 365

    const whereVault: any = {
      lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
      ...(params?.vaultUuid ? { uuid: params.vaultUuid } : {}),
    }

    const vaults = await this.prisma.upward_rent_vault.findMany({
      where: whereVault,
      include: { treasurySummary: true },
    })

    const fundedVaults = vaults.filter(
      (v) => v.currentPrincipalKobo + v.accruedYieldKobo > 0n,
    )

    if (fundedVaults.length === 0) {
      throw new BadRequestException(
        'No funded active vaults found (principal + yield must be greater than ₦0). Fund a vault first to see yield spread and premium recovery.',
      )
    }

    let totalCustomerYieldAddedKobo = 0n
    let totalGrossArmYieldAddedKobo = 0n
    let totalSpreadAddedKobo = 0n
    let totalPremiumRecoveredAddedKobo = 0n
    let totalNetMarginAddedKobo = 0n

    for (const vault of fundedVaults) {
      const isRentProtec = vault.productOption === 'RENT_PROTEC'
      const customerAnnualRatePct =
        vault.appliedAnnualRatePct && vault.appliedAnnualRatePct > 0
          ? vault.appliedAnnualRatePct
          : isRentProtec
            ? rates.rentProtecRatePct
            : rates.savingsAnnualRatePct
      const customerDailyRate = customerAnnualRatePct / 100 / 365
      const effectiveGrossRatePct = Math.max(grossArmAnnualRatePct, customerAnnualRatePct)
      const effectiveGrossDailyRate = Math.max(grossArmDailyRate, customerDailyRate)

      const vaultTermDays = Math.max(
        1,
        Math.ceil(
          (vault.contractualDueDate.getTime() - vault.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
      const activationThresholdKobo =
        RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
          vault.targetAmountKobo,
          vaultTermDays,
        )
      const existingSummary = vault.treasurySummary
      const isCoverageActivated =
        isRentProtec &&
        ((existingSummary && existingSummary.upfrontPremiumObligationKobo > 0n) ||
          vault.currentPrincipalKobo >= activationThresholdKobo)

      const defaultPremiumObligationKobo = isCoverageActivated
        ? BigInt(
            Math.round(Number(vault.targetAmountKobo) * (rates.insurancePremiumPct / 100)),
          )
        : 0n

      let runningBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo
      let unrecovered = existingSummary
        ? existingSummary.upfrontPremiumObligationKobo > 0n
          ? existingSummary.unrecoveredPremiumKobo
          : defaultPremiumObligationKobo
        : defaultPremiumObligationKobo

      let custYieldAdded = 0n
      let grossArmYieldAdded = 0n
      let spreadAdded = 0n
      let premRecoveredAdded = 0n
      let netMarginAdded = 0n

      for (let d = 0; d < days; d++) {
        const dayCust = BigInt(Math.max(1, Math.round(Number(runningBalance) * customerDailyRate)))
        const dayArm = BigInt(
          Math.max(Number(dayCust), Math.round(Number(runningBalance) * effectiveGrossDailyRate)),
        )
        const daySpread = dayArm > dayCust ? dayArm - dayCust : 0n
        const dayPremRec =
          unrecovered > 0n ? (daySpread < unrecovered ? daySpread : unrecovered) : 0n
        const dayMargin = daySpread - dayPremRec

        runningBalance += dayCust
        unrecovered -= dayPremRec

        custYieldAdded += dayCust
        grossArmYieldAdded += dayArm
        spreadAdded += daySpread
        premRecoveredAdded += dayPremRec
        netMarginAdded += dayMargin
      }

      const ref = `SIM_YLD_${vault.id}_${days}D_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`

      await this.prisma.$transaction(async (tx) => {
        await tx.upward_rent_vault_transaction.create({
          data: {
            vaultId: vault.id,
            userId: vault.userId,
            type: 'YIELD_ACCRUAL',
            amountKobo: custYieldAdded,
            principalDeltaKobo: 0n,
            yieldDeltaKobo: custYieldAdded,
            balanceAfterKobo: runningBalance,
            reference: ref,
            channel: 'SYSTEM_YIELD',
            narration: `Simulated ${days}-day compound yield (${customerAnnualRatePct.toFixed(1)}% p.a.) credited to vault`,
            metadata: { simulated: true, days } as any,
          },
        })

        await tx.upward_rent_vault.update({
          where: { id: vault.id },
          data: {
            accruedYieldKobo: { increment: custYieldAdded },
            lastYieldSyncAt: now,
          },
        })

        if (existingSummary) {
          const needsActivationBackfill =
            existingSummary.upfrontPremiumObligationKobo === 0n &&
            defaultPremiumObligationKobo > 0n
          await tx.upward_vault_treasury_summary.update({
            where: { vaultId: vault.id },
            data: {
              ...(needsActivationBackfill
                ? { upfrontPremiumObligationKobo: defaultPremiumObligationKobo }
                : {}),
              grossArmYieldAccruedKobo: { increment: grossArmYieldAdded },
              customerYieldAccruedKobo: { increment: custYieldAdded },
              platformSpreadAccruedKobo: { increment: spreadAdded },
              premiumRecoveredKobo: { increment: premRecoveredAdded },
              unrecoveredPremiumKobo: unrecovered,
              netPlatformMarginKobo: { increment: netMarginAdded },
              lastAccrualDate: now,
            },
          })
        } else {
          await tx.upward_vault_treasury_summary.create({
            data: {
              vaultId: vault.id,
              productOption: vault.productOption || 'SAVE_AND_EARN',
              grossArmYieldAccruedKobo: grossArmYieldAdded,
              customerYieldAccruedKobo: custYieldAdded,
              platformSpreadAccruedKobo: spreadAdded,
              upfrontPremiumObligationKobo: defaultPremiumObligationKobo,
              premiumRecoveredKobo: premRecoveredAdded,
              unrecoveredPremiumKobo: unrecovered,
              netPlatformMarginKobo: netMarginAdded,
              lastAccrualDate: now,
            },
          })
        }

        await tx.upward_savings_internal_ledger.create({
          data: {
            vaultId: vault.id,
            entryDate: now,
            entryType: 'DAILY_ACCRUAL',
            productOption: vault.productOption || 'SAVE_AND_EARN',
            principalBaseKobo: vault.currentPrincipalKobo + vault.accruedYieldKobo,
            grossArmRatePct: effectiveGrossRatePct,
            customerRatePct: customerAnnualRatePct,
            grossArmYieldKobo: grossArmYieldAdded,
            customerNetYieldKobo: custYieldAdded,
            yieldSpreadKobo: spreadAdded,
            premiumObligationDeltaKobo: 0n,
            premiumRecoveryAppliedKobo: premRecoveredAdded,
            netMarginDeltaKobo: netMarginAdded,
            reference: `TREAS_${ref}`,
            notes: `Simulated ${days}d accrual: ARM ${effectiveGrossRatePct.toFixed(2)}% vs Customer ${customerAnnualRatePct.toFixed(1)}%${isRentProtec ? ' (spread applied to 2% Rent Protec premium recovery)' : ''}`,
          },
        })
      })

      totalCustomerYieldAddedKobo += custYieldAdded
      totalGrossArmYieldAddedKobo += grossArmYieldAdded
      totalSpreadAddedKobo += spreadAdded
      totalPremiumRecoveredAddedKobo += premRecoveredAdded
      totalNetMarginAddedKobo += netMarginAdded
    }

    return {
      success: true,
      message: `Simulated ${days} day(s) of accrual across ${fundedVaults.length} funded vault(s). Recovered ₦${(Number(totalPremiumRecoveredAddedKobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} toward Rent Protec premiums.`,
      data: {
        daysSimulated: days,
        vaultsProcessed: fundedVaults.length,
        customerYieldAddedNgn: Number(totalCustomerYieldAddedKobo) / 100,
        grossArmYieldAddedNgn: Number(totalGrossArmYieldAddedKobo) / 100,
        spreadAddedNgn: Number(totalSpreadAddedKobo) / 100,
        premiumRecoveredAddedNgn: Number(totalPremiumRecoveredAddedKobo) / 100,
        netMarginAddedNgn: Number(totalNetMarginAddedKobo) / 100,
      },
    }
  }
}
