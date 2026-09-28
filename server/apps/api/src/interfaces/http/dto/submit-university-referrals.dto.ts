import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ReferredContactDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  email?: string
}

export class SubmitUniversityReferralsDto {
  @IsOptional()
  @IsString()
  referrerEarlyAccessId?: string

  @IsNotEmpty({ message: 'Referrer name is required' })
  @IsString()
  @MinLength(2, { message: 'Referrer name must be at least 2 characters' })
  referrerName!: string

  @IsNotEmpty({ message: 'Referrer phone number is required' })
  @IsString()
  referrerPhone!: string

  @IsOptional()
  @IsString()
  referrerEmail?: string

  @IsArray()
  @ArrayMinSize(1, { message: 'Please provide at least 1 person to recommend' })
  @ArrayMaxSize(5, { message: 'You can recommend up to 5 people at a time' })
  @ValidateNested({ each: true })
  @Type(() => ReferredContactDto)
  referrals!: ReferredContactDto[]
}
