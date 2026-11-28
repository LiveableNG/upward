import { Injectable, Inject, Optional } from '@nestjs/common'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { computeEarlyBreakoutQuote } from './breakout-quote.helper'

@Injectable()
export class PreviewBreakoutRentVaultUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  async execute(userId: number, vaultUuid: string) {
    const quote = await computeEarlyBreakoutQuote({
      userId,
      vaultUuid,
      rentVaultRepo: this.rentVaultRepo,
      rentAdvanceRepo: this.rentAdvanceRepo,
      prisma: this.prisma,
    })

    return {
      status: 'success',
      data: {
        vault_id: quote.vault.uuid,
        tier: quote.tier,
        lock_mode: quote.isFlexible ? 'FLEXIBLE' : 'LOCKED',
        product_option: quote.vault.productOption || 'SAVE_AND_EARN',
        is_matured: quote.isMatured,
        days_remaining: quote.daysRemaining,
        original_principal_kobo: Number(quote.principalKobo),
        accrued_yield_kobo: Number(quote.accruedYieldKobo),
        forfeited_yield_kobo: Number(quote.forfeitedYieldKobo),
        recalculated_base_yield_kobo: Number(quote.recalculatedYieldKobo),
        recalculation_rate_pct: quote.recalculationAnnualRatePct,
        admin_fee_rate_pct: quote.adminFeeRatePct,
        admin_fee_kobo: Number(quote.adminFeeKobo),
        advance_deduction_kobo: Number(quote.advanceDeductionKobo),
        premium_recovery_deduction_kobo: Number(quote.premiumRecoveryDeductionKobo),
        net_payout_kobo: Number(quote.netPayoutKobo),
        deposit_count: quote.depositCount,
        weighted_days_held: quote.weightedDaysHeld,
        score_penalty_points: quote.scorePenaltyPoints,
        payout_destination: quote.payoutBank
          ? {
              bank_code: quote.payoutBank.bankCode,
              bank_name: quote.payoutBank.bankName,
              account_number: quote.payoutBank.accountNumber,
              account_name: quote.payoutBank.accountName,
            }
          : null,
      },
    }
  }
}
