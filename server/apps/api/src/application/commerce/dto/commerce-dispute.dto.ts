import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateCommerceDisputeDto {
  @IsString()
  @IsNotEmpty()
  subOrderUuid!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  reason!: string

  @IsString()
  @IsNotEmpty()
  explanation!: string

  @IsArray()
  @IsOptional()
  evidenceUrls?: string[]
}

export class ResolveCommerceDisputeDto {
  @IsEnum(['RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'SETTLED_COMPROMISE', 'CLOSED'])
  @IsNotEmpty()
  resolutionStatus!: 'RESOLVED_REFUND' | 'RESOLVED_PAYOUT' | 'SETTLED_COMPROMISE' | 'CLOSED'

  @IsString()
  @IsNotEmpty()
  resolutionNotes!: string

  @IsString()
  @IsOptional()
  refundAmountKobo?: string
}
