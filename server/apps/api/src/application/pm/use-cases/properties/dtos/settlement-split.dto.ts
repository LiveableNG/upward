import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SettlementSplitRuleItemDto {
  @IsString()
  @IsOptional()
  lineItemName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Settlement account is required' })
  manualAccountUuid!: string;

  @IsNumber()
  @Min(0.01, { message: 'Percentage must be greater than 0' })
  @Max(100, { message: 'Percentage cannot exceed 100' })
  percentage!: number;
}

export class ConfigurePropertySettlementSplitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementSplitRuleItemDto)
  rules!: SettlementSplitRuleItemDto[];
}
