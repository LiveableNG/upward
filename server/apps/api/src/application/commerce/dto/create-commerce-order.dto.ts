import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CommerceOrderItemInputDto } from './preview-commerce-order.dto'

export class CreateCommerceOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  recipientName!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  recipientPhone!: string

  @IsString()
  @IsNotEmpty()
  deliveryAddress!: string

  @IsString()
  @IsOptional()
  @MaxLength(100)
  deliveryZoneTag?: string

  @IsString()
  @IsOptional()
  deliveryNotes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommerceOrderItemInputDto)
  @IsNotEmpty()
  items!: CommerceOrderItemInputDto[]

  @IsString()
  @IsOptional()
  @MaxLength(100)
  idempotencyKey?: string

  @IsString()
  @IsOptional()
  discountKobo?: string
}
