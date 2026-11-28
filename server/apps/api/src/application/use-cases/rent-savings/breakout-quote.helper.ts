import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { IRentVaultRepository } from '../../../domains/rent-savings/rent-vault.repository'
import { IRentAdvanceRepository } from '../../../domains/rent-savings/rent-advance.repository'
import { RentAdvance, RentVault } from '../../../domains/rent-savings/rent-vault.types'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export type BreakoutTier = 'FLEXIBLE' | 'FULL_LOCK' | 'RENT_PROTEC'

export interface ComputedBreakoutQuote {
  vault: RentVault
  tier: BreakoutTier
  isFlexible: boolean
  isFullLock: boolean
  isRentProtec: boolean
  isMatured: boolean
  daysRemaining: number
  principalKobo: bigint
  accruedYieldKobo: bigint
  forfeitedYieldKobo: bigint
  recalculatedYieldKobo: bigint
  recalculationAnnualRatePct: number
  adminFeeRatePct: number
  adminFeeKobo: bigint
  advanceDeductionKobo: bigint
  activeAdvance: RentAdvance | null
  premiumRecoveryDeductionKobo: bigint
  treasurySummary: {
    id: number
    unrecoveredPremiumKobo: bigint
    upfrontPremiumObligationKobo: bigint
  } | null
  netPayoutKobo: bigint
  depositCount: number
  weightedDaysHeld: number
  scorePenaltyPoints: number
  payoutBank: {
    bankCode: string
    bankName: string
    accountNumber: string
    accountName: string
  } | null
}

/**
 * Shared single source of truth for early breakout calculations so
 * GET /rent-vaults/:id/breakout/preview and POST /rent-vaults/:id/breakout
 * always reconcile to the exact kobo.
 */
