import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AllianceSourceType,
  AllianceTargetType,
  AllianceListingIntent,
  AllianceListingStatus,
} from '../../../domains/alliance/alliance.entity';

export class CreateAllianceListingDto {
  @IsEnum(['LINKED_INVENTORY', 'INDEPENDENT'] as const, {
    message: 'sourceType must be LINKED_INVENTORY or INDEPENDENT',
  })
  @IsNotEmpty()
  sourceType!: AllianceSourceType;

  @IsEnum(['PROPERTY', 'UNIT'] as const, {
    message: 'targetType must be PROPERTY or UNIT',
  })
  @IsNotEmpty()
  targetType!: AllianceTargetType;

  @IsEnum(['RENT', 'SALE'] as const, {
    message: 'intent must be RENT or SALE',
  })
  @IsOptional()
  intent?: AllianceListingIntent;

  @IsString()
  @IsOptional()
  targetPropertyUuid?: string;

  @IsString()
  @IsOptional()
  targetUnitUuid?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;
}

export class UpdateAllianceListingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsEnum(['RENT', 'SALE'] as const, {
    message: 'intent must be RENT or SALE',
  })
  @IsOptional()
  intent?: AllianceListingIntent;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsEnum(['ALLIANCE', 'PRIVATE'] as const, {
    message: 'visibility must be ALLIANCE or PRIVATE',
  })
  @IsOptional()
  visibility?: 'ALLIANCE' | 'PRIVATE';

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;
}

export class ListAllianceListingsQueryDto {
  @IsEnum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'] as const)
  @IsOptional()
  status?: AllianceListingStatus;

  @IsEnum(['PROPERTY', 'UNIT'] as const)
  @IsOptional()
  targetType?: AllianceTargetType;

  @IsEnum(['LINKED_INVENTORY', 'INDEPENDENT'] as const)
  @IsOptional()
  sourceType?: AllianceSourceType;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class DiscoverAllianceListingsQueryDto {
  @IsEnum(['RENT', 'SALE'] as const)
  @IsOptional()
  intent?: AllianceListingIntent;

  @IsEnum(['PROPERTY', 'UNIT'] as const)
  @IsOptional()
  targetType?: AllianceTargetType;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['newest', 'price_asc', 'price_desc'] as const)
  @IsOptional()
  sortBy?: 'newest' | 'price_asc' | 'price_desc' = 'newest';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
