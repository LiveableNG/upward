import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug!: string

  @IsString()
  @IsOptional()
  logoUrl?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string

  @IsString()
  @IsOptional()
  website?: string

  @IsNumber()
  @IsOptional()
  rating?: number

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class UpdateVendorDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string

  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string

  @IsString()
  @IsOptional()
  logoUrl?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string

  @IsString()
  @IsOptional()
  website?: string

  @IsNumber()
  @IsOptional()
  rating?: number

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

