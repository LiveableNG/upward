import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateLandlordEarlyAccessDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name!: string

  @IsNotEmpty({ message: 'WhatsApp number is required' })
  @IsString()
  @MinLength(6, { message: 'Enter a valid phone number' })
  whatsapp!: string

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city!: string

  @IsNotEmpty({ message: 'Property count is required' })
  @IsString()
  propertyCount!: string

  @IsNotEmpty({ message: 'Landlord status is required' })
  @IsString()
  landlordStatus!: string

  @IsNotEmpty({ message: 'Management style is required' })
  @IsString()
  managementStyle!: string
}