export async function computeEarlyBreakoutQuote(params: {
  userId: number
  vaultUuid: string
  now?: Date
  rentVaultRepo: IRentVaultRepository
  rentAdvanceRepo: IRentAdvanceRepository
  prisma?: PrismaService
}): Promise<ComputedBreakoutQuote> {
  const { userId, vaultUuid, rentVaultRepo, rentAdvanceRepo, prisma } = params
  const now = params.now ?? new Date()

  const vault = await rentVaultRepo.findByUuid(vaultUuid)
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

  const daysRemaining = vault.contractualDueDate
    ? RentSavingsCalculatorEngine.calculateDaysRemaining(vault.contractualDueDate, now)
    : 365
  const isMatured = daysRemaining <= 30 || vault.lockStatus === 'SETTLEMENT_READY'

  const isRentProtec = vault.productOption === 'RENT_PROTEC'
  const isFlexible = !isRentProtec && vault.lockMode === 'FLEXIBLE'
  const isFullLock = !isRentProtec && !isFlexible
  const tier: BreakoutTier = isFlexible ? 'FLEXIBLE' : isRentProtec ? 'RENT_PROTEC' : 'FULL_LOCK'

  let principalKobo = vault.currentPrincipalKobo
  let recalculatedYieldKobo: bigint
  let adminFeeKobo: bigint
  let netPayoutKobo: bigint
  let recalculationAnnualRatePct: number
  let adminFeeRatePct: number
  let depositCount = 0
  let weightedDaysHeld = Math.max(
    0,
    Math.floor((now.getTime() - vault.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  )

  if (isFlexible) {
    // Flexible Save & Earn: 100% principal + 100% accrued yield, ₦0 fee, 0 score penalty.
    recalculatedYieldKobo = vault.accruedYieldKobo
    adminFeeKobo = 0n
    netPayoutKobo = vault.currentPrincipalKobo + vault.accruedYieldKobo
    recalculationAnnualRatePct = vault.appliedAnnualRatePct ?? 12.0
    adminFeeRatePct = 0
  } else {
    // Full Lock Save & Earn: 10.0% p.a. per-deposit replay + 0% admin fee.
    // Rent Protec: 7.0% p.a. per-deposit replay + 1.5% admin fee.
    const rawTxs =
      typeof rentVaultRepo.findTransactionsByVaultId === 'function'
        ? await rentVaultRepo.findTransactionsByVaultId(vault.id, 500)
        : []

    const principalDeposits = (rawTxs || [])
      .filter(
        (tx) =>
          (tx.type === 'DEPOSIT' || tx.type === 'CASHBACK') &&
          tx.principalDeltaKobo > 0n,
      )
      .map((tx) => ({
        amountKobo: tx.principalDeltaKobo,
        depositedAt: tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt),
      }))

    const replay = RentSavingsCalculatorEngine.calculatePerDepositEarlyExit({
      deposits: principalDeposits,
      currentPrincipalKobo: vault.currentPrincipalKobo,
      vaultCreatedAt: vault.createdAt,
      asOfDate: now,
      recalculationAnnualRateDecimal: isFullLock
        ? RentSavingsCalculatorEngine.FULL_LOCK_EARLY_EXIT_ANNUAL_RATE
        : RentSavingsCalculatorEngine.BASE_BREAKOUT_YIELD,
      adminFeeRateDecimal: isFullLock
        ? RentSavingsCalculatorEngine.FULL_LOCK_EARLY_EXIT_ADMIN_FEE_RATE
        : RentSavingsCalculatorEngine.BREAKOUT_ADMIN_FEE_RATE,
    })

    principalKobo = replay.principalKobo
    recalculatedYieldKobo = replay.recalculatedYieldKobo
    adminFeeKobo = replay.adminFeeKobo
    netPayoutKobo = replay.netPayoutKobo
    recalculationAnnualRatePct = replay.recalculationAnnualRatePct
    adminFeeRatePct = replay.adminFeeRatePct
    depositCount = replay.depositCount
    weightedDaysHeld = replay.weightedDaysHeld
  }

  // Offset any active emergency advance
  const activeAdvance = await rentAdvanceRepo.findActiveByVaultId(vault.id)
  let advanceDeductionKobo = 0n
  if (activeAdvance && activeAdvance.status === 'ACTIVE') {
    const outstanding = activeAdvance.totalRepayableKobo - activeAdvance.amountRepaidKobo
    const penalties = activeAdvance.latePenaltiesKobo
    advanceDeductionKobo = outstanding + penalties
    netPayoutKobo = netPayoutKobo > advanceDeductionKobo ? netPayoutKobo - advanceDeductionKobo : 0n
  }

  // Rent Protec early-exit premium recovery:
  // If Upward paid the 2% insurance premium upfront and has not yet recovered it
  // through daily yield spread, recover the remaining unrecovered amount on early exit.
  let premiumRecoveryDeductionKobo = 0n
  let treasurySummary: {
    id: number
    unrecoveredPremiumKobo: bigint
    upfrontPremiumObligationKobo: bigint
  } | null = null

  if (isRentProtec && prisma?.upward_vault_treasury_summary) {
    treasurySummary = await prisma.upward_vault_treasury_summary.findUnique({
      where: { vaultId: vault.id },
      select: {
        id: true,
        unrecoveredPremiumKobo: true,
        upfrontPremiumObligationKobo: true,
      },
    })
    if (treasurySummary && treasurySummary.unrecoveredPremiumKobo > 0n) {
      premiumRecoveryDeductionKobo =
        netPayoutKobo > treasurySummary.unrecoveredPremiumKobo
          ? treasurySummary.unrecoveredPremiumKobo
          : netPayoutKobo
      netPayoutKobo = netPayoutKobo - premiumRecoveryDeductionKobo
    }
  }

  // Resolve tenant's verified payout bank account (if KYC-completed)
  let payoutBank: ComputedBreakoutQuote['payoutBank'] = null
  if (prisma?.upward_user_bank_details?.findUnique) {
    const bank = await prisma.upward_user_bank_details
      .findUnique({ where: { userId } })
      .catch(() => null)
    if (bank?.accountNumber && bank?.bankCode) {
      payoutBank = {
        bankCode: bank.bankCode,
        bankName: bank.bankName || 'Commercial Bank',
        accountNumber: bank.accountNumber,
        accountName: bank.accountName || '',
      }
    }
  }

  return {
    vault,
    tier,
    isFlexible,
    isFullLock,
    isRentProtec,
    isMatured,
    daysRemaining,
    principalKobo,
    accruedYieldKobo: vault.accruedYieldKobo,
    forfeitedYieldKobo: isFlexible ? 0n : vault.accruedYieldKobo,
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
    scorePenaltyPoints: isFlexible ? 0 : 30,
    payoutBank,
  }
}
