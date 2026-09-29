import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AllianceReferralStatus,
  AllianceLeadStage,
} from '../../../domains/alliance/alliance.entity';

export class CreateAllianceReferralDto {
  @IsNotEmpty()
  @IsString()
  clientName!: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAllianceLeadStageDto {
  @IsNotEmpty()
  @IsEnum(['NEW', 'CONTACTED', 'INTERESTED', 'VIEWING', 'APPLICATION', 'CONVERTED', 'LOST'] as const)
  stage!: AllianceLeadStage;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListAllianceReferralsQueryDto {
  @IsOptional()
  @IsEnum(['NEW', 'CONTACTED', 'INTERESTED', 'VIEWING', 'APPLICATION', 'CONVERTED', 'LOST'] as const)
  stage?: AllianceLeadStage;

  @IsOptional()
  @IsEnum(['ACTIVE', 'CONVERTED', 'LOST', 'CLOSED'] as const)
  status?: AllianceReferralStatus;

  @IsOptional()
  @IsString()
  listingUuid?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
