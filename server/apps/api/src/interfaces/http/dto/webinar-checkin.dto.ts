import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class WebinarCheckinDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @MinLength(6, { message: 'Enter a valid phone number' })
  whatsapp!: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  platform?: string

  @IsOptional()
  @IsString()
  track?: string

  @IsOptional()
  @IsString()
  sessionTime?: string

  @IsOptional()
  @IsString()
  sourceIdentifier?: string
}
