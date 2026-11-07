import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { CustomerFulfilmentStatus } from '../../../domains/commerce/commerce-order.repository'

export class ConfirmSubOrderReceiptInputDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string
}

export interface ConfirmSubOrderReceiptResultDto {
  success: boolean
  message: string
  subOrderUuid: string
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  tenantConfirmedAt: Date
  orderStatus: string
}
