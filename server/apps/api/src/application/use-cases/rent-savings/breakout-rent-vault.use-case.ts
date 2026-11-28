import { Injectable, Inject, BadRequestException, Logger, Optional } from '@nestjs/common'
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
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { computeEarlyBreakoutQuote } from './breakout-quote.helper'

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
    const now = new Date()
    const quote = await computeEarlyBreakoutQuote({
      userId,
      vaultUuid,
      now,
      rentVaultRepo: this.rentVaultRepo,
      rentAdvanceRepo: this.rentAdvanceRepo,
      prisma: this.prisma,
    })

    const {
      vault,
      tier,
      isFlexible,
      isFullLock,
      isRentProtec,
      recalculatedYieldKobo,
      recalculationAnnualRatePct,
      adminFeeRatePct,
      adminFeeKobo,
      advanceDeductionKobo,
      activeAdvance,
      premiumRecoveryDeductionKobo,
      treasurySummary,
      netPayoutKobo,
      depositCount,
      weightedDaysHeld,
      scorePenaltyPoints,
      payoutBank,
    } = quote

    const breakoutReference = `UPW_BREAKOUT_${Date.now()}`
    const totalVaultBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo

    const txType = isRentProtec ? 'LIQUIDATION_PENALTY' : 'BREAKOUT_PAYOUT'
    const txAmount = isRentProtec ? adminFeeKobo : netPayoutKobo
    const narration = isFlexible
      ? `Flexible savings withdrawal executed: 100% principal & accrued yield returned with ₦0 exit fee`
      : isFullLock
        ? `Early Full Lock withdrawal executed: ${recalculationAnnualRatePct.toFixed(1)}% p.a. per-deposit yield applied, ₦0 admin fee`
        : premiumRecoveryDeductionKobo > 0n
          ? `Fair exit breakout executed: ${recalculationAnnualRatePct.toFixed(1)}% per-deposit base yield applied, ${adminFeeRatePct.toFixed(1)}% admin fee & unrecovered Rent Protec premium deducted`
          : `Fair exit breakout executed: ${recalculationAnnualRatePct.toFixed(1)}% per-deposit base yield applied, ${adminFeeRatePct.toFixed(1)}% admin fee deducted`

    // Liquidate underlying MMF units via BullMQ durable outbox job (or direct fallback in tests)
    let armWithdrawalId: string | undefined
    let armTransactionId: string | undefined

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
            type: txType,
            amountKobo: txAmount,
            principalDeltaKobo: -freshVault.currentPrincipalKobo,
            yieldDeltaKobo: -freshVault.accruedYieldKobo,
            balanceAfterKobo: 0n,
            reference: breakoutReference,
            channel: 'SYSTEM_YIELD',
            narration,
            metadata: {
              tier,
              lockMode: isFlexible ? 'FLEXIBLE' : 'LOCKED',
              recalculationRatePct: recalculationAnnualRatePct,
              adminFeeRatePct,
              recalculatedYieldKobo: Number(recalculatedYieldKobo),
              adminFeeKobo: Number(adminFeeKobo),
              advanceDeductionKobo: Number(advanceDeductionKobo),
              premiumRecoveryDeductionKobo: Number(premiumRecoveryDeductionKobo),
              netPayoutKobo: Number(netPayoutKobo),
              depositCount,
              weightedDaysHeld,
              ...(payoutBank ? { payoutBank } : {}),
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
                reason: isFullLock
                  ? 'FULL_LOCK_EARLY_WITHDRAWAL'
                  : isFlexible
                    ? 'FLEXIBLE_WITHDRAWAL'
                    : 'FAIR_EXIT_BREAKOUT',
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
        type: txType,
        amountKobo: txAmount,
        principalDeltaKobo: -vault.currentPrincipalKobo,
        yieldDeltaKobo: -vault.accruedYieldKobo,
        balanceAfterKobo: 0n,
        reference: breakoutReference,
        channel: 'SYSTEM_YIELD',
        narration,
        metadata: {
          tier,
          lockMode: isFlexible ? 'FLEXIBLE' : 'LOCKED',
          recalculationRatePct: recalculationAnnualRatePct,
          adminFeeRatePct,
          recalculatedYieldKobo: Number(recalculatedYieldKobo),
          adminFeeKobo: Number(adminFeeKobo),
          advanceDeductionKobo: Number(advanceDeductionKobo),
          premiumRecoveryDeductionKobo: Number(premiumRecoveryDeductionKobo),
          netPayoutKobo: Number(netPayoutKobo),
          depositCount,
          weightedDaysHeld,
          ...(payoutBank ? { payoutBank } : {}),
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
      premiumRecoveryDeductionKobo > 0n &&
      treasurySummary &&
      this.prisma?.upward_vault_treasury_summary &&
      this.prisma?.upward_savings_internal_ledger
    ) {
      const nextUnrecovered =
        treasurySummary.unrecoveredPremiumKobo > premiumRecoveryDeductionKobo
          ? treasurySummary.unrecoveredPremiumKobo - premiumRecoveryDeductionKobo
          : 0n
      await this.prisma.upward_vault_treasury_summary
        .update({
          where: { vaultId: vault.id },
          data: {
            premiumRecoveredKobo: { increment: premiumRecoveryDeductionKobo },
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
            premiumRecoveryAppliedKobo: premiumRecoveryDeductionKobo,
            reference: `EXIT_REC_${breakoutReference}`,
            notes: `Recovered unrecovered upfront 2% Rent Protec premium on Fair Exit breakout`,
          },
        })
        .catch(() => {})
    }

    // Update savings score discipline penalty (-30 points) for LOCKED vaults only
    if (!isFlexible) {
      const currentScore = await this.rentVaultRepo.findSavingsScoreByVaultId(vault.id)
      const newScore = Math.max(0, (currentScore?.totalScore || 20) - scorePenaltyPoints)
      await this.rentVaultRepo.upsertSavingsScore(vault.id, userId, {
        loanDisciplinePoints: 0,
        totalScore: newScore,
        historyLog: [
          ...(currentScore?.historyLog || []),
          {
            reason: isFullLock
              ? 'Full Lock early withdrawal executed prior to maturity'
              : 'Fair exit breakout executed prior to maturity',
            delta: -scorePenaltyPoints,
            timestamp: now.toISOString(),
          },
        ],
      })
    }

    return {
      status: 'success',
      data: {
        breakout_reference: breakoutReference,
        tier,
        lock_mode: isFlexible ? 'FLEXIBLE' : 'LOCKED',
        original_principal_kobo: Number(vault.currentPrincipalKobo),
        forfeited_yield_kobo: isFlexible ? 0 : Number(vault.accruedYieldKobo),
        recalculated_base_yield_kobo: Number(recalculatedYieldKobo),
        recalculation_rate_pct: recalculationAnnualRatePct,
        admin_fee_rate_pct: adminFeeRatePct,
        admin_fee_kobo: Number(adminFeeKobo),
        advance_deduction_kobo: Number(advanceDeductionKobo),
        premium_recovery_deduction_kobo: Number(premiumRecoveryDeductionKobo),
        net_payout_kobo: Number(netPayoutKobo),
        deposit_count: depositCount,
        weighted_days_held: weightedDaysHeld,
        score_penalty_points: scorePenaltyPoints,
        payout_destination: payoutBank
          ? {
              bank_code: payoutBank.bankCode,
              bank_name: payoutBank.bankName,
              account_number: payoutBank.accountNumber,
              account_name: payoutBank.accountName,
            }
          : null,
      },
    }
  }
}
