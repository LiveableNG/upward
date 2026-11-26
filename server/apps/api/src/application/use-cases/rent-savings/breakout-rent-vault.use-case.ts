import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common'
import * as crypto from 'crypto'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import { ARM_JOB_QUEUE, IArmJobQueue } from '../../../domains/rent-savings/arm-job.interface'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class BreakoutRentVaultUseCase {
  private readonly logger = new Logger(BreakoutRentVaultUseCase.name)

  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
    @Optional()
    private readonly providerRegistry?: AssetManagementProviderRegistry,
    @Optional()
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(ARM_JOB_QUEUE)
    private readonly armJobQueue?: IArmJobQueue,
  ) {}

  async execute(userId: number, vaultUuid: string) {
    const vault = await this.rentVaultRepo.findByUuid(vaultUuid)
    if (!vault) {
      throw new NotFoundException('Rent vault not found.')
    }
    if (vault.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rent vault.')
    }
    if (vault.lockStatus === 'SETTLED') {
      throw new BadRequestException('Cannot break out of an already settled vault.')
    }
    if (vault.lockStatus === 'BROKEN_OUT') {
      throw new BadRequestException('This vault has already been broken out.')
    }

    const now = new Date()
    const daysHeld = Math.max(
      1,
      Math.floor((now.getTime() - vault.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    )

    const isFlexible =
      (vault as any).lockMode === 'FLEXIBLE' && vault.productOption !== 'RENT_PROTEC'
    const isFullLock = !isFlexible && vault.productOption !== 'RENT_PROTEC'

    if (isFullLock) {
      throw new BadRequestException(
        'Full Lock savings stay in place until 30 days before your rent due date and cannot be withdrawn earlier.',
      )
    }

    // Flexible Save & Earn: 100% principal + 100% accrued yield, ₦0 penalty & ₦0 admin fee.
    // Rent Protec: Fair Exit recalculation (7.0% p.a. + 1.5% admin fee).
    const breakout = isFlexible
      ? {
          principalKobo: vault.currentPrincipalKobo,
          recalculatedYieldKobo: vault.accruedYieldKobo,
          adminFeeKobo: 0n,
          netPayoutKobo: vault.currentPrincipalKobo + vault.accruedYieldKobo,
        }
      : RentSavingsCalculatorEngine.calculateFairBreakout(
          vault.currentPrincipalKobo,
          daysHeld,
        )

    // Check active loan deductions
    let netPayout = breakout.netPayoutKobo
    const activeAdvance = await this.rentAdvanceRepo.findActiveByVaultId(vault.id)
    let advanceDeduction = 0n

    if (activeAdvance && activeAdvance.status === 'ACTIVE') {
      const outstanding = activeAdvance.totalRepayableKobo - activeAdvance.amountRepaidKobo
      const penalties = activeAdvance.latePenaltiesKobo
      advanceDeduction = outstanding + penalties
      netPayout = netPayout > advanceDeduction ? netPayout - advanceDeduction : 0n
    }

    // Rent Protec early-exit premium recovery:
    // If Upward paid the 2% insurance premium upfront and has not yet recovered it
    // through daily yield spread, recover the remaining unrecovered amount on early exit.
    let premiumRecoveryDeduction = 0n
    let treasurySummary: {
      id: number
      unrecoveredPremiumKobo: bigint
      upfrontPremiumObligationKobo: bigint
    } | null = null

    if (
      !isFlexible &&
      vault.productOption === 'RENT_PROTEC' &&
      this.prisma?.upward_vault_treasury_summary
    ) {
      treasurySummary = await this.prisma.upward_vault_treasury_summary.findUnique({
        where: { vaultId: vault.id },
        select: {
          id: true,
          unrecoveredPremiumKobo: true,
          upfrontPremiumObligationKobo: true,
        },
      })
      if (treasurySummary && treasurySummary.unrecoveredPremiumKobo > 0n) {
        premiumRecoveryDeduction =
          netPayout > treasurySummary.unrecoveredPremiumKobo
            ? treasurySummary.unrecoveredPremiumKobo
            : netPayout
        netPayout = netPayout - premiumRecoveryDeduction
      }
    }

    const breakoutReference = `UPW_BREAKOUT_${Date.now()}`

    // Liquidate underlying MMF units via BullMQ durable outbox job (or direct fallback in tests)
    let armWithdrawalId: string | undefined
    let armTransactionId: string | undefined
    const totalVaultBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo

    if (this.prisma && this.armJobQueue) {
      armTransactionId =
        vault.investmentProvider && totalVaultBalance > 0n ? crypto.randomUUID() : undefined
      let queuedArmJob: {
        id: number
        uuid: string
        idempotencyKey: string
        jobType: 'REDEEM'
      } | null = null

      await this.prisma.$transaction(async (tx) => {
        if (typeof tx.$queryRaw === 'function') {
          await tx.$queryRaw`SELECT id FROM upward_rent_vault WHERE id = ${vault.id} FOR UPDATE`
        }

        const freshVault = await tx.upward_rent_vault.findUniqueOrThrow({
          where: { id: vault.id },
        })
        if (freshVault.lockStatus === 'SETTLED') {
          throw new BadRequestException('Cannot break out of an already settled vault.')
        }
        if (freshVault.lockStatus === 'BROKEN_OUT') {
          throw new BadRequestException('This vault has already been broken out.')
        }

        if (activeAdvance && activeAdvance.status === 'ACTIVE') {
          await this.rentAdvanceRepo.update(
            activeAdvance.id,
            {
              status: 'OFFSET_AT_SETTLEMENT',
              amountRepaidKobo: activeAdvance.totalRepayableKobo,
              repaidAt: now,
            },
            tx,
          )
        }

        const breakoutTx = await this.rentVaultRepo.createTransaction(
          {
            vaultId: freshVault.id,
            userId,
            type: isFlexible ? 'BREAKOUT_PAYOUT' : 'LIQUIDATION_PENALTY',
            amountKobo: isFlexible ? netPayout : breakout.adminFeeKobo,
            principalDeltaKobo: -freshVault.currentPrincipalKobo,
            yieldDeltaKobo: -freshVault.accruedYieldKobo,
            balanceAfterKobo: 0n,
            reference: breakoutReference,
            channel: 'SYSTEM_YIELD',
            narration: isFlexible
              ? `Flexible savings withdrawal executed: 100% principal & accrued yield returned with ₦0 exit fee`
              : premiumRecoveryDeduction > 0n
                ? `Fair exit breakout executed: 7.0% base yield applied, 1.5% admin fee & unrecovered Rent Protec premium deducted`
                : `Fair exit breakout executed: 7.0% base yield applied, 1.5% admin fee deducted`,
            metadata: {
              lockMode: isFlexible ? 'FLEXIBLE' : 'LOCKED',
              recalculatedYieldKobo: Number(breakout.recalculatedYieldKobo),
              adminFeeKobo: Number(breakout.adminFeeKobo),
              advanceDeductionKobo: Number(advanceDeduction),
              premiumRecoveryDeductionKobo: Number(premiumRecoveryDeduction),
              netPayoutKobo: Number(netPayout),
              armSyncStatus:
                freshVault.investmentProvider && totalVaultBalance > 0n
                  ? 'QUEUED'
                  : 'NOT_APPLICABLE',
              ...(armTransactionId ? { armTransactionId } : {}),
            },
          },
          tx,
        )

        await this.rentVaultRepo.update(
          freshVault.id,
          {
            lockStatus: 'BROKEN_OUT',
            currentPrincipalKobo: 0n,
            accruedYieldKobo: 0n,
          },
          tx,
        )

        const freshBalance = freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo
        if (freshVault.investmentProvider && freshBalance > 0n && armTransactionId) {
          const createdJob = await tx.upward_arm_job.create({
            data: {
              idempotencyKey: `ARM_REDEEM__${breakoutReference}`,
              jobType: 'REDEEM',
              status: 'QUEUED',
              vaultId: freshVault.id,
              userId,
              transactionId: breakoutTx.id,
              amountKobo: freshBalance,
              reference: breakoutReference,
              armTransactionId,
              maxAttempts: 5,
              payload: {
                provider: freshVault.investmentProvider,
                membershipId: freshVault.providerMembershipId || 'OMNIBUS_MASTER',
                productCode: 'ARMMMF',
                productAccountNumber: freshVault.providerAccountNumber || 'OMNIBUS_FLOAT_01',
                amountKobo: freshBalance.toString(),
                armReference: `RED-${breakoutReference}`,
                reason: 'FAIR_EXIT_BREAKOUT',
              } as any,
            },
          })
          queuedArmJob = {
            id: createdJob.id,
            uuid: createdJob.uuid,
            idempotencyKey: createdJob.idempotencyKey,
            jobType: 'REDEEM',
          }
        }
      })

      if (queuedArmJob) {
        await this.armJobQueue.enqueueJob(queuedArmJob)
      }
    } else {
      if (activeAdvance && activeAdvance.status === 'ACTIVE') {
        await this.rentAdvanceRepo.update(activeAdvance.id, {
          status: 'OFFSET_AT_SETTLEMENT',
          amountRepaidKobo: activeAdvance.totalRepayableKobo,
          repaidAt: now,
        })
      }

      if (vault.investmentProvider && this.providerRegistry && totalVaultBalance > 0n) {
        try {
          const provider = this.providerRegistry.getProvider(vault.investmentProvider)
          const redeemRes = await provider.redeem({
            membershipId: vault.providerMembershipId || 'OMNIBUS_MASTER',
            productCode: 'ARMMMF',
            productAccountNumber: vault.providerAccountNumber || 'OMNIBUS_FLOAT_01',
            amountKobo: totalVaultBalance,
            reference: breakoutReference,
          })
          armWithdrawalId = redeemRes.withdrawalId
          armTransactionId = redeemRes.transactionId
          this.logger.log(
            `ARM early breakout redemption executed for vault ${vault.uuid}. WithdrawalId: ${armWithdrawalId}`,
          )
        } catch (redeemErr: any) {
          this.logger.warn(
            `ARM early breakout redemption queued against settlement float for vault ${vault.uuid}: ${redeemErr?.message}`,
          )
        }
      }

      await this.rentVaultRepo.createTransaction({
        vaultId: vault.id,
        userId,
        type: isFlexible ? 'BREAKOUT_PAYOUT' : 'LIQUIDATION_PENALTY',
        amountKobo: isFlexible ? netPayout : breakout.adminFeeKobo,
        principalDeltaKobo: -vault.currentPrincipalKobo,
        yieldDeltaKobo: -vault.accruedYieldKobo,
        balanceAfterKobo: 0n,
        reference: breakoutReference,
        channel: 'SYSTEM_YIELD',
        narration: isFlexible
          ? `Flexible savings withdrawal executed: 100% principal & accrued yield returned with ₦0 exit fee`
          : `Fair exit breakout executed: 7.0% base yield applied, 1.5% admin fee deducted`,
        metadata: {
          lockMode: isFlexible ? 'FLEXIBLE' : 'LOCKED',
          recalculatedYieldKobo: Number(breakout.recalculatedYieldKobo),
          adminFeeKobo: Number(breakout.adminFeeKobo),
          advanceDeductionKobo: Number(advanceDeduction),
          netPayoutKobo: Number(netPayout),
          ...(armWithdrawalId ? { armWithdrawalId } : {}),
          ...(armTransactionId ? { armTransactionId } : {}),
        },
      })

      await this.rentVaultRepo.update(vault.id, {
        lockStatus: 'BROKEN_OUT',
        currentPrincipalKobo: 0n,
        accruedYieldKobo: 0n,
        ...(armWithdrawalId ? { armWithdrawalId } : {}),
      })
    }

    // Record internal treasury early-exit premium recovery if applicable
    if (
      premiumRecoveryDeduction > 0n &&
      treasurySummary &&
      this.prisma?.upward_vault_treasury_summary &&
      this.prisma?.upward_savings_internal_ledger
    ) {
      const nextUnrecovered =
        treasurySummary.unrecoveredPremiumKobo > premiumRecoveryDeduction
          ? treasurySummary.unrecoveredPremiumKobo - premiumRecoveryDeduction
          : 0n
      await this.prisma.upward_vault_treasury_summary
        .update({
          where: { vaultId: vault.id },
          data: {
            premiumRecoveredKobo: { increment: premiumRecoveryDeduction },
            unrecoveredPremiumKobo: nextUnrecovered,
          },
        })
        .catch(() => {})
      await this.prisma.upward_savings_internal_ledger
        .create({
          data: {
            vaultId: vault.id,
            entryType: 'EARLY_EXIT_RECOVERY',
            productOption: vault.productOption || 'RENT_PROTEC',
            principalBaseKobo: vault.currentPrincipalKobo,
            premiumRecoveryAppliedKobo: premiumRecoveryDeduction,
            reference: `EXIT_REC_${breakoutReference}`,
            notes: `Recovered unrecovered upfront 2% Rent Protec premium on Fair Exit breakout`,
          },
        })
        .catch(() => {})
    }

    // Update savings score discipline penalty (-30 points) for LOCKED vaults only
    if (!isFlexible) {
      const currentScore = await this.rentVaultRepo.findSavingsScoreByVaultId(vault.id)
      const newScore = Math.max(0, (currentScore?.totalScore || 20) - 30)
      await this.rentVaultRepo.upsertSavingsScore(vault.id, userId, {
        loanDisciplinePoints: 0,
        totalScore: newScore,
        historyLog: [
          ...(currentScore?.historyLog || []),
          {
            reason: 'Fair exit breakout executed prior to maturity',
            delta: -30,
            timestamp: now.toISOString(),
          },
        ],
      })
    }

    return {
      status: 'success',
      data: {
        breakout_reference: breakoutReference,
        lock_mode: isFlexible ? 'FLEXIBLE' : 'LOCKED',
        original_principal_kobo: Number(vault.currentPrincipalKobo),
        forfeited_yield_kobo: isFlexible ? 0 : Number(vault.accruedYieldKobo),
        recalculated_base_yield_kobo: Number(breakout.recalculatedYieldKobo),
        admin_fee_kobo: Number(breakout.adminFeeKobo),
        advance_deduction_kobo: Number(advanceDeduction),
        premium_recovery_deduction_kobo: Number(premiumRecoveryDeduction),
        net_payout_kobo: Number(netPayout),
      },
    }
  }
}
