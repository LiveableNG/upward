import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common'
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  CadenceType,
  FundingMethodType,
  SavingsLockMode,
} from '../../../domains/rent-savings/rent-vault.types'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { clampReminderDay } from '../../../domains/rent-savings/reminder-day'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'
import { RecordSavingsConsentUseCase } from './record-savings-consent.use-case'
import { ApplyReservedSavingsCashbackUseCase } from './apply-reserved-savings-cashback.use-case'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'

export class CreateRentVaultDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  target_amount_kobo!: number

  @IsNotEmpty()
  @IsDateString()
  contractual_due_date!: string

  @IsNotEmpty()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'])
  cadence!: CadenceType

  @IsNotEmpty()
  @IsIn(['DVA', 'CARD_TOKEN', 'DIRECT_DEBIT'])
  preferred_funding_method!: FundingMethodType

  @IsOptional()
  @IsIn(['SAVE_AND_EARN', 'RENT_PROTEC'])
  product_option?: 'SAVE_AND_EARN' | 'RENT_PROTEC'

  @IsOptional()
  @IsIn(['LOCKED', 'FLEXIBLE'])
  lock_mode?: SavingsLockMode

  @IsOptional()
  @IsIn(['EQUAL', 'INITIAL_DEPOSIT', 'STEP_UP', 'ACCELERATED'])
  plan_pattern?: 'EQUAL' | 'INITIAL_DEPOSIT' | 'STEP_UP' | 'ACCELERATED'

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  initial_deposit_kobo?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  planned_monthly_deposit_kobo?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  payday_day_of_month?: number

  @IsOptional()
  @IsString()
  card_authorization_code?: string

  @IsOptional()
  @IsBoolean()
  consent_accepted?: boolean

  @IsOptional()
  @IsString()
  terms_version?: string

  @IsOptional()
  @IsString()
  consent_doc_version?: string
}

