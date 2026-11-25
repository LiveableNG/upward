import { Injectable, Logger, Inject, Optional } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../domains/rent-savings/rent-advance.repository'
import { ARM_JOB_QUEUE, IArmJobQueue } from '../domains/rent-savings/arm-job.interface'
import { RentSavingsCalculatorEngine } from '../domains/rent-savings/rent-savings-calculator.engine'
import { AssetManagementProviderRegistry } from '../infrastructure/providers/asset-management/asset-management-provider.registry'
import { PlatformRatesService } from '../shared/infrastructure/common/platform-rates.service'

@Injectable()
export class RentSavingsScheduler {
  private readonly logger = new Logger(RentSavingsScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
    private readonly providerRegistry: AssetManagementProviderRegistry,
    private readonly platformRates: PlatformRatesService,
    @Optional()
    @Inject(ARM_JOB_QUEUE)
    private readonly armJobQueue?: IArmJobQueue,
  ) {}

  /**
   * Cron 1: Daily NAV Accrual Routine (06:00 AM WAT / 05:00 UTC)
   * Fetches latest NAV yield, calculates daily compound interest, and credits active vaults.
   */
  @Cron('0 5 * * *')
  async executeDailyNavAccrual() {
    this.logger.log('Starting Daily NAV Accrual routine for rent savings vaults...')
    const now = new Date()

    try {
      const activeVaults = await this.prisma.upward_rent_vault.findMany({
        where: {
          lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
        },
      })

      this.logger.log(`Found ${activeVaults.length} active vaults for daily yield calculation.`)

      const armProvider = this.providerRegistry.getProvider('ARM')
      const platformRates = await this.platformRates.getRates()

      // Gross ARM MMF annual rate (live ARM metrics, fallback to max(savingsAnnualRatePct, 16.55%))
      let grossArmAnnualRatePct = Math.max(platformRates.savingsAnnualRatePct, 16.55)
      try {
        const metrics = await armProvider.getYieldMetrics('ARMMMF')
        if (metrics?.annualNetYieldRate > 0) {
          grossArmAnnualRatePct = Number((metrics.annualNetYieldRate * 100).toFixed(4))
        } else if (metrics?.dailyYieldRate > 0) {
          grossArmAnnualRatePct = Number((metrics.dailyYieldRate * 365 * 100).toFixed(4))
        }
      } catch (rateErr: any) {
        this.logger.warn(`Could not fetch live ARM yield rate, using platform rate: ${rateErr?.message}`)
      }
      const grossArmDailyRate = grossArmAnnualRatePct / 100 / 365
      const dateStamp = now.toISOString().split('T')[0]

      for (const vault of activeVaults) {
        const totalBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo
        if (totalBalance <= 0n) continue

        // Check if tenant has an overdue advance; if so, daily yield is frozen per spec
        const overdueAdvance = await this.prisma.upward_rent_advance.findFirst({
          where: {
            vaultId: vault.id,
            status: { in: ['ACTIVE', 'DEFAULTED'] },
            repaymentDueDate: { lt: now },
          },
        })

        if (overdueAdvance) {
          this.logger.warn(`Vault ${vault.uuid} has an overdue loan. Daily yield frozen.`)
          // Apply 0.1%/day late penalty to overdue advance
          const daysOverdue = Math.max(
            1,
            Math.floor(
              (now.getTime() - overdueAdvance.repaymentDueDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
          const latePenalty = RentSavingsCalculatorEngine.calculateAdvanceLatePenalty(
            overdueAdvance.totalRepayableKobo - overdueAdvance.amountRepaidKobo,
            daysOverdue,
          )
          await this.prisma.upward_rent_advance.update({
            where: { id: overdueAdvance.id },
            data: {
              status: 'DEFAULTED',
              latePenaltiesKobo: latePenalty,
            },
          })
          continue
        }

        // Determine per-vault customer annual rate (10% for RENT_PROTEC, 16% for SAVE_AND_EARN)
        const isRentProtec = vault.productOption === 'RENT_PROTEC'
        const customerAnnualRatePct =
          vault.appliedAnnualRatePct && vault.appliedAnnualRatePct > 0
            ? vault.appliedAnnualRatePct
            : isRentProtec
              ? platformRates.rentProtecRatePct
              : platformRates.savingsAnnualRatePct
        const customerDailyRate = customerAnnualRatePct / 100 / 365

        // Customer Liability Ledger: strictly accrues at customer's plan rate (0% visible insurance deduction)
        const dailyYieldKobo = BigInt(
          Math.max(1, Math.round(Number(totalBalance) * customerDailyRate)),
        )
        if (dailyYieldKobo <= 0n) continue

        // Internal Treasury Ledger: gross ARM yield earned on deployed funds vs customer net yield
        const effectiveGrossRatePct = Math.max(grossArmAnnualRatePct, customerAnnualRatePct)
        const effectiveGrossDailyRate = Math.max(grossArmDailyRate, customerDailyRate)
        const grossArmYieldKobo = BigInt(
          Math.max(Number(dailyYieldKobo), Math.round(Number(totalBalance) * effectiveGrossDailyRate)),
        )
        const yieldSpreadKobo =
          grossArmYieldKobo > dailyYieldKobo ? grossArmYieldKobo - dailyYieldKobo : 0n

        const newBalance = totalBalance + dailyYieldKobo

        // 1. Customer Liability Ledger: Record daily yield accrual transaction
        const ref = `YLD_${vault.id}_${dateStamp}_${Math.floor(100 + Math.random() * 900)}`
        await this.rentVaultRepo.createTransaction({
          vaultId: vault.id,
          userId: vault.userId,
          type: 'YIELD_ACCRUAL',
          amountKobo: dailyYieldKobo,
          principalDeltaKobo: 0n,
          yieldDeltaKobo: dailyYieldKobo,
          balanceAfterKobo: newBalance,
          reference: ref,
          channel: 'SYSTEM_YIELD',
          narration: `Daily compound yield (${customerAnnualRatePct.toFixed(1)}% p.a.) credited to vault`,
        })

        // Increment accrued yield and update lastYieldSyncAt
        await this.rentVaultRepo.incrementBalances(vault.id, 0n, dailyYieldKobo)
        await this.rentVaultRepo.update(vault.id, {
          lastYieldSyncAt: now,
        })

        // 2. Internal Treasury & Premium Recovery Ledger (separate from customer balance)
        if (this.prisma.upward_vault_treasury_summary && this.prisma.upward_savings_internal_ledger) {
          try {
            const existingSummary = await this.prisma.upward_vault_treasury_summary.findUnique({
              where: { vaultId: vault.id },
            })
            const defaultPremiumObligationKobo = isRentProtec
              ? BigInt(
                  Math.round(
                    Number(vault.targetAmountKobo) * (platformRates.insurancePremiumPct / 100),
                  ),
                )
              : 0n

            const currentUnrecovered = existingSummary
              ? existingSummary.unrecoveredPremiumKobo
              : defaultPremiumObligationKobo
            const premiumRecoveryAppliedKobo =
              currentUnrecovered > 0n
                ? yieldSpreadKobo < currentUnrecovered
                  ? yieldSpreadKobo
                  : currentUnrecovered
                : 0n
            const netMarginDeltaKobo = yieldSpreadKobo - premiumRecoveryAppliedKobo
            const nextUnrecovered = currentUnrecovered - premiumRecoveryAppliedKobo

            if (existingSummary) {
              await this.prisma.upward_vault_treasury_summary.update({
                where: { vaultId: vault.id },
                data: {
                  grossArmYieldAccruedKobo: { increment: grossArmYieldKobo },
                  customerYieldAccruedKobo: { increment: dailyYieldKobo },
                  platformSpreadAccruedKobo: { increment: yieldSpreadKobo },
                  premiumRecoveredKobo: { increment: premiumRecoveryAppliedKobo },
                  unrecoveredPremiumKobo: nextUnrecovered,
                  netPlatformMarginKobo: { increment: netMarginDeltaKobo },
                  lastAccrualDate: now,
                },
              })
            } else {
              await this.prisma.upward_vault_treasury_summary.create({
                data: {
                  vaultId: vault.id,
                  productOption: vault.productOption || 'SAVE_AND_EARN',
                  grossArmYieldAccruedKobo: grossArmYieldKobo,
                  customerYieldAccruedKobo: dailyYieldKobo,
                  platformSpreadAccruedKobo: yieldSpreadKobo,
                  upfrontPremiumObligationKobo: defaultPremiumObligationKobo,
                  premiumRecoveredKobo: premiumRecoveryAppliedKobo,
                  unrecoveredPremiumKobo: nextUnrecovered,
                  netPlatformMarginKobo: netMarginDeltaKobo,
                  lastAccrualDate: now,
                },
              })
            }

            await this.prisma.upward_savings_internal_ledger.create({
              data: {
                vaultId: vault.id,
                entryDate: now,
                entryType: 'DAILY_ACCRUAL',
                productOption: vault.productOption || 'SAVE_AND_EARN',
                principalBaseKobo: totalBalance,
                grossArmRatePct: effectiveGrossRatePct,
                customerRatePct: customerAnnualRatePct,
                grossArmYieldKobo,
                customerNetYieldKobo: dailyYieldKobo,
                yieldSpreadKobo,
                premiumObligationDeltaKobo: 0n,
                premiumRecoveryAppliedKobo,
                netMarginDeltaKobo,
                reference: `TREAS_${ref}`,
                notes: isRentProtec
                  ? `Daily accrual: ARM ${effectiveGrossRatePct.toFixed(2)}% vs Customer ${customerAnnualRatePct.toFixed(1)}% (spread allocated to 2% premium recovery)`
                  : `Daily accrual: ARM ${effectiveGrossRatePct.toFixed(2)}% vs Customer ${customerAnnualRatePct.toFixed(1)}%`,
              },
            })
          } catch (treasuryErr: any) {
            this.logger.warn(
              `Internal treasury ledger sync failed for vault ${vault.uuid}: ${treasuryErr?.message}`,
            )
          }
        }
      }

      this.logger.log('Daily NAV Accrual routine completed successfully.')
    } catch (err) {
      this.logger.error('Failed to execute Daily NAV Accrual routine', err)
    }
  }

  /**
   * Cron 2: Durable ARM Outbox Safety-Net Reconciler (Every 2 minutes)
   * Re-enqueues any `upward_arm_job` stuck in QUEUED (e.g. brief Redis blip during commit)
   * and recovers stale PROCESSING locks (>10m). Never double-subscribes already processed deposits.
   */
  @Cron('*/2 * * * *')
  async reconcileArmBackgroundJobs() {
    if (!this.armJobQueue) return
    try {
      await this.armJobQueue.reconcilePendingJobs()
    } catch (err) {
      this.logger.error('Failed to reconcile pending ARM background jobs', err)
    }
  }

  /**
   * Retained for backward compatibility with external schedulers.
   * Delegates strictly to the idempotent outbox reconciler so deposits are NEVER double-invested.
   */
  @Cron('30 14 * * *')
  async executeOmnibusSweep() {
    this.logger.log('Running daily ARM outbox reconciliation check...')
    await this.reconcileArmBackgroundJobs()
  }

  /**
   * Cron 3: Weekend Float Rebalance Routine (Thursdays 11:00 AM WAT / 10:00 UTC)
   * Pre-redeems liquidity for Fri, Sat, Sun, Mon settlements to bypass interbank delays.
   */
  @Cron('0 10 * * 4')
  async executeWeekendFloatRebalance() {
    this.logger.log('Starting Weekend Float Rebalance routine...')
    const fourDaysAhead = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)

    try {
      const maturingVaults = await this.prisma.upward_rent_vault.findMany({
        where: {
          lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
          contractualDueDate: { lte: fourDaysAhead },
        },
      })

      if (maturingVaults.length === 0) {
        this.logger.log('No vaults maturing over the upcoming weekend window.')
        return
      }

      const totalRequiredKobo = maturingVaults.reduce(
        (sum, v) => sum + (v.currentPrincipalKobo + v.accruedYieldKobo),
        0n,
      )

      this.logger.log(
        `Pre-redeeming ₦${Number(totalRequiredKobo) / 100} for ${maturingVaults.length} maturing weekend vaults...`,
      )

      const provider = this.providerRegistry.getProvider('ARM')
      const rebalanceRef = `FLOAT_REBAL_${Date.now()}`

      await provider.redeem({
        membershipId: 'OMNIBUS_MASTER',
        productCode: 'ARMMMF',
        productAccountNumber: 'OMNIBUS_FLOAT_01',
        amountKobo: totalRequiredKobo,
        reference: rebalanceRef,
      })

      this.logger.log(`Weekend Float Rebalance routine executed. Reference: ${rebalanceRef}`)
    } catch (err) {
      this.logger.error('Failed to execute Weekend Float Rebalance routine', err)
    }
  }
}
