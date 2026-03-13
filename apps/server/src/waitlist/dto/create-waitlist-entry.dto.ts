import {
  IsEmail,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  MinLength,
} from 'class-validator'
import {
  UserRole,
  WaitlistBenefit,
  type CreateWaitlistEntryDto as ICreateWaitlistEntryDto,
} from '@upward/shared-types'

export class CreateWaitlistEntryDto implements ICreateWaitlistEntryDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  lastName?: string

  @IsOptional()
  @IsString()
  @MinLength(7, { message: 'Phone number is too short' })
  phone?: string

  @IsEnum(UserRole, { message: 'Role must be TENANT or OWNER' })
  role!: UserRole

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2, { message: 'You can select up to 2 benefits' })
  @IsEnum(WaitlistBenefit, { each: true })
  benefits!: WaitlistBenefit[]

  @IsBoolean({ message: 'You must accept the terms to continue' })
  acceptTerms!: boolean

  @IsOptional()
  @IsBoolean()
  wantsAmbassador?: boolean

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  city?: string
}
