import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import {
  AllianceCommissionStatus,
  AllianceCommissionType,
} from '../../../domains/alliance/alliance.entity';

export class ConvertAllianceReferralDto {
  @IsNumber()
  @IsPositive()
  sourceAmount!: number;

  @IsOptional()
  @IsNumber()
  sourceTransactionId?: number;

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsEnum(['PERCENTAGE', 'FIXED'])
  commissionType?: AllianceCommissionType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListAllianceCommissionsQueryDto {
  @IsOptional()
  @IsEnum(['PENDING', 'EARNED', 'PAYABLE', 'PAID', 'REVERSED'])
  status?: AllianceCommissionStatus;

  @IsOptional()
  @IsString()
  listingUuid?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
