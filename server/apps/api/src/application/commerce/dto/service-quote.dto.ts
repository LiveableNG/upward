import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateServiceQuoteOrderDto {
  @IsOptional()
  @IsString()
  offeringUuid?: string

  @IsOptional()
  @IsInt()
  offeringId?: number

  @IsString()
  @IsNotEmpty({ message: 'Please describe your service request details' })
  @MaxLength(2000)
  requestDetails!: string

  @IsOptional()
  @IsString()
  @MaxLength(150)
  recipientName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  recipientPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryZoneTag?: string
}

export class PostCommerceOrderMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(2000)
  message!: string
}

export class AdminSetServiceQuoteDto {
  @IsNumber({}, { message: 'Quoted price must be a valid number in Naira' })
  @Min(100, { message: 'Quoted price must be at least ₦100' })
  quotedPriceNgn!: number

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  quoteNotes?: string
}

export class DeclineServiceQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

export class ServiceConfirmReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string
}
