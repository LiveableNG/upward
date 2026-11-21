import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class PayUniversityApplicationBalanceDto {
  @IsOptional()
  @IsString()
  paymentRef?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsNotEmpty()
  @IsString()
  balancePaymentRef!: string

  @IsNotEmpty()
  @IsNumber()
  amountPaid!: number
}
