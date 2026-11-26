import { IsBoolean, IsOptional } from 'class-validator'

export class InitializeCommercePaymentDto {
  @IsBoolean()
  @IsOptional()
  applyVoucher?: boolean
}

export interface InitializeCommercePaymentResponse {
  authorizationUrl: string
  accessCode?: string
  reference: string
  orderNumber: string
  amountKobo: string
  currency: string
  paidWithVoucher?: boolean
  discountKobo?: string
}
