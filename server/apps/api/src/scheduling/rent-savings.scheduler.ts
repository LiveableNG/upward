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
      let dailyYieldRate = platformRates.savingsDailyRate
      let annualRatePct = `${platformRates.savingsAnnualRatePct}%`
      try {
        const metrics = await armProvider.getYieldMetrics('ARMMMF')
        if (metrics?.dailyYieldRate > 0 && platformRates.savingsAnnualRatePct === 16.0) {
          dailyYieldRate = metrics.dailyYieldRate
          annualRatePct = `${(metrics.annualNetYieldRate * 100).toFixed(1)}%`
        }
      } catch (rateErr: any) {
        this.logger.warn(`Could not fetch live ARM yield rate, using platform rate: ${rateErr?.message}`)
      }

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

        // Check ARM portfolio for official accrued interest reconciliation if member has ARM account
        let dailyYieldKobo = 0n
        if (vault.providerAccountNumber || vault.providerMembershipId) {
          try {
            const portfolio = await armProvider.getPortfolio(
              vault.providerAccountNumber || vault.providerMembershipId!,
            )
            if (portfolio && portfolio.accruedInterestKobo > vault.accruedYieldKobo) {
              dailyYieldKobo = portfolio.accruedInterestKobo - vault.accruedYieldKobo
            }
          } catch (portErr: any) {
            this.logger.debug(
              `Live ARM portfolio poll skipped for vault ${vault.uuid}: ${portErr?.message}`,
            )
          }
        }

        // Fallback to calculated daily compound rate if no live portfolio delta returned
        if (dailyYieldKobo <= 0n) {
          dailyYieldKobo = BigInt(Math.max(1, Math.round(Number(totalBalance) * dailyYieldRate)))
        }

        if (dailyYieldKobo <= 0n) continue

        const newBalance = totalBalance + dailyYieldKobo

        // Record daily yield accrual transaction
        const ref = `YLD_${vault.id}_${now.toISOString().split('T')[0]}_${Math.floor(100 + Math.random() * 900)}`
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
          narration: `Daily compound yield (${annualRatePct} p.a.) credited to vault`,
        })

        // Increment accrued yield and update lastYieldSyncAt
        await this.rentVaultRepo.incrementBalances(vault.id, 0n, dailyYieldKobo)
        await this.rentVaultRepo.update(vault.id, {
          lastYieldSyncAt: now,
        })
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
