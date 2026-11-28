import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common'
import { IsOptional, IsString } from 'class-validator'
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

export class WithdrawMaturedRentVaultDto {
  @IsOptional()
  @IsString()
  reason?: string
}

/**
 * Matured Tenant Self-Withdrawal (T-30 / SETTLEMENT_READY):
 * Allows a tenant whose vault has reached the 30-day pre-rent unlock window
 * to withdraw 100% principal + 100% accrued yield with ₦0 exit fee and 0 score penalty
 * directly to their verified ARM KYC settlement bank account.
 *
 * Landlord cashback does NOT apply on self-withdrawal (reserved for direct landlord settlement).
 */
@Injectable()
export class WithdrawMaturedRentVaultUseCase {
  private readonly logger = new Logger(WithdrawMaturedRentVaultUseCase.name)

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

  async execute(userId: number, vaultUuid: string, dto?: WithdrawMaturedRentVaultDto) {
    const vault = await this.rentVaultRepo.findByUuid(vaultUuid)
    if (!vault) {
      throw new NotFoundException('Rent vault not found.')
    }
    if (vault.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rent vault.')
    }
    if (vault.lockStatus === 'SETTLED') {
      throw new BadRequestException('This vault has already been settled or withdrawn.')
    }
    if (vault.lockStatus === 'BROKEN_OUT') {
      throw new BadRequestException('This vault was previously broken out and closed.')
    }

    const now = new Date()
    const daysRemaining = RentSavingsCalculatorEngine.calculateDaysRemaining(
      vault.contractualDueDate,
      now,
    )

    if (daysRemaining > 30 && vault.lockStatus !== 'SETTLEMENT_READY') {
      throw new BadRequestException(
        `Your rent savings unlock 30 days before your rent due date (${vault.unlockDate.toISOString().split('T')[0]}). Use Early Withdrawal if you need funds sooner.`,
      )
    }

    const totalAccumulatedBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo
    if (totalAccumulatedBalance <= 0n) {
      throw new BadRequestException('Vault has zero balance to withdraw.')
    }

    // Require tenant's verified settlement bank account from ARM KYC (prevents unverified third-party payouts)
    const verifiedBank = this.prisma?.upward_user_bank_details?.findUnique
      ? await this.prisma.upward_user_bank_details.findUnique({ where: { userId } })
      : null

    if (!verifiedBank || !verifiedBank.accountNumber || !verifiedBank.bankCode) {
      throw new BadRequestException(
        'No verified personal bank account found on your profile. Please complete your investor KYC bank verification before withdrawing.',
      )
    }

    // ARM-Backed Principal Guard: subtract pending/failed SUBSCRIBE jobs so we never over-redeem ARM units
    let uninvestedArmKobo = 0n
    if (vault.investmentProvider === 'ARM' && this.prisma?.upward_arm_job?.findMany) {
      const pendingJobs = await this.prisma.upward_arm_job
        .findMany({
          where: {
            vaultId: vault.id,
            jobType: 'SUBSCRIBE',
            status: { in: ['QUEUED', 'PROCESSING', 'FAILED'] },
          },
          select: { amountKobo: true },
        })
        .catch(() => [])
      for (const j of pendingJobs) {
        if (j?.amountKobo && j.amountKobo > 0n) {
          uninvestedArmKobo += j.amountKobo
        }
      }
    }
    const armRedeemableBalanceKobo =
      totalAccumulatedBalance > uninvestedArmKobo
        ? totalAccumulatedBalance - uninvestedArmKobo
        : 0n

    // Offset any active emergency advance
    let netPayoutKobo = totalAccumulatedBalance
    const activeAdvance = await this.rentAdvanceRepo.findActiveByVaultId(vault.id)
    let advanceDeductionKobo = 0n
    if (activeAdvance && activeAdvance.status === 'ACTIVE') {
      const outstanding = activeAdvance.totalRepayableKobo - activeAdvance.amountRepaidKobo
      const penalties = activeAdvance.latePenaltiesKobo
      advanceDeductionKobo = outstanding + penalties
      netPayoutKobo =
        totalAccumulatedBalance > advanceDeductionKobo
          ? totalAccumulatedBalance - advanceDeductionKobo
          : 0n
    }

    // Under-funded Rent Protec Maturity Guardrail:
    // Recover any unrecovered upfront 2% insurance premium if spread didn't cover it by maturity.
    let premiumRecoveryDeductionKobo = 0n
    let treasurySummary: { unrecoveredPremiumKobo: bigint } | null = null
    if (
      vault.productOption === 'RENT_PROTEC' &&
      this.prisma?.upward_vault_treasury_summary
    ) {
      treasurySummary = await this.prisma.upward_vault_treasury_summary.findUnique({
        where: { vaultId: vault.id },
        select: { unrecoveredPremiumKobo: true },
      })
      if (treasurySummary && treasurySummary.unrecoveredPremiumKobo > 0n) {
        premiumRecoveryDeductionKobo =
          netPayoutKobo > treasurySummary.unrecoveredPremiumKobo
            ? treasurySummary.unrecoveredPremiumKobo
            : netPayoutKobo
        netPayoutKobo = netPayoutKobo - premiumRecoveryDeductionKobo
      }
    }

    const withdrawalReference = `UPW_MATURED_${Date.now()}`
    const willQueueArmRedeem = Boolean(vault.investmentProvider && armRedeemableBalanceKobo > 0n)
    const payoutStatus = willQueueArmRedeem ? 'PROCESSING_REDEMPTION' : 'DISBURSED'

    let armWithdrawalId: string | undefined
    let armTransactionId: string | undefined

    if (this.prisma && this.armJobQueue) {
      armTransactionId = willQueueArmRedeem ? crypto.randomUUID() : undefined
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
          throw new BadRequestException('This vault has already been settled or withdrawn.')
        }
        if (freshVault.lockStatus === 'BROKEN_OUT') {
          throw new BadRequestException('This vault was previously broken out and closed.')
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

        const withdrawalTx = await this.rentVaultRepo.createTransaction(
          {
            vaultId: freshVault.id,
            userId,
            type: 'BREAKOUT_PAYOUT',
            amountKobo: netPayoutKobo,
            principalDeltaKobo: -freshVault.currentPrincipalKobo,
            yieldDeltaKobo: -freshVault.accruedYieldKobo,
            balanceAfterKobo: 0n,
            reference: withdrawalReference,
            channel: 'NIP_TRANSFER',
            narration: `Matured rent savings withdrawn to ${verifiedBank.bankName} (••••${verifiedBank.accountNumber.slice(-4)})`,
            metadata: {
              withdrawalKind: 'MATURED_SELF_WITHDRAWAL',
              reason: dto?.reason || null,
              destinationBankCode: verifiedBank.bankCode,
              destinationBankName: verifiedBank.bankName,
              destinationAccountNumber: verifiedBank.accountNumber,
              destinationAccountName: verifiedBank.accountName,
              principalKobo: Number(freshVault.currentPrincipalKobo),
              accruedYieldKobo: Number(freshVault.accruedYieldKobo),
              advanceDeductionKobo: Number(advanceDeductionKobo),
              premiumRecoveryDeductionKobo: Number(premiumRecoveryDeductionKobo),
              netPayoutKobo: Number(netPayoutKobo),
              armRedeemAmountKobo: Number(armRedeemableBalanceKobo),
              uninvestedArmKobo: Number(uninvestedArmKobo),
              payoutStatus,
              armSyncStatus: willQueueArmRedeem ? 'QUEUED' : 'NOT_APPLICABLE',
              ...(armTransactionId ? { armTransactionId } : {}),
            },
          },
          tx,
        )

        // Track explicit outbound bank payout record on upward_wallet_transaction
        if (netPayoutKobo > 0n && tx.upward_wallet && tx.upward_wallet_transaction) {
          const userWallet = await tx.upward_wallet.upsert({
            where: { userId },
            create: { userId, balance: 0, isActive: true },
            update: { isActive: true },
          })
          const payoutRef = `PAYOUT_${withdrawalReference}`
          const existingPayout = await tx.upward_wallet_transaction.findUnique({
            where: { reference: payoutRef },
          })
          if (!existingPayout) {
            await tx.upward_wallet_transaction.create({
              data: {
                walletId: userWallet.id,
                userId,
                type: 'PAYOUT_TO_BANK',
                status: willQueueArmRedeem ? 'PENDING' : 'SUCCESS',
                amount: Number(netPayoutKobo) / 100,
                reference: payoutRef,
                narration: `Matured rent savings payout to ${verifiedBank.bankName} (••••${verifiedBank.accountNumber.slice(-4)})`,
                metadata: {
                  fundingType: 'PAYOUT_TO_BANK',
                  holdingLocation: 'USER_BANK',
                  routingTarget: 'USER_BANK_PAYOUT',
                  routingStatus: willQueueArmRedeem ? 'HELD' : 'ROUTED',
                  dvaAccountNumber: freshVault.dvaAccountNumber || null,
                  sourceVaultId: freshVault.id,
                  sourceReference: withdrawalReference,
                  destinationBank: {
                    bankCode: verifiedBank.bankCode,
                    bankName: verifiedBank.bankName,
                    accountNumber: verifiedBank.accountNumber,
                    accountName: verifiedBank.accountName,
                  },
                } as any,
              },
            })
          }
        }

        await this.rentVaultRepo.update(
          freshVault.id,
          {
            lockStatus: 'SETTLED',
            currentPrincipalKobo: 0n,
            accruedYieldKobo: 0n,
          },
          tx,
        )

        // Advance active rental cycle by +1 year so clicking "Start Next Rent Savings Plan"
        // pre-fills next year's due date cleanly instead of a date 15 days away.
        if (tx.upward_user_property) {
          const activeProp = await tx.upward_user_property
            .findFirst({
              where: { userId, isPastTenancy: false },
              orderBy: { createdAt: 'desc' },
            })
            .catch(() => null)
          if (activeProp?.rentEndDate) {
            const prevEnd = new Date(activeProp.rentEndDate)
            const nextEnd = new Date(prevEnd)
            nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1)
            await tx.upward_user_property
              .update({
                where: { id: activeProp.id },
                data: {
                  rentStartDate: prevEnd,
                  rentEndDate: nextEnd,
                  amountPaid: 0,
                  amountRemaining: activeProp.rentAmount,
                },
              })
              .catch(() => {})
          }
        }

        const freshBalance = freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo
        const freshArmRedeemKobo =
          freshBalance > uninvestedArmKobo ? freshBalance - uninvestedArmKobo : 0n
        if (freshVault.investmentProvider && freshArmRedeemKobo > 0n && armTransactionId) {
          const createdJob = await tx.upward_arm_job.create({
            data: {
              idempotencyKey: `ARM_REDEEM__${withdrawalReference}`,
              jobType: 'REDEEM',
              status: 'QUEUED',
              vaultId: freshVault.id,
              userId,
              transactionId: withdrawalTx.id,
              amountKobo: freshArmRedeemKobo,
              reference: withdrawalReference,
              armTransactionId,
              maxAttempts: 5,
              payload: {
                provider: freshVault.investmentProvider,
                membershipId: freshVault.providerMembershipId || 'OMNIBUS_MASTER',
                productCode: 'ARMMMF',
                productAccountNumber: freshVault.providerAccountNumber || 'OMNIBUS_FLOAT_01',
                amountKobo: freshArmRedeemKobo.toString(),
                armReference: `RED-${withdrawalReference}`,
                reason: 'MATURED_SELF_WITHDRAWAL',
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

      if (vault.investmentProvider && this.providerRegistry && armRedeemableBalanceKobo > 0n) {
        try {
          const provider = this.providerRegistry.getProvider(vault.investmentProvider)
          const redeemRes = await provider.redeem({
            membershipId: vault.providerMembershipId || 'OMNIBUS_MASTER',
            productCode: 'ARMMMF',
            productAccountNumber: vault.providerAccountNumber || 'OMNIBUS_FLOAT_01',
            amountKobo: armRedeemableBalanceKobo,
            reference: withdrawalReference,
          })
          armWithdrawalId = redeemRes.withdrawalId
          armTransactionId = redeemRes.transactionId
        } catch (redeemErr: any) {
          this.logger.warn(
            `ARM matured self-withdrawal redemption fell back to float for vault ${vault.uuid}: ${redeemErr?.message}`,
          )
        }
      }

      await this.rentVaultRepo.createTransaction({
        vaultId: vault.id,
        userId,
        type: 'BREAKOUT_PAYOUT',
        amountKobo: netPayoutKobo,
        principalDeltaKobo: -vault.currentPrincipalKobo,
        yieldDeltaKobo: -vault.accruedYieldKobo,
        balanceAfterKobo: 0n,
        reference: withdrawalReference,
        channel: 'NIP_TRANSFER',
        narration: `Matured rent savings withdrawn to ${verifiedBank.bankName} (••••${verifiedBank.accountNumber.slice(-4)})`,
        metadata: {
          withdrawalKind: 'MATURED_SELF_WITHDRAWAL',
          reason: dto?.reason || null,
          destinationBankCode: verifiedBank.bankCode,
          destinationBankName: verifiedBank.bankName,
          destinationAccountNumber: verifiedBank.accountNumber,
          destinationAccountName: verifiedBank.accountName,
          principalKobo: Number(vault.currentPrincipalKobo),
          accruedYieldKobo: Number(vault.accruedYieldKobo),
          advanceDeductionKobo: Number(advanceDeductionKobo),
          premiumRecoveryDeductionKobo: Number(premiumRecoveryDeductionKobo),
          netPayoutKobo: Number(netPayoutKobo),
          armRedeemAmountKobo: Number(armRedeemableBalanceKobo),
          uninvestedArmKobo: Number(uninvestedArmKobo),
          payoutStatus,
          ...(armWithdrawalId ? { armWithdrawalId } : {}),
          ...(armTransactionId ? { armTransactionId } : {}),
        },
      })

      await this.rentVaultRepo.update(vault.id, {
        lockStatus: 'SETTLED',
        currentPrincipalKobo: 0n,
        accruedYieldKobo: 0n,
        ...(armWithdrawalId ? { armWithdrawalId } : {}),
      })
    }

    // Record internal treasury recovery if under-funded Rent Protec premium was offset
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
            entryType: 'MATURITY_RECOVERY',
            productOption: vault.productOption || 'RENT_PROTEC',
            principalBaseKobo: vault.currentPrincipalKobo,
            premiumRecoveryAppliedKobo: premiumRecoveryDeductionKobo,
            reference: `MAT_WD_REC_${withdrawalReference}`,
            notes: `Recovered unrecovered upfront 2% Rent Protec premium on matured self-withdrawal`,
          },
        })
        .catch(() => {})
    }

    return {
      status: 'success',
      data: {
        withdrawal_reference: withdrawalReference,
        principal_kobo: Number(vault.currentPrincipalKobo),
        accrued_yield_kobo: Number(vault.accruedYieldKobo),
        advance_deduction_kobo: Number(advanceDeductionKobo),
        premium_recovery_deduction_kobo: Number(premiumRecoveryDeductionKobo),
        net_payout_kobo: Number(netPayoutKobo),
        arm_redemption_kobo: Number(armRedeemableBalanceKobo),
        destination_bank_code: verifiedBank.bankCode,
        destination_bank_name: verifiedBank.bankName,
        destination_account_number: verifiedBank.accountNumber,
        destination_account_name: verifiedBank.accountName,
        payout_status: payoutStatus,
        estimated_settlement_window: willQueueArmRedeem
          ? 'Within 24 hours (ARM MMF redemption)'
          : 'Instant',
      },
    }
  }
}
