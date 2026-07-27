import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateAreaPriceGuideDto {
  @IsString()
  @IsNotEmpty()
  state!: string

  @IsString()
  @IsNotEmpty()
  area!: string

  @IsString()
  @IsOptional()
  subArea?: string

  @IsInt()
  @Min(0)
  bedrooms!: number

  @IsInt()
  @Min(0)
  @IsOptional()
  baths?: number

  @IsNumber()
  @Min(0)
  minPrice!: number

  @IsNumber()
  @Min(0)
  maxPrice!: number

  @IsInt()
  @Min(0)
  sampleSize!: number
}

export class UpdateAreaPriceGuideDto {
  @IsString()
  @IsOptional()
  state?: string

  @IsString()
  @IsOptional()
  area?: string

  @IsString()
  @IsOptional()
  subArea?: string

  @IsInt()
  @Min(0)
  @IsOptional()
  bedrooms?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  baths?: number

  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  sampleSize?: number
}

export class BulkUpsertAreaPriceGuideDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAreaPriceGuideDto)
  rows!: CreateAreaPriceGuideDto[]
}
