import { Injectable } from '@nestjs/common'
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { CadenceType } from '../../../domains/rent-savings/rent-vault.types'

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
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  cadence!: CadenceType

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthly_income_kobo?: number
}

@Injectable()
export class SimulateRentSavingsUseCase {
  async execute(dto: SimulateRentSavingsDto) {
    const result = RentSavingsCalculatorEngine.simulate({
      targetAmountKobo: BigInt(Math.round(dto.target_amount_kobo)),
      contractualDueDate: new Date(dto.contractual_due_date),
      initialDepositKobo: dto.initial_deposit_kobo
        ? BigInt(Math.round(dto.initial_deposit_kobo))
        : 0n,
      cadence: dto.cadence,
      monthlyIncomeKobo: dto.monthly_income_kobo
        ? BigInt(Math.round(dto.monthly_income_kobo))
        : undefined,
    })

    return {
      status: 'success',
      data: {
        days_remaining: result.daysRemaining,
        periodic_deposit_kobo: Number(result.periodicDepositKobo),
        number_of_payments: result.numberOfPayments,
        total_tenant_contribution_kobo: Number(result.totalTenantContributionKobo),
        projected_yield_kobo: Number(result.projectedYieldKobo),
        net_annual_yield_rate: result.netAnnualYieldRate,
        affordability: {
          rent_to_income_ratio: result.affordability.rentToIncomeRatio,
          is_over_threshold: result.affordability.isOverThreshold,
          advisory_message: result.affordability.advisoryMessage,
        },
      },
    }
  }
}
