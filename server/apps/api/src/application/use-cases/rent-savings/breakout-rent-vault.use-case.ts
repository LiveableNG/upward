import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'

@Injectable()
export class BreakoutRentVaultUseCase {
  private readonly logger = new Logger(BreakoutRentVaultUseCase.name)

  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
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

    // Fair exit recalculation
    const breakout = RentSavingsCalculatorEngine.calculateFairBreakout(
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

      await this.rentAdvanceRepo.update(activeAdvance.id, {
        status: 'OFFSET_AT_SETTLEMENT',
        amountRepaidKobo: activeAdvance.totalRepayableKobo,
        repaidAt: now,
      })
    }

    const breakoutReference = `UPW_BREAKOUT_${Date.now()}`

    // Record liquidation transaction
    await this.rentVaultRepo.createTransaction({
      vaultId: vault.id,
      userId,
      type: 'LIQUIDATION_PENALTY',
      amountKobo: breakout.adminFeeKobo,
      principalDeltaKobo: -vault.currentPrincipalKobo,
      yieldDeltaKobo: -vault.accruedYieldKobo,
      balanceAfterKobo: 0n,
      reference: breakoutReference,
      channel: 'SYSTEM_YIELD',
      narration: `Fair exit breakout executed: 7.0% base yield applied, 1.5% admin fee deducted`,
      metadata: {
        recalculatedYieldKobo: Number(breakout.recalculatedYieldKobo),
        adminFeeKobo: Number(breakout.adminFeeKobo),
        advanceDeductionKobo: Number(advanceDeduction),
        netPayoutKobo: Number(netPayout),
      },
    })

    // Mark vault as BROKEN_OUT
    await this.rentVaultRepo.update(vault.id, {
      lockStatus: 'BROKEN_OUT',
      currentPrincipalKobo: 0n,
      accruedYieldKobo: 0n,
    })

    // Update savings score discipline penalty (-30 points)
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

    return {
      status: 'success',
      data: {
        breakout_reference: breakoutReference,
        original_principal_kobo: Number(vault.currentPrincipalKobo),
        forfeited_yield_kobo: Number(vault.accruedYieldKobo),
        recalculated_base_yield_kobo: Number(breakout.recalculatedYieldKobo),
        admin_fee_kobo: Number(breakout.adminFeeKobo),
        advance_deduction_kobo: Number(advanceDeduction),
        net_payout_kobo: Number(netPayout),
      },
    }
  }
}
