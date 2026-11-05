import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  GoalPublishStatus,
  OfferingPricingModel,
  OfferingType,
} from '../../../domains/goals/offering.repository'

export class OfferingMediaInputDto {
  @IsString()
  @IsOptional()
  mediaUrl?: string

  @IsString()
  @IsOptional()
  url?: string

  @IsString()
  @IsOptional()
  altText?: string

  @IsString()
  @IsOptional()
  mimeType?: string

  @IsInt()
  @IsOptional()
  sortOrder?: number

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean

  @IsBoolean()
  @IsOptional()
  isCover?: boolean
}

export class PackageItemInputDto {
  @IsInt()
  @IsNotEmpty()
  componentId!: number

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number

  @IsBoolean()
  @IsOptional()
  isOptional?: boolean

  @IsNumber()
  @IsOptional()
  overridePrice?: number
}

export class CreateOfferingDto {
  @IsInt()
  @IsOptional()
  vendorId?: number

  @IsEnum(['PRODUCT', 'SERVICE', 'PACKAGE', 'BUNDLE', 'SERVICE_INDIVIDUAL', 'SERVICE_PACKAGE'])
  @IsNotEmpty()
  type!: OfferingType

  @IsEnum(['FIXED', 'RANGE', 'STARTING_AT', 'QUOTE_REQUIRED'])
  @IsOptional()
  pricingModel?: OfferingPricingModel

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string

  @IsNumber()
  @IsOptional()
  price?: number

  @IsNumber()
  @IsOptional()
  minPrice?: number

  @IsNumber()
  @IsOptional()
  maxPrice?: number

  @IsBoolean()
  @IsOptional()
  inStock?: boolean

  @IsInt()
  @IsOptional()
  stockCount?: number

  @IsBoolean()
  @IsOptional()
  deliveryAvailable?: boolean

  @IsInt()
  @IsOptional()
  leadTimeDays?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OfferingMediaInputDto)
  media?: OfferingMediaInputDto[]

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PackageItemInputDto)
  packageItems?: PackageItemInputDto[]

  @IsString()
  @IsOptional()
  slug?: string

  @IsNumber()
  @IsOptional()
  compareAtPrice?: number

  @IsBoolean()
  @IsOptional()
  isDeliverable?: boolean

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean
}

export class UpdateOfferingDto {
  @IsInt()
  @IsOptional()
  vendorId?: number

  @IsEnum(['PRODUCT', 'SERVICE', 'PACKAGE', 'BUNDLE', 'SERVICE_INDIVIDUAL', 'SERVICE_PACKAGE'])
  @IsOptional()
  type?: OfferingType

  @IsEnum(['FIXED', 'RANGE', 'STARTING_AT', 'QUOTE_REQUIRED'])
  @IsOptional()
  pricingModel?: OfferingPricingModel

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string

  @IsNumber()
  @IsOptional()
  price?: number

  @IsNumber()
  @IsOptional()
  minPrice?: number

  @IsNumber()
  @IsOptional()
  maxPrice?: number

  @IsBoolean()
  @IsOptional()
  inStock?: boolean

  @IsInt()
  @IsOptional()
  stockCount?: number

  @IsBoolean()
  @IsOptional()
  deliveryAvailable?: boolean

  @IsInt()
  @IsOptional()
  leadTimeDays?: number

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean

  @IsString()
  @IsOptional()
  slug?: string

  @IsNumber()
  @IsOptional()
  compareAtPrice?: number

  @IsBoolean()
  @IsOptional()
  isDeliverable?: boolean

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OfferingMediaInputDto)
  media?: OfferingMediaInputDto[]

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PackageItemInputDto)
  packageItems?: PackageItemInputDto[]
}

export class OfferingQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  goalId?: number

  @IsEnum(['PRODUCT', 'SERVICE', 'PACKAGE', 'BUNDLE', 'SERVICE_INDIVIDUAL', 'SERVICE_PACKAGE'])
  @IsOptional()
  type?: OfferingType

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: GoalPublishStatus

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  vendorId?: number

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isFeatured?: boolean

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minPrice?: number

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number

  @IsString()
  @IsOptional()
  search?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  take?: number
}
