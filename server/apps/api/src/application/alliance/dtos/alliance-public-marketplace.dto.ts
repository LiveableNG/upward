import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AllianceListingIntent,
  AllianceTargetType,
} from '../../../domains/alliance/alliance.entity';

export class PublicAllianceMarketplaceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['RENT', 'SALE'] as const)
  intent?: AllianceListingIntent;

  @IsOptional()
  @IsEnum(['PROPERTY', 'UNIT'] as const)
  targetType?: AllianceTargetType;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export class SubmitAllianceInquiryDto {
  @IsString()
  clientName!: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  referralToken?: string;
}

export interface PublicPmQualificationDto {
  code: string;
  title: string;
  category: string;
  badgeIcon?: string | null;
}

export interface PublicPmProfileDto {
  uuid: string;
  displayName: string;
  companyName?: string | null;
  pmTitle?: string | null;
  bio?: string | null;
  qualifications: PublicPmQualificationDto[];
}

export interface PublicRatingSummaryDto {
  averageScore: number;
  totalRatings: number;
}

export interface PublicAllianceListingMediaDto {
  uuid: string;
  publicUrl: string;
  mimeType: string;
  sortOrder: number;
}

export interface PublicAllianceListingCardDto {
  uuid: string;
  title: string;
  description?: string | null;
  intent: AllianceListingIntent;
  targetType: AllianceTargetType;
  price?: number | null;
  currency: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  primaryMedia?: PublicAllianceListingMediaDto | null;
  mediaCount: number;
  pm: PublicPmProfileDto;
  ratingSummary?: PublicRatingSummaryDto;
  publishedAt?: Date | null;
}

export interface PublicAllianceListingDetailDto extends PublicAllianceListingCardDto {
  media: PublicAllianceListingMediaDto[];
  unitName?: string | null;
  propertyName?: string | null;
}

export interface PublicAllianceReferralContextDto {
  referralUuid: string;
  shareToken: string;
  status: string;
  clientName: string;
  listing: PublicAllianceListingDetailDto;
  referringPm: PublicPmProfileDto;
}
