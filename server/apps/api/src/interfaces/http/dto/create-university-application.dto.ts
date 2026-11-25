import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateUniversityApplicationDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name!: string

  @IsNotEmpty({ message: 'WhatsApp number is required' })
  @IsString()
  @MinLength(6, { message: 'Enter a valid phone number' })
  whatsapp!: string

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city!: string

  @IsOptional()
  @IsString()
  ageBracket?: string

  @IsOptional()
  @IsString()
  track?: string

  @IsOptional()
  @IsString()
  occupation?: string

  @IsOptional()
  @IsString()
  experienceLevel?: string

  @IsOptional()
  @IsString()
  goals?: string

  @IsOptional()
  @IsString()
  commitment?: string

  @IsOptional()
  @IsString()
  why?: string

  @IsOptional()
  @IsString()
  timing?: string

  @IsOptional()
  @IsBoolean()
  isScholarship?: boolean

  @IsOptional()
  @IsBoolean()
  isScholarshipApplicant?: boolean

  @IsOptional()
  @IsString()
  scholarshipVideoUrl?: string

  @IsOptional()
  @IsString()
  sessionTime?: string

  @IsOptional()
  @IsString()
  sourceIdentifier?: string

  @IsOptional()
  @IsString()
  abVariant?: string

  @IsOptional()
  @IsString()
  feeStatus?: string

  @IsOptional()
  @IsString()
  paymentRef?: string

  @IsOptional()
  @IsString()
  paymentPlan?: string

  @IsOptional()
  @IsNumber()
  amountPaid?: number

  @IsOptional()
  sendEmail?: boolean
}
