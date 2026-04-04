import { IsEmail, IsString, IsOptional, MinLength, IsNotEmpty } from 'class-validator'

export class CompleteProfileDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsString()
  @IsNotEmpty()
  fullName!: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsOptional()
  invitedByCompanyId?: string

  @IsString()
  @IsOptional()
  invitedByCompanyName?: string

  @IsString()
  @IsOptional()
  invitedByCompanyLogo?: string

  @IsString()
  @IsOptional()
  rentAnniversary?: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  occupation?: string

  @IsString()
  @IsOptional()
  gender?: string

  @IsString()
  @IsOptional()
  dateOfBirth?: string
}
