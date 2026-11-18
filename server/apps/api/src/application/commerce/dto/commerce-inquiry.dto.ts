import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateCommerceInquiryDto {
  @IsString()
  @IsNotEmpty()
  offeringUuid!: string

  @IsString()
  @IsNotEmpty()
  category!: string // 'GENERAL' | 'DELIVERY' | 'CUSTOMIZATION' | 'PRICING'

  @IsString()
  @IsNotEmpty()
  message!: string

  @IsString()
  @IsOptional()
  contactEmail?: string

  @IsString()
  @IsOptional()
  contactPhone?: string
}
