import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateStudentEarlyAccessDto {
  @IsNotEmpty({ message: 'Name is required' })
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

  @IsNotEmpty({ message: 'Experience level is required' })
  @IsString()
  experienceLevel!: string

  @IsOptional()
  @IsString()
  interest?: string
}
