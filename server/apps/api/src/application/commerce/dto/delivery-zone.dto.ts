import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class CreateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  tag?: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(2)
  state!: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  areasCovered?: string

  @IsOptional()
  @IsBoolean()
  isDelivering?: boolean

  @IsOptional()
  @IsNumber()
  deliveryFeeKobo?: number

  @IsOptional()
  @IsString()
  estimatedDeliveryDays?: string

  @IsOptional()
  @IsString()
  pauseReason?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  tag?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  state?: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  areasCovered?: string

  @IsOptional()
  @IsBoolean()
  isDelivering?: boolean

  @IsOptional()
  @IsNumber()
  deliveryFeeKobo?: number

  @IsOptional()
  @IsString()
  estimatedDeliveryDays?: string

  @IsOptional()
  @IsString()
  pauseReason?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class ToggleDeliveryZoneDto {
  @IsBoolean()
  isDelivering!: boolean

  @IsOptional()
  @IsString()
  pauseReason?: string
}
