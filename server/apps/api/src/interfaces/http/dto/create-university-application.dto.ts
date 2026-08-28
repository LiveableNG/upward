import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

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

  @IsNotEmpty({ message: 'Age bracket is required' })
  @IsString()
  ageBracket!: string

  @IsOptional()
  @IsString()
  occupation?: string

  @IsOptional()
  @IsString()
  experienceLevel?: string

  @IsOptional()
  @IsString()
  goals?: string

  @IsNotEmpty({ message: 'Commitment response is required' })
  @IsString()
  commitment!: string

  @IsNotEmpty({ message: 'Reason for joining is required' })
  @IsString()
  why!: string

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
  feeStatus?: string

  @IsOptional()
  @IsString()
  paymentRef?: string

  @IsOptional()
  sendEmail?: boolean
}