@Injectable()
export class CreateRentVaultUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly prisma: PrismaService,
    @Optional() private readonly platformRates?: PlatformRatesService,
    @Optional() private readonly recordSavingsConsentUseCase?: RecordSavingsConsentUseCase,
    @Optional()
    private readonly applyReservedSavingsCashbackUseCase?: ApplyReservedSavingsCashbackUseCase,
  ) {}

  async execute(
    userId: number,
    dto: CreateRentVaultDto,
    requestMeta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const precheckRates = this.platformRates ? await this.platformRates.getRates() : null
    if (precheckRates?.savingsMode === 'COMING_SOON') {
      throw new ForbiddenException(
        'Rent Savings is not open yet. Indicate your interest in the app to reserve your early-access cashback.',
      )
    }

    const existingVault = await this.rentVaultRepo.findActiveByUserId(userId)
    if (existingVault) {
      throw new ConflictException('You already have an active rent vault.')
    }

    // Single Source of Truth: Active property in Settings
    const activeProperty = this.prisma?.upward_user_property
      ? await this.prisma.upward_user_property.findFirst({
          where: { userId, isPastTenancy: false },
          orderBy: { createdAt: 'desc' },
        })
      : null

    const targetAmountKobo =
      dto.target_amount_kobo && dto.target_amount_kobo > 0
        ? BigInt(Math.round(dto.target_amount_kobo))
        : activeProperty?.rentAmount && activeProperty.rentAmount > 0
          ? BigInt(Math.round(activeProperty.rentAmount * 100))
          : 0n

    const now = new Date()
    const propDueDate = activeProperty?.rentEndDate ? new Date(activeProperty.rentEndDate) : null
    const dtoDueDate = dto.contractual_due_date ? new Date(dto.contractual_due_date) : null

    // Guardrail: if the user already settled a vault for dtoDueDate (or later) and activeProperty
    // already rolled forward to the next cycle, prevent a stale client date from recreating
    // a Cycle 2 vault with the already-paid cycle's due date.
    let useRolledPropDueDate = false
    if (
      propDueDate &&
      !Number.isNaN(propDueDate.getTime()) &&
      dtoDueDate &&
      !Number.isNaN(dtoDueDate.getTime()) &&
      propDueDate.getTime() > dtoDueDate.getTime() &&
      this.prisma?.upward_rent_vault
    ) {
      const settledForDtoCycle = await this.prisma.upward_rent_vault.findFirst({
        where: {
          userId,
          lockStatus: 'SETTLED',
          contractualDueDate: {
            gte: new Date(dtoDueDate.getTime() - 7 * 86_400_000),
          },
        },
        select: { id: true },
      })
      if (settledForDtoCycle) {
        useRolledPropDueDate = true
      }
    }

    const dueDate = useRolledPropDueDate
      ? propDueDate!
      : dtoDueDate && !Number.isNaN(dtoDueDate.getTime()) && dtoDueDate.getTime() > now.getTime()
        ? dtoDueDate
        : propDueDate && !Number.isNaN(propDueDate.getTime())
          ? propDueDate
          : new Date(dto.contractual_due_date)

    if (dueDate.getTime() <= now.getTime()) {
      throw new BadRequestException('Contractual due date must be in the future.')
    }

    // Strictly T-30 days
    const unlockDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new BadRequestException('User not found.')
    }

    if (!user.isIdentityVerified) {
      throw new BadRequestException(
        'Identity verification (BVN) and investor KYC are required before creating or locking a rent vault.',
      )
    }

    // Retrieve active investor KYC registration to link ARM membership
    const latestKyc = this.prisma?.upward_kyc_verification
      ? await this.prisma.upward_kyc_verification.findFirst({
          where: { userId, status: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
        })
      : null

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant'
    const dvaAccountName = `Upward / ${userName}`

    // Provision DVA details (reusing existing DVA if already allocated during KYC)
    const existingDvaRecord = this.prisma?.upward_rent_vault
      ? await this.prisma.upward_rent_vault.findFirst({
          where: { userId, dvaAccountNumber: { not: null } },
          orderBy: { createdAt: 'desc' },
        })
      : null

    let dvaBankName = existingDvaRecord?.dvaBankName || 'Wema Bank'
    let dvaAccountNumber: string | null = existingDvaRecord?.dvaAccountNumber || null
    let dvaAssignmentStatus = existingDvaRecord?.dvaAssignmentStatus || 'PENDING'

    const isNonProd = !isProductionRuntime(process.env.PAYSTACK_SECRET_KEY)
    if (!dvaAccountNumber && isNonProd) {
      dvaBankName = 'Wema Bank'
      const randomAcc = '02' + Math.floor(10000000 + Math.random() * 90000000).toString()
      dvaAccountNumber = randomAcc
      dvaAssignmentStatus = 'ACTIVE'
    }

    const rates = this.platformRates ? await this.platformRates.getRates() : null
    const chosenOption = dto.product_option || 'SAVE_AND_EARN'
    const resolvedLockMode: SavingsLockMode =
      chosenOption === 'RENT_PROTEC'
        ? 'LOCKED'
        : dto.lock_mode === 'FLEXIBLE'
          ? 'FLEXIBLE'
          : 'LOCKED'
    const appliedAnnualRatePct =
      chosenOption === 'RENT_PROTEC'
        ? (rates?.rentProtecRatePct ?? 10.0)
        : resolvedLockMode === 'FLEXIBLE'
          ? (rates?.flexibleSavingsAnnualRatePct ?? 12.0)
          : (rates?.savingsAnnualRatePct ?? 16.0)

    const rawDaysRemaining = RentSavingsCalculatorEngine.calculateDaysRemaining(dueDate, now)
    const minRentProtecInitialKobo =
      chosenOption === 'RENT_PROTEC'
        ? RentSavingsCalculatorEngine.getRentProtecActivationThresholdKobo(
            targetAmountKobo,
            rawDaysRemaining,
          )
        : 0n
    const providedInitialKobo = dto.initial_deposit_kobo
      ? BigInt(Math.max(0, Math.round(dto.initial_deposit_kobo)))
      : 0n
    const effectiveInitialDepositKobo =
      chosenOption === 'RENT_PROTEC' && providedInitialKobo < minRentProtecInitialKobo
        ? minRentProtecInitialKobo
        : providedInitialKobo

    const resolvedPlanPattern =
      dto.plan_pattern || (effectiveInitialDepositKobo > 0n ? 'INITIAL_DEPOSIT' : 'EQUAL')

    let plannedMonthlyDepositKobo =
      dto.planned_monthly_deposit_kobo && dto.planned_monthly_deposit_kobo > 0
        ? BigInt(Math.round(dto.planned_monthly_deposit_kobo))
        : 0n
    if (plannedMonthlyDepositKobo === 0n) {
      try {
        const sim = RentSavingsCalculatorEngine.simulate({
          targetAmountKobo,
          contractualDueDate: dueDate,
          initialDepositKobo: effectiveInitialDepositKobo,
          cadence: 'MONTHLY',
          productOption: chosenOption,
          lockMode: resolvedLockMode,
          planPattern: resolvedPlanPattern,
          asOfDate: now,
          paydayDayOfMonth: clampReminderDay(dto.payday_day_of_month),
          annualNetYieldRate: appliedAnnualRatePct / 100,
          maxSavingsMonths: rates?.maxSavingsMonths ?? 11,
          rentProtecMinMonths: rates?.rentProtecMinMonths ?? 6,
          insurancePremiumPct:
            chosenOption === 'RENT_PROTEC' ? (rates?.insurancePremiumPct ?? 2.0) : 0,
        })
        plannedMonthlyDepositKobo = sim.periodicDepositKobo
      } catch {
        plannedMonthlyDepositKobo = 0n
      }
    }

    const vault = await this.rentVaultRepo.create({
      userId,
      targetAmountKobo,
      cadence: dto.cadence,
      productOption: chosenOption,
      lockMode: resolvedLockMode,
      planPattern: resolvedPlanPattern,
      appliedAnnualRatePct,
      initialDepositKobo: effectiveInitialDepositKobo,
      plannedMonthlyDepositKobo,
      contractualDueDate: dueDate,
      unlockDate,
      lockStatus: 'LOCKED',
      preferredFundingMethod: dto.preferred_funding_method,
      paydayDayOfMonth: clampReminderDay(dto.payday_day_of_month),
      cardAuthorizationCode: dto.card_authorization_code || null,
      dvaBankName,
      dvaAccountNumber,
      dvaAccountName: existingDvaRecord?.dvaAccountName || dvaAccountName,
      dvaCustomerCode: existingDvaRecord?.dvaCustomerCode || null,
      dvaAssignmentStatus,
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
      providerMembershipId:
        latestKyc?.armCustomerMembershipId || existingDvaRecord?.providerMembershipId || null,
      providerAccountNumber:
        latestKyc?.armCrmAccountNumber || existingDvaRecord?.providerAccountNumber || null,
      providerCrmStatus:
        latestKyc?.armSyncStatus || existingDvaRecord?.providerCrmStatus || 'PENDING',
    })

    if (dto.consent_accepted === true && this.recordSavingsConsentUseCase) {
      await this.recordSavingsConsentUseCase
        .execute(
          userId,
          {
            consent_accepted: true,
            accepted_terms: true,
            accepted_arm_mandate: true,
            accepted_lock_policy: true,
            terms_version: dto.terms_version,
            consent_doc_version: dto.consent_doc_version,
          },
          {
            ipAddress: requestMeta?.ipAddress || null,
            userAgent: requestMeta?.userAgent || null,
            vaultId: vault.id,
          },
        )
        .catch(() => {})
    }

    // Initialize internal treasury summary.
    // Guardrail: For RENT_PROTEC, do NOT bind/book the 2% upfront insurer premium at ₦0 balance.
    // Coverage & the 2% insurer obligation activate only once funded principal reaches the
    // safe activation threshold (20% of annual rent for 7+ months, 25% for 6 months).
    if (this.prisma?.upward_vault_treasury_summary) {
      await this.prisma.upward_vault_treasury_summary
        .upsert({
          where: { vaultId: vault.id },
          create: {
            vaultId: vault.id,
            productOption: chosenOption,
            upfrontPremiumObligationKobo: 0n,
            unrecoveredPremiumKobo: 0n,
          },
          update: {
            productOption: chosenOption,
          },
        })
        .catch(() => {})
    }

    // Initialize baseline savings score (20 points for setup)
    await this.rentVaultRepo.upsertSavingsScore(vault.id, userId, {
      cadencePoints: 0,
      velocityPoints: 0,
      loanDisciplinePoints: 20,
      totalScore: 20,
      historyLog: [
        {
          reason: 'Vault created and initialized',
          delta: 20,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    // Auto-credit any early-interest reserved activation cashback into the newly created vault
    let appliedCashbackKobo = 0n
    if (this.applyReservedSavingsCashbackUseCase) {
      const cashbackRes = await this.applyReservedSavingsCashbackUseCase
        .execute(userId, vault.id)
        .catch(() => ({ credited: false, amountKobo: 0n }))
      appliedCashbackKobo = cashbackRes.amountKobo
    }

    // Auto-credit any unapplied settlement cashback from a previous cycle into this new vault's principal
    // (idempotent via unique CASHBACK_ROLLOVER_<settlementRef>) so it starts earning daily interest on Day 1.
    if (this.prisma?.upward_rent_settlement && this.prisma?.upward_rent_vault_transaction) {
      try {
        const latestCashbackSettlement = await this.prisma.upward_rent_settlement.findFirst({
          where: { userId, cashbackCreditedKobo: { gt: 0n } },
          orderBy: { createdAt: 'desc' },
        })
        if (latestCashbackSettlement) {
          const rolloverRef = `CASHBACK_ROLLOVER_${latestCashbackSettlement.settlementReference}`
          const alreadyRolled = await this.prisma.upward_rent_vault_transaction.findUnique({
            where: { reference: rolloverRef },
          })
          if (!alreadyRolled) {
            const rolloverKobo = latestCashbackSettlement.cashbackCreditedKobo
            await this.rentVaultRepo.incrementBalances(vault.id, rolloverKobo, 0n)
            await this.rentVaultRepo.createTransaction({
              vaultId: vault.id,
              userId,
              type: 'CASHBACK',
              amountKobo: rolloverKobo,
              principalDeltaKobo: rolloverKobo,
              yieldDeltaKobo: 0n,
              balanceAfterKobo: vault.currentPrincipalKobo + appliedCashbackKobo + rolloverKobo,
              reference: rolloverRef,
              channel: 'SYSTEM_YIELD',
              narration: `Cashback reward applied to kickstart your next rent savings plan`,
              metadata: {
                fundingType: 'SWEEP_TO_RENT_VAULT',
                holdingLocation: 'RENT_VAULT',
                routingTarget: 'NEXT_RENT_VAULT',
                routingStatus: 'ROUTED',
                source: 'SETTLEMENT_CASHBACK_ROLLOVER',
                sourceSettlementReference: latestCashbackSettlement.settlementReference,
              },
            })
            appliedCashbackKobo += rolloverKobo

            // Reconcile the corresponding held cashback out of the user's DVA holding wallet
            if (this.prisma.upward_wallet && this.prisma.upward_wallet_transaction) {
              const heldCashbackRef = `WLT_CBK_${latestCashbackSettlement.settlementReference}`
              const sweepCashbackRef = `SWEEP_CBK_${latestCashbackSettlement.settlementReference}`
              const heldCashbackTx = await this.prisma.upward_wallet_transaction
                .findUnique({ where: { reference: heldCashbackRef } })
                .catch(() => null)
              const existingSweep = await this.prisma.upward_wallet_transaction
                .findUnique({ where: { reference: sweepCashbackRef } })
                .catch(() => null)
              if (heldCashbackTx && !existingSweep) {
                const wallet = await this.prisma.upward_wallet.findUnique({ where: { userId } })
                if (wallet) {
                  const sweepNaira = Number(rolloverKobo) / 100
                  await this.prisma.upward_wallet.update({
                    where: { id: wallet.id },
                    data: {
                      balance: Math.max(0, Number((wallet.balance - Math.min(wallet.balance, sweepNaira)).toFixed(2))),
                    },
                  })
                  const prevMeta = (heldCashbackTx.metadata as Record<string, unknown>) || {}
                  await this.prisma.upward_wallet_transaction.update({
                    where: { id: heldCashbackTx.id },
                    data: {
                      metadata: {
                        ...prevMeta,
                        routingStatus: 'ROUTED',
                        routedAt: new Date().toISOString(),
                        targetVaultId: vault.id,
                      } as any,
                    },
                  })
                  await this.prisma.upward_wallet_transaction.create({
                    data: {
                      walletId: wallet.id,
                      userId,
                      type: 'SWEEP_TO_RENT_VAULT',
                      status: 'SUCCESS',
                      amount: -Math.abs(sweepNaira),
                      reference: sweepCashbackRef,
                      narration: `Cashback moved from your Upward DVA into your new Rent Savings plan`,
                      metadata: {
                        fundingType: 'SWEEP_TO_RENT_VAULT',
                        holdingLocation: 'RENT_VAULT',
                        routingTarget: 'NEXT_RENT_VAULT',
                        routingStatus: 'ROUTED',
                        sourceReference: heldCashbackRef,
                        targetVaultId: vault.id,
                      } as any,
                    },
                  })
                }
              }
            }
          }
        }
      } catch {
        // Non-blocking cashback rollover
      }
    }

    // Auto-sweep any unallocated DVA inflows held in the user's DVA wallet with routingTarget = NEXT_RENT_VAULT
    if (this.prisma?.upward_wallet && this.prisma?.upward_wallet_transaction) {
      try {
        const heldInflows = await this.prisma.upward_wallet_transaction.findMany({
          where: {
            userId,
            type: 'UNALLOCATED_DVA_INFLOW',
            status: 'SUCCESS',
          },
          orderBy: { createdAt: 'asc' },
        })
        const userWallet = heldInflows.length
          ? await this.prisma.upward_wallet.findUnique({ where: { userId } })
          : null

        for (const inflow of heldInflows) {
          const meta = (inflow.metadata as Record<string, unknown>) || {}
          if (meta.routingStatus === 'ROUTED' || inflow.amount <= 0) continue
          const sweepRef = `DVA_SWEEP_${inflow.reference || inflow.uuid}`
          const alreadySwept = await this.prisma.upward_rent_vault_transaction.findUnique({
            where: { reference: sweepRef },
          })
          if (alreadySwept) continue

          const inflowKobo = BigInt(Math.round(inflow.amount * 100))
          await this.rentVaultRepo.incrementBalances(vault.id, inflowKobo, 0n)
          appliedCashbackKobo += inflowKobo

          await this.rentVaultRepo.createTransaction({
            vaultId: vault.id,
            userId,
            type: 'DEPOSIT',
            amountKobo: inflowKobo,
            principalDeltaKobo: inflowKobo,
            yieldDeltaKobo: 0n,
            balanceAfterKobo: vault.currentPrincipalKobo + appliedCashbackKobo,
            reference: sweepRef,
            channel: 'DVA_WALLET_SWEEP',
            narration: `Held DVA transfer moved into your new Rent Savings plan`,
            metadata: {
              fundingType: 'SWEEP_TO_RENT_VAULT',
              holdingLocation: 'RENT_VAULT',
              routingTarget: 'NEXT_RENT_VAULT',
              routingStatus: 'ROUTED',
              sourceWalletTxUuid: inflow.uuid,
              sourceReference: inflow.reference,
            },
          })

          if (userWallet) {
            await this.prisma.upward_wallet.update({
              where: { id: userWallet.id },
              data: {
                balance: Math.max(0, Number((userWallet.balance - Math.min(userWallet.balance, inflow.amount)).toFixed(2))),
              },
            })
            await this.prisma.upward_wallet_transaction.update({
              where: { id: inflow.id },
              data: {
                metadata: {
                  ...meta,
                  routingStatus: 'ROUTED',
                  routedAt: new Date().toISOString(),
                  targetVaultId: vault.id,
                } as any,
              },
            })
            await this.prisma.upward_wallet_transaction.create({
              data: {
                walletId: userWallet.id,
                userId,
                type: 'SWEEP_TO_RENT_VAULT',
                status: 'SUCCESS',
                amount: -Math.abs(inflow.amount),
                reference: `WLT_${sweepRef}`,
                narration: `Held DVA deposit moved into your new Rent Savings plan`,
                metadata: {
                  fundingType: 'SWEEP_TO_RENT_VAULT',
                  holdingLocation: 'RENT_VAULT',
                  routingTarget: 'NEXT_RENT_VAULT',
                  routingStatus: 'ROUTED',
                  sourceReference: inflow.reference,
                  targetVaultId: vault.id,
                } as any,
              },
            })
          }
        }
      } catch {
        // Non-blocking held DVA sweep
      }
    }

    return {
      status: 'success',
      data: {
        vault_id: vault.uuid,
        lock_status: vault.lockStatus,
        target_amount_kobo: Number(vault.targetAmountKobo),
        current_principal_kobo: Number(vault.currentPrincipalKobo + appliedCashbackKobo),
        accrued_yield_kobo: Number(vault.accruedYieldKobo),
        contractual_due_date: vault.contractualDueDate.toISOString().split('T')[0],
        unlockDate: vault.unlockDate.toISOString().split('T')[0],
        dedicated_account: dvaAccountNumber
          ? {
              bank_name: dvaBankName,
              account_number: dvaAccountNumber,
              account_name: dvaAccountName,
              assignment_status: dvaAssignmentStatus,
            }
          : null,
      },
    }
  }
}
