import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CommerceOrderItemInputDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  offeringId?: number

  @IsString()
  @IsOptional()
  offeringUuid?: string

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity!: number
}

export class PreviewCommerceOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommerceOrderItemInputDto)
  @IsNotEmpty()
  items!: CommerceOrderItemInputDto[]

  @IsString()
  @IsOptional()
  deliveryAddress?: string

  @IsString()
  @IsOptional()
  discountKobo?: string
}
