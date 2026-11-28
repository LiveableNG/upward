import { Injectable, Optional } from '@nestjs/common'
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import {
  CadenceType,
  SavingsLockMode,
  SavingsPlanPattern,
  SavingsProductOption,
} from '../../../domains/rent-savings/rent-vault.types'
import { PlatformRatesService } from '../../../shared/infrastructure/common/platform-rates.service'

export class SimulateRentSavingsDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  target_amount_kobo!: number

  @IsNotEmpty()
  @IsDateString()
  contractual_due_date!: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  initial_deposit_kobo?: number

  @IsNotEmpty()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'])
  cadence!: CadenceType

  @IsOptional()
  @IsIn(['SAVE_AND_EARN', 'RENT_PROTEC'])
  product_option?: SavingsProductOption

  @IsOptional()
  @IsIn(['LOCKED', 'FLEXIBLE'])
  lock_mode?: SavingsLockMode

  @IsOptional()
  @IsIn(['EQUAL', 'INITIAL_DEPOSIT', 'STEP_UP', 'ACCELERATED'])
  plan_pattern?: SavingsPlanPattern

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthly_income_kobo?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  payday_day_of_month?: number
}

@Injectable()
export class SimulateRentSavingsUseCase {
  constructor(
    @Optional()
    private readonly platformRates?: PlatformRatesService,
  ) {}

  async execute(dto: SimulateRentSavingsDto) {
    const rates = this.platformRates ? await this.platformRates.getRates() : null
    const productOption: SavingsProductOption = dto.product_option || 'SAVE_AND_EARN'
    const lockMode: SavingsLockMode =
      productOption === 'RENT_PROTEC'
        ? 'LOCKED'
        : dto.lock_mode === 'FLEXIBLE'
          ? 'FLEXIBLE'
          : 'LOCKED'
    const annualYieldRateDecimal =
      productOption === 'RENT_PROTEC'
        ? (rates?.rentProtecRateDecimal ?? 0.1)
        : lockMode === 'FLEXIBLE'
          ? (rates?.flexibleSavingsAnnualRateDecimal ?? 0.12)
          : (rates?.savingsAnnualRateDecimal ?? 0.16)

    const result = RentSavingsCalculatorEngine.simulate({
      targetAmountKobo: BigInt(Math.round(dto.target_amount_kobo)),
      contractualDueDate: new Date(dto.contractual_due_date),
      initialDepositKobo: dto.initial_deposit_kobo
        ? BigInt(Math.round(dto.initial_deposit_kobo))
        : 0n,
      cadence: dto.cadence,
      productOption,
      lockMode,
      planPattern: dto.plan_pattern || 'INITIAL_DEPOSIT',
      monthlyIncomeKobo: dto.monthly_income_kobo
        ? BigInt(Math.round(dto.monthly_income_kobo))
        : undefined,
      paydayDayOfMonth: dto.payday_day_of_month,
      annualNetYieldRate: annualYieldRateDecimal,
      maxSavingsMonths: rates?.maxSavingsMonths ?? 11,
      rentProtecMinMonths: rates?.rentProtecMinMonths ?? 6,
      insurancePremiumPct: rates?.insurancePremiumPct ?? 2.0,
    })

    return {
      status: 'success',
      data: {
        days_remaining: result.daysRemaining,
        active_compounding_days: result.activeCompoundingDays,
        months_remaining: result.monthsRemaining,
        periodic_deposit_kobo: Number(result.periodicDepositKobo),
        first_period_deposit_kobo: Number(result.firstPeriodDepositKobo),
        last_period_deposit_kobo: Number(result.lastPeriodDepositKobo),
        required_initial_deposit_kobo: Number(result.requiredInitialDepositKobo),
        minimum_initial_deposit_kobo: Number(result.minimumInitialDepositKobo),
        minimum_initial_deposit_pct: result.minimumInitialDepositPct,
        number_of_payments: result.numberOfPayments,
        total_tenant_contribution_kobo: Number(result.totalTenantContributionKobo),
        projected_yield_kobo: Number(result.projectedYieldKobo),
        net_annual_yield_rate: result.netAnnualYieldRate,
        daily_yield_rate: result.dailyYieldRate,
        product_option: result.productOption,
        lock_mode: result.lockMode,
        plan_pattern: result.planPattern,
        is_rent_protec_eligible: result.isRentProtecEligible,
        rent_protec_ineligibility_reason: result.rentProtecIneligibilityReason || null,
        insurance_premium_kobo: Number(result.insurancePremiumKobo),
        affordability: {
          rent_to_income_ratio: result.affordability.rentToIncomeRatio,
          is_over_threshold: result.affordability.isOverThreshold,
          advisory_message: result.affordability.advisoryMessage,
        },
      },
    }
  }
}
