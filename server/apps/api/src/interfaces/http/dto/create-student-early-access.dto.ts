import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator'

export class CreateStudentEarlyAccessDto {
  @ValidateIf((o) => !o.sourceIdentifier?.startsWith('webinar_join_') && !o.track?.includes('Attended'))
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string

  @IsNotEmpty({ message: 'WhatsApp number is required' })
  @IsString()
  @MinLength(6, { message: 'Enter a valid phone number' })
  whatsapp!: string

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string

  @ValidateIf((o) => !o.sourceIdentifier?.startsWith('webinar_join_') && !o.track?.includes('Attended'))
  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city?: string

  @ValidateIf((o) => !o.sourceIdentifier?.startsWith('webinar_join_') && !o.track?.includes('Attended'))
  @IsNotEmpty({ message: 'Age bracket is required' })
  @IsString()
  ageBracket?: string

  @ValidateIf((o) => !o.sourceIdentifier?.startsWith('webinar_join_') && !o.track?.includes('Attended'))
  @IsNotEmpty({ message: 'Experience level is required' })
  @IsString()
  experienceLevel?: string

  @IsOptional()
  @IsString()
  track?: string

  @IsOptional()
  @IsString()
  occupation?: string

  @IsOptional()
  @IsString()
  interest?: string

  @IsOptional()
  @IsString()
  sessionTime?: string

  @IsOptional()
  @IsString()
  sourceIdentifier?: string

  @IsOptional()
  @IsString()
  abVariant?: string
}
