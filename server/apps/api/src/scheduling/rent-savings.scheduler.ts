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
      const grossArmDailyRate = RentSavingsCalculatorEngine.getEffectiveDailyRate(
        grossArmAnnualRatePct / 100,
      )
      const dateStamp = now.toISOString().split('T')[0]

      for (const vault of activeVaults) {
        const totalBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo
        if (totalBalance <= 0n) continue

        // Hard Idempotency Guard: deterministic per-vault, per-day reference guarantees
        // duplicate cron runs or multi-replica schedules can NEVER double-credit interest.
        const deterministicRef = `YLD_${vault.id}_${dateStamp}`
        if (typeof this.rentVaultRepo.findTransactionByReference === 'function') {
          const alreadyAccruedToday =
            await this.rentVaultRepo.findTransactionByReference(deterministicRef)
          if (alreadyAccruedToday) {
            this.logger.log(
              `Skipping duplicate daily accrual for vault ${vault.uuid} (${deterministicRef})`,
            )
            continue
          }
        }

        // ARM-Backed Principal Guard: never accrue synthetic interest on deposits whose ARM
        // SUBSCRIBE job is still QUEUED/PROCESSING or terminally FAILED (funds parked on DVA).
        let uninvestedArmKobo = 0n
        if (vault.investmentProvider === 'ARM' && this.prisma?.upward_arm_job?.findMany) {
          const pendingArmJobs = await this.prisma.upward_arm_job
            .findMany({
              where: {
                vaultId: vault.id,
                jobType: 'SUBSCRIBE',
                status: { in: ['QUEUED', 'PROCESSING', 'FAILED'] },
              },
              select: { amountKobo: true },
            })
            .catch(() => [])
          for (const j of pendingArmJobs) {
            if (j?.amountKobo && j.amountKobo > 0n) {
              uninvestedArmKobo += j.amountKobo
            }
          }
        }

        const deployedPrincipalKobo =
          vault.currentPrincipalKobo > uninvestedArmKobo
            ? vault.currentPrincipalKobo - uninvestedArmKobo
            : 0n
        const eligibleCompoundingBalance = deployedPrincipalKobo + vault.accruedYieldKobo
        if (eligibleCompoundingBalance <= 0n) {
          this.logger.log(
            `Vault ${vault.uuid} has ₦0 ARM-deployed balance (uninvested=${Number(uninvestedArmKobo) / 100}); skipping accrual until ARM confirms.`,
          )
          continue
        }

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

        // Determine per-vault customer annual rate (10% Rent Protec, 12% Flexible Save & Earn, 16% Full Lock Save & Earn)
        const isRentProtec = vault.productOption === 'RENT_PROTEC'
        const isFlexible = (vault as any).lockMode === 'FLEXIBLE' && !isRentProtec
        const customerAnnualRatePct =
          vault.appliedAnnualRatePct && vault.appliedAnnualRatePct > 0
            ? vault.appliedAnnualRatePct
            : isRentProtec
              ? platformRates.rentProtecRatePct
              : isFlexible
                ? platformRates.flexibleSavingsAnnualRatePct
                : platformRates.savingsAnnualRatePct
        const customerDailyRate = RentSavingsCalculatorEngine.getEffectiveDailyRate(
          customerAnnualRatePct / 100,
        )

        // Customer Liability Ledger: exact effective daily compounding (no dust-balance inflation)
        const dailyYieldKobo = BigInt(
          Math.round(Number(eligibleCompoundingBalance) * customerDailyRate),
        )
        if (dailyYieldKobo <= 0n) continue

        // Internal Treasury Ledger: TRUE gross ARM yield vs customer net yield (NEVER clamp upward,
        // so negative spread / yield-compression subsidy is honestly visible to Finance/Admin).
        const grossArmYieldKobo = BigInt(
          Math.round(Number(eligibleCompoundingBalance) * grossArmDailyRate),
        )
        const yieldSpreadKobo = grossArmYieldKobo - dailyYieldKobo
        if (yieldSpreadKobo < 0n) {
          this.logger.warn(
            `NEGATIVE SPREAD ALERT on vault ${vault.uuid}: ARM gross ${grossArmAnnualRatePct.toFixed(2)}% < customer ${customerAnnualRatePct.toFixed(2)}% (daily subsidy=${Number(-yieldSpreadKobo) / 100} NGN)`,
          )
        }

        const newBalance = totalBalance + dailyYieldKobo

        // 1. Customer Liability Ledger: Record daily yield accrual transaction (idempotent on deterministicRef)
        try {
          await this.rentVaultRepo.createTransaction({
            vaultId: vault.id,
            userId: vault.userId,
            type: 'YIELD_ACCRUAL',
            amountKobo: dailyYieldKobo,
            principalDeltaKobo: 0n,
            yieldDeltaKobo: dailyYieldKobo,
            balanceAfterKobo: newBalance,
            reference: deterministicRef,
            channel: 'SYSTEM_YIELD',
            narration: `Daily compound yield (${customerAnnualRatePct.toFixed(1)}% p.a.) credited to vault`,
            metadata: {
              eligibleCompoundingBalanceKobo: eligibleCompoundingBalance.toString(),
              uninvestedArmKobo: uninvestedArmKobo.toString(),
              grossArmAnnualRatePct,
              customerAnnualRatePct,
              yieldSpreadKobo: yieldSpreadKobo.toString(),
            },
          })
        } catch (createErr: any) {
          if (createErr?.code === 'P2002') {
            this.logger.log(
              `Concurrent duplicate accrual atomically blocked by DB unique key (${deterministicRef})`,
            )
            continue
          }
          throw createErr
        }

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
            const vaultTermDays = vault.contractualDueDate && vault.createdAt
              ? Math.max(
                  1,
                  Math.ceil(
                    (vault.contractualDueDate.getTime() - vault.createdAt.getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
              : 300
            const activeTermDays =
              RentSavingsCalculatorEngine.getRentProtecActiveCompoundingDays(vaultTermDays)
            const activationThresholdKobo =
              RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
                vault.targetAmountKobo,
                activeTermDays,
              )
            const isCoverageActivated =
              isRentProtec &&
              ((existingSummary && existingSummary.upfrontPremiumObligationKobo > 0n) ||
                vault.currentPrincipalKobo >= activationThresholdKobo)

            const defaultPremiumObligationKobo = isCoverageActivated
              ? BigInt(
                  Math.round(
                    Number(vault.targetAmountKobo) * (platformRates.insurancePremiumPct / 100),
                  ),
                )
              : 0n

            const currentUnrecovered = existingSummary
              ? existingSummary.upfrontPremiumObligationKobo > 0n
                ? existingSummary.unrecoveredPremiumKobo
                : defaultPremiumObligationKobo
              : defaultPremiumObligationKobo
            const positiveSpreadKobo = yieldSpreadKobo > 0n ? yieldSpreadKobo : 0n
            const premiumRecoveryAppliedKobo =
              currentUnrecovered > 0n && positiveSpreadKobo > 0n
                ? positiveSpreadKobo < currentUnrecovered
                  ? positiveSpreadKobo
                  : currentUnrecovered
                : 0n
            const netMarginDeltaKobo = yieldSpreadKobo - premiumRecoveryAppliedKobo
            const nextUnrecovered = currentUnrecovered - premiumRecoveryAppliedKobo

            if (existingSummary) {
              const needsActivationBackfill =
                existingSummary.upfrontPremiumObligationKobo === 0n &&
                defaultPremiumObligationKobo > 0n
              await this.prisma.upward_vault_treasury_summary.update({
                where: { vaultId: vault.id },
                data: {
                  ...(needsActivationBackfill
                    ? { upfrontPremiumObligationKobo: defaultPremiumObligationKobo }
                    : {}),
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
                principalBaseKobo: eligibleCompoundingBalance,
                grossArmRatePct: grossArmAnnualRatePct,
                customerRatePct: customerAnnualRatePct,
                grossArmYieldKobo,
                customerNetYieldKobo: dailyYieldKobo,
                yieldSpreadKobo,
                premiumObligationDeltaKobo: 0n,
                premiumRecoveryAppliedKobo,
                netMarginDeltaKobo,
                reference: `TREAS_${deterministicRef}`,
                notes:
                  yieldSpreadKobo < 0n
                    ? `NEGATIVE SPREAD: ARM ${grossArmAnnualRatePct.toFixed(2)}% vs Customer ${customerAnnualRatePct.toFixed(1)}% (platform subsidy booked)`
                    : isRentProtec
                      ? `Daily accrual: ARM ${grossArmAnnualRatePct.toFixed(2)}% vs Customer ${customerAnnualRatePct.toFixed(1)}% (spread allocated to 2% premium recovery)`
                      : `Daily accrual: ARM ${grossArmAnnualRatePct.toFixed(2)}% vs Customer ${customerAnnualRatePct.toFixed(1)}%`,
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
