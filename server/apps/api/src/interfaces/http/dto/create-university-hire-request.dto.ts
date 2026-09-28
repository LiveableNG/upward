import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
} from 'class-validator'

export class CreateUniversityHireRequestDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string

  @IsString()
  @IsNotEmpty()
  contactName!: string

  @IsString()
  @IsOptional()
  contactRole?: string

  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  phone!: string

  @IsString()
  @IsNotEmpty()
  industry!: string

  @IsString()
  @IsNotEmpty()
  city!: string

  @IsString()
  @IsNotEmpty()
  placementType!: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  rolesNeeded?: string[]

  @IsString()
  @IsOptional()
  openingsCount?: string

  @IsString()
  @IsOptional()
  compensationType?: string

  @IsString()
  @IsOptional()
  startDate?: string

  @IsString()
  @IsOptional()
  jobDescription?: string

  @IsString()
  @IsOptional()
  sourceIdentifier?: string

  @IsString()
  @IsOptional()
  abVariant?: string
}
