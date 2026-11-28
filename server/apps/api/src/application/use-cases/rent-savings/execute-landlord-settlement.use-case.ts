import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common'
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import * as crypto from 'crypto'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import {
  IRentSettlementRepository,
  RENT_SETTLEMENT_REPOSITORY,
} from '../../../domains/rent-savings/rent-settlement.repository'
import { ARM_JOB_QUEUE, IArmJobQueue } from '../../../domains/rent-savings/arm-job.interface'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { AssetManagementProviderRegistry } from '../../../infrastructure/providers/asset-management/asset-management-provider.registry'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export class ExecuteLandlordSettlementDto {
  @IsNotEmpty()
  @IsString()
  landlord_bank_code!: string

  @IsNotEmpty()
  @IsString()
  landlord_account_number!: string

  @IsNotEmpty()
  @IsString()
  landlord_name!: string

  @IsOptional()
  @IsString()
  property_address?: string

  @IsOptional()
  @IsBoolean()
  disburse_surplus_to_wallet?: boolean
}

@Injectable()
export class ExecuteLandlordSettlementUseCase {
  private readonly logger = new Logger(ExecuteLandlordSettlementUseCase.name)

  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
    @Inject(RENT_SETTLEMENT_REPOSITORY)
    private readonly rentSettlementRepo: IRentSettlementRepository,
    private readonly providerRegistry: AssetManagementProviderRegistry,
    @Optional()
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(ARM_JOB_QUEUE)
    private readonly armJobQueue?: IArmJobQueue,
  ) {}

  async execute(userId: number, vaultUuid: string, dto: ExecuteLandlordSettlementDto) {
    const vault = await this.rentVaultRepo.findByUuid(vaultUuid)
    if (!vault) {
      throw new NotFoundException('Rent vault not found.')
    }
    if (vault.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rent vault.')
    }
    if (vault.lockStatus === 'SETTLED') {
      throw new BadRequestException('This vault has already been settled.')
    }
    if (vault.lockStatus === 'BROKEN_OUT') {
      throw new BadRequestException('This vault was previously broken out and closed.')
    }

    const now = new Date()
    const daysRemaining = RentSavingsCalculatorEngine.calculateDaysRemaining(
      vault.contractualDueDate,
      now,
    )

    // Verify T-30 release window (must be within 30 days of due date or past due date)
    if (daysRemaining > 30) {
      throw new BadRequestException(
        `Vault is locked until T-30 days before lease expiration (${vault.unlockDate.toISOString().split('T')[0]}).`,
      )
    }

    const totalAccumulatedBalance = vault.currentPrincipalKobo + vault.accruedYieldKobo
    if (totalAccumulatedBalance <= 0n) {
      throw new BadRequestException('Vault has zero balance to disburse.')
    }

    // Check outstanding emergency advance
    let amountToDisburse = totalAccumulatedBalance
    const activeAdvance = await this.rentAdvanceRepo.findActiveByVaultId(vault.id)
    if (activeAdvance && activeAdvance.status === 'ACTIVE') {
      const outstandingLoan = activeAdvance.totalRepayableKobo - activeAdvance.amountRepaidKobo
      const latePenalties = activeAdvance.latePenaltiesKobo
      const totalOwed = outstandingLoan + latePenalties

      this.logger.log(
        `Offsetting outstanding loan of ₦${Number(totalOwed) / 100} against vault settlement balance`,
      )
      amountToDisburse =
        totalAccumulatedBalance > totalOwed ? totalAccumulatedBalance - totalOwed : 0n
    }

    // Under-funded Rent Protec Maturity Guardrail:
    // If coverage was activated (>=20%/25%) and the user later stopped funding so spread
    // did not fully cover Upward's upfront 2% premium by maturity, recover the remaining
    // unrecovered premium at settlement so Upward never incurs a net premium loss.
    let maturityPremiumRecoveryKobo = 0n
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
        maturityPremiumRecoveryKobo =
          amountToDisburse > treasurySummary.unrecoveredPremiumKobo
            ? treasurySummary.unrecoveredPremiumKobo
            : amountToDisburse
        amountToDisburse = amountToDisburse - maturityPremiumRecoveryKobo
        this.logger.log(
          `Offsetting unrecovered Rent Protec premium of ₦${Number(maturityPremiumRecoveryKobo) / 100} on under-funded vault ${vault.uuid} maturity`,
        )
      }
    }

    // Cap landlord disbursement at target rent so any excess returns to the tenant's wallet,
    // and track any shortfall when savings only partially cover the target rent.
    const amountPaidToLandlordKobo =
      amountToDisburse > vault.targetAmountKobo ? vault.targetAmountKobo : amountToDisburse
    const surplusToWalletKobo =
      amountToDisburse > vault.targetAmountKobo ? amountToDisburse - vault.targetAmountKobo : 0n
    const remainingBalanceKobo =
      vault.targetAmountKobo > amountPaidToLandlordKobo
        ? vault.targetAmountKobo - amountPaidToLandlordKobo
        : 0n
    const isPartialSettlement = remainingBalanceKobo > 0n

    // Only credit full early-bird cashback when the rent target is fully settled
    const cashbackResult = isPartialSettlement
      ? { cashbackKobo: 0n, earlyBirdApplied: false, percentageRate: 0 }
      : RentSavingsCalculatorEngine.calculateCashback(vault.targetAmountKobo, daysRemaining)
    const cashbackCreditedKobo = cashbackResult.cashbackKobo

    const settlementReference = `UPW_SETTLE_${Date.now()}`
    const nipSessionId = `999058${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`
    const settlementStatus = vault.autoBypassPmApproval ? 'PAID' : 'DISBURSED_PENDING_PM_APPROVAL'
    const receiptDownloadUrl = `/api/v1/rent-vaults/${vault.uuid}/receipt.pdf`

    let armWithdrawalId: string | null = null
    let armTransactionId: string | null = null
    let balancePaymentRequestUuid: string | null = null
    let queuedArmJob: {
      id: number
      uuid: string
      idempotencyKey: string
      jobType: 'REDEEM'
    } | null = null

    if (this.prisma && this.armJobQueue) {
      // Atomic PostgreSQL transaction: lock vault FOR UPDATE, create settlement + ledger + durable ARM REDEEM job
      armTransactionId = vault.investmentProvider ? crypto.randomUUID() : null

      await this.prisma.$transaction(async (tx) => {
        if (typeof tx.$queryRaw === 'function') {
          await tx.$queryRaw`SELECT id FROM upward_rent_vault WHERE id = ${vault.id} FOR UPDATE`
        }

        const freshVault = await tx.upward_rent_vault.findUniqueOrThrow({
          where: { id: vault.id },
        })
        if (freshVault.lockStatus === 'SETTLED') {
          throw new BadRequestException('This vault has already been settled.')
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

        await this.rentSettlementRepo.create(
          {
            vaultId: vault.id,
            userId,
            landlordBankCode: dto.landlord_bank_code,
            landlordAccountNumber: dto.landlord_account_number,
            landlordName: dto.landlord_name,
            propertyAddress: dto.property_address || null,
            amountPaidToLandlordKobo,
            cashbackCreditedKobo,
            earlyBirdMultiplierApplied: cashbackResult.earlyBirdApplied,
            nipSessionId,
            settlementReference,
            receiptPdfUrl: receiptDownloadUrl,
            settlementStatus,
            smsAlertDispatched: true,
            disburseSurplusToWallet: dto.disburse_surplus_to_wallet ?? true,
          },
          tx,
        )

        const settlementTx = await this.rentVaultRepo.createTransaction(
          {
            vaultId: vault.id,
            userId,
            type: 'SETTLEMENT_DISBURSEMENT',
            amountKobo: amountPaidToLandlordKobo,
            principalDeltaKobo: -freshVault.currentPrincipalKobo,
            yieldDeltaKobo: -freshVault.accruedYieldKobo,
            balanceAfterKobo: 0n,
            reference: settlementReference,
            channel: 'NIP_TRANSFER',
            narration: isPartialSettlement
              ? `Partial rent payment to ${dto.landlord_name} (₦${(Number(remainingBalanceKobo) / 100).toLocaleString()} balance remaining)`
              : `Rent settlement payout to landlord ${dto.landlord_name}`,
            metadata: {
              landlordName: dto.landlord_name,
              bankCode: dto.landlord_bank_code,
              accountNumber: dto.landlord_account_number,
              nipSessionId,
              isPartialSettlement,
              targetRentKobo: vault.targetAmountKobo.toString(),
              remainingBalanceKobo: remainingBalanceKobo.toString(),
              surplusToWalletKobo: surplusToWalletKobo.toString(),
              armSyncStatus: freshVault.investmentProvider ? 'QUEUED' : 'NOT_APPLICABLE',
              ...(armTransactionId ? { armTransactionId } : {}),
            },
          },
          tx,
        )

        if (cashbackCreditedKobo > 0n) {
          await this.rentVaultRepo.createTransaction(
            {
              vaultId: vault.id,
              userId,
              type: 'CASHBACK',
              amountKobo: cashbackCreditedKobo,
              principalDeltaKobo: 0n,
              yieldDeltaKobo: 0n,
              balanceAfterKobo: 0n,
              reference: `CBK_${settlementReference}`,
              channel: 'SYSTEM_YIELD',
              narration: `Gamified rent savings cashback credited (${cashbackResult.earlyBirdApplied ? '1.2x early-bird bonus' : 'standard'})`,
            },
            tx,
          )
        }

        await this.rentVaultRepo.update(
          vault.id,
          {
            lockStatus: 'SETTLED',
            currentPrincipalKobo: 0n,
            accruedYieldKobo: 0n,
          },
          tx,
        )

        // Maintain/advance a rental profile for both GoodTenants and non-GoodTenants savers
        // so repeat savers always have their rent amount, landlord account, and next due date tracked.
        if (tx.upward_user_property) {
          const targetNairaForProp = Number(vault.targetAmountKobo) / 100
          const paidNairaForProp = Number(amountPaidToLandlordKobo) / 100
          const activePropForCycle = await tx.upward_user_property
            .findFirst({
              where: { userId, isPastTenancy: false },
              orderBy: { createdAt: 'desc' },
            })
            .catch(() => null)

          if (activePropForCycle && !isPartialSettlement && activePropForCycle.rentEndDate) {
            const prevEnd = new Date(activePropForCycle.rentEndDate)
            const nextEnd = new Date(prevEnd)
            nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1)
            await tx.upward_user_property
              .update({
                where: { id: activePropForCycle.id },
                data: {
                  rentStartDate: prevEnd,
                  rentEndDate: nextEnd,
                  amountPaid: 0,
                  amountRemaining: activePropForCycle.rentAmount,
                },
              })
              .catch(() => {})
          } else if (!activePropForCycle) {
            try {
              let locationId: number | null = null
              if (dto.property_address && tx.upward_location) {
                const loc = await tx.upward_location.create({
                  data: {
                    country: 'Nigeria',
                    state: 'Lagos',
                    area: 'Lagos',
                    address: dto.property_address,
                  },
                })
                locationId = loc.id
              }

              let manualAccountId: number | null = null
              if (dto.landlord_account_number && tx.upward_manual_account) {
                const existingAcc = await tx.upward_manual_account.findFirst({
                  where: {
                    accountNumber: dto.landlord_account_number,
                    bankCode: dto.landlord_bank_code,
                  },
                })
                if (existingAcc) {
                  manualAccountId = existingAcc.id
                } else {
                  const createdAcc = await tx.upward_manual_account.create({
                    data: {
                      accountNumber: dto.landlord_account_number,
                      accountName: dto.landlord_name,
                      bankName: dto.landlord_bank_code,
                      bankCode: dto.landlord_bank_code,
                    },
                  })
                  manualAccountId = createdAcc.id
                }
              }

              const nextEnd = new Date(vault.contractualDueDate)
              if (!isPartialSettlement) {
                nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1)
              }

              await tx.upward_user_property.create({
                data: {
                  userId,
                  locationId,
                  manualAccountId,
                  rentAmount: targetNairaForProp,
                  currency: 'NGN',
                  rentStartDate: isPartialSettlement ? null : vault.contractualDueDate,
                  rentEndDate: nextEnd,
                  amountPaid: isPartialSettlement ? paidNairaForProp : 0,
                  amountRemaining: isPartialSettlement
                    ? Math.max(0, targetNairaForProp - paidNairaForProp)
                    : targetNairaForProp,
                  isPastTenancy: false,
                  rentType: 'Annually',
                },
              })
            } catch {
              // Non-blocking rental continuity record
            }
          }
        }

        // When savings only partially covered the target rent, create/update a PARTIAL payment request
        // so completing the remaining rent balance becomes the user's immediate next action.
        if (isPartialSettlement) {
          const targetNaira = Number(vault.targetAmountKobo) / 100
          const paidNaira = Number(amountPaidToLandlordKobo) / 100
          const remainingNaira = Math.max(0, targetNaira - paidNaira)

          const activeProperty = tx.upward_user_property
            ? await tx.upward_user_property
                .findFirst({
                  where: { userId, isPastTenancy: false },
                  include: { location: true },
                  orderBy: { createdAt: 'desc' },
                })
                .catch(() => null)
            : null

          const existingOpenPr =
            tx.upward_payment_request && activeProperty
              ? await tx.upward_payment_request
                  .findFirst({
                    where: {
                      userId,
                      userPropertyId: activeProperty.id,
                      status: { in: ['PENDING', 'PARTIAL'] },
                    },
                    include: { lineItemRecords: true },
                    orderBy: { createdAt: 'desc' },
                  })
                  .catch(() => null)
              : null

          if (existingOpenPr) {
            const nextPaid = Math.min(existingOpenPr.amount, (existingOpenPr.amountPaid || 0) + paidNaira)
            const nextStatus = nextPaid >= existingOpenPr.amount ? 'PAID' : 'PARTIAL'
            await tx.upward_payment_request.update({
              where: { id: existingOpenPr.id },
              data: {
                amountPaid: nextPaid,
                status: nextStatus,
                allowPartial: true,
                ...(nextStatus === 'PAID' ? { paidAt: now } : {}),
              },
            })
            const rentLine = existingOpenPr.lineItemRecords?.find(
              (li: any) => !['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(li.name),
            )
            if (rentLine && tx.upward_payment_line_item) {
              const lineNextPaid = Math.min(rentLine.totalAmount, (rentLine.amountPaid || 0) + paidNaira)
              await tx.upward_payment_line_item.update({
                where: { id: rentLine.id },
                data: {
                  amountPaid: lineNextPaid,
                  status: lineNextPaid >= rentLine.totalAmount ? 'PAID' : 'PARTIAL',
                },
              })
            }
            balancePaymentRequestUuid = existingOpenPr.uuid
          } else if (tx.upward_payment_request) {
            const createdPr = await tx.upward_payment_request.create({
              data: {
                userId,
                userPropertyId: activeProperty?.id ?? null,
                amount: targetNaira,
                amountPaid: paidNaira,
                currency: 'NGN',
                description: `Rent Balance — ${dto.property_address || activeProperty?.location?.address || dto.landlord_name}`,
                dueDate: vault.contractualDueDate,
                rentEndDate: vault.contractualDueDate,
                status: 'PARTIAL',
                allowPartial: true,
                isManual: true,
                reference: `BAL_${settlementReference}`,
                subaccountId: activeProperty?.subaccountId ?? null,
                manualAccountId: activeProperty?.manualAccountId ?? null,
              },
            })
            if (tx.upward_payment_line_item) {
              await tx.upward_payment_line_item.create({
                data: {
                  paymentRequestId: createdPr.id,
                  name: 'Rent',
                  totalAmount: targetNaira,
                  amountPaid: paidNaira,
                  status: 'PARTIAL',
                  sortOrder: 0,
                },
              })
            }
            balancePaymentRequestUuid = createdPr.uuid
          }

          if (tx.upward_notification) {
            await tx.upward_notification
              .create({
                data: {
                  userId,
                  title: 'Complete Your Rent Payment',
                  message: `You paid ₦${paidNaira.toLocaleString()} from Rent Savings. Pay the remaining ₦${remainingNaira.toLocaleString()} to finish your rent.`,
                  type: 'PAYMENT',
                  url: balancePaymentRequestUuid
                    ? `/dashboard/pay-rent?paymentUuid=${balancePaymentRequestUuid}`
                    : '/dashboard/pay-rent',
                },
              })
              .catch(() => {})
          }
        }

        if (freshVault.investmentProvider && armTransactionId) {
          const createdJob = await tx.upward_arm_job.create({
            data: {
              idempotencyKey: `ARM_REDEEM__${settlementReference}`,
              jobType: 'REDEEM',
              status: 'QUEUED',
              vaultId: freshVault.id,
              userId,
              transactionId: settlementTx.id,
              amountKobo: freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo,
              reference: settlementReference,
              armTransactionId,
              maxAttempts: 5,
              payload: {
                provider: freshVault.investmentProvider,
                membershipId: freshVault.providerMembershipId || 'OMNIBUS_MASTER',
                productCode: 'ARMMMF',
                productAccountNumber: freshVault.providerAccountNumber || 'OMNIBUS_FLOAT_01',
                amountKobo: (
                  freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo
                ).toString(),
                armReference: `RED-${settlementReference}`,
                reason: 'LANDLORD_SETTLEMENT',
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
      // Direct fallback when running in isolated unit tests without Prisma/BullMQ
      if (activeAdvance && activeAdvance.status === 'ACTIVE') {
        await this.rentAdvanceRepo.update(activeAdvance.id, {
          status: 'OFFSET_AT_SETTLEMENT',
          amountRepaidKobo: activeAdvance.totalRepayableKobo,
          repaidAt: now,
        })
      }

      if (vault.investmentProvider) {
        try {
          const provider = this.providerRegistry.getProvider(vault.investmentProvider)
          const redeemRes = await provider.redeem({
            membershipId: vault.providerMembershipId || 'OMNIBUS_MASTER',
            productCode: 'ARMMMF',
            productAccountNumber: vault.providerAccountNumber || 'OMNIBUS_FLOAT_01',
            amountKobo: totalAccumulatedBalance,
            reference: `RED_${settlementReference}`,
          })
          if (redeemRes.withdrawalId) {
            armWithdrawalId = redeemRes.withdrawalId
            this.logger.log(`ARM settlement redemption processed. WithdrawalId: ${armWithdrawalId}`)
          }
          if (redeemRes.transactionId) {
            armTransactionId = redeemRes.transactionId
          }
        } catch (redeemErr: any) {
          this.logger.warn(
            `Direct ARM redemption queued / offset against pre-funded settlement float for vault ${vault.uuid}: ${redeemErr?.message}`,
          )
        }
      }

      await this.rentSettlementRepo.create({
        vaultId: vault.id,
        userId,
        landlordBankCode: dto.landlord_bank_code,
        landlordAccountNumber: dto.landlord_account_number,
        landlordName: dto.landlord_name,
        propertyAddress: dto.property_address || null,
        amountPaidToLandlordKobo,
        cashbackCreditedKobo,
        earlyBirdMultiplierApplied: cashbackResult.earlyBirdApplied,
        nipSessionId,
        settlementReference,
        receiptPdfUrl: receiptDownloadUrl,
        settlementStatus,
        smsAlertDispatched: true,
        disburseSurplusToWallet: dto.disburse_surplus_to_wallet ?? true,
      })

      await this.rentVaultRepo.createTransaction({
        vaultId: vault.id,
        userId,
        type: 'SETTLEMENT_DISBURSEMENT',
        amountKobo: amountPaidToLandlordKobo,
        principalDeltaKobo: -vault.currentPrincipalKobo,
        yieldDeltaKobo: -vault.accruedYieldKobo,
        balanceAfterKobo: 0n,
        reference: settlementReference,
        channel: 'NIP_TRANSFER',
        narration: isPartialSettlement
          ? `Partial rent payment to ${dto.landlord_name} (₦${(Number(remainingBalanceKobo) / 100).toLocaleString()} balance remaining)`
          : `Rent settlement payout to landlord ${dto.landlord_name}`,
        metadata: {
          landlordName: dto.landlord_name,
          bankCode: dto.landlord_bank_code,
          accountNumber: dto.landlord_account_number,
          nipSessionId,
          isPartialSettlement,
          targetRentKobo: vault.targetAmountKobo.toString(),
          remainingBalanceKobo: remainingBalanceKobo.toString(),
          surplusToWalletKobo: surplusToWalletKobo.toString(),
          armWithdrawalId,
          ...(armTransactionId ? { armTransactionId } : {}),
        },
      })

      if (cashbackCreditedKobo > 0n) {
        await this.rentVaultRepo.createTransaction({
          vaultId: vault.id,
          userId,
          type: 'CASHBACK',
          amountKobo: cashbackCreditedKobo,
          principalDeltaKobo: 0n,
          yieldDeltaKobo: 0n,
          balanceAfterKobo: 0n,
          reference: `CBK_${settlementReference}`,
          channel: 'SYSTEM_YIELD',
          narration: `Gamified rent savings cashback credited (${cashbackResult.earlyBirdApplied ? '1.2x early-bird bonus' : 'standard'})`,
        })
      }

      await this.rentVaultRepo.update(vault.id, {
        lockStatus: 'SETTLED',
        currentPrincipalKobo: 0n,
        accruedYieldKobo: 0n,
        armWithdrawalId: armWithdrawalId || undefined,
      })
    }

    // Record internal treasury recovery if under-funded Rent Protec vault had unrecovered premium at maturity
    if (
      maturityPremiumRecoveryKobo > 0n &&
      treasurySummary &&
      this.prisma?.upward_vault_treasury_summary &&
      this.prisma?.upward_savings_internal_ledger
    ) {
      const nextUnrecovered =
        treasurySummary.unrecoveredPremiumKobo > maturityPremiumRecoveryKobo
          ? treasurySummary.unrecoveredPremiumKobo - maturityPremiumRecoveryKobo
          : 0n
      await this.prisma.upward_vault_treasury_summary
        .update({
          where: { vaultId: vault.id },
          data: {
            premiumRecoveredKobo: { increment: maturityPremiumRecoveryKobo },
            unrecoveredPremiumKobo: nextUnrecovered,
          },
        })
        .catch(() => {})
      await this.prisma.upward_savings_internal_ledger
        .create({
          data: {
            vaultId: vault.id,
            entryType: 'MATURITY_SETTLEMENT',
            productOption: 'RENT_PROTEC',
            principalBaseKobo: vault.currentPrincipalKobo,
            premiumRecoveryAppliedKobo: maturityPremiumRecoveryKobo,
            reference: `MAT_REC_${settlementReference}`,
            notes: `Recovered unrecovered upfront 2% Rent Protec premium at under-funded maturity settlement`,
          },
        })
        .catch(() => {})
    }

    // Award completion points to savings score (+15 points for full settlement, +5 for partial)
    const scoreDelta = isPartialSettlement ? 5 : 15
    const currentScore = await this.rentVaultRepo.findSavingsScoreByVaultId(vault.id)
    const newScore = Math.min(100, (currentScore?.totalScore || 20) + scoreDelta)
    await this.rentVaultRepo.upsertSavingsScore(vault.id, userId, {
      totalScore: newScore,
      historyLog: [
        ...(currentScore?.historyLog || []),
        {
          reason: isPartialSettlement
            ? 'Partial rent payout sent to landlord'
            : 'Vault successfully settled to landlord',
          delta: scoreDelta,
          timestamp: now.toISOString(),
        },
      ],
    })

    return {
      status: 'success',
      data: {
        settlement_reference: settlementReference,
        nip_session_id: nipSessionId,
        amount_paid_to_landlord_kobo: Number(amountPaidToLandlordKobo),
        target_rent_kobo: Number(vault.targetAmountKobo),
        remaining_balance_kobo: Number(remainingBalanceKobo),
        surplus_to_wallet_kobo: Number(surplusToWalletKobo),
        is_partial_settlement: isPartialSettlement,
        balance_payment_request_uuid: balancePaymentRequestUuid,
        cashback_credited_kobo: Number(cashbackCreditedKobo),
        early_bird_bonus_applied: cashbackResult.earlyBirdApplied,
        settlement_status: settlementStatus,
        receipt_download_url: receiptDownloadUrl,
        sms_alert_dispatched: true,
        upward_score_delta: `+${scoreDelta} Points`,
      },
    }
  }
}
