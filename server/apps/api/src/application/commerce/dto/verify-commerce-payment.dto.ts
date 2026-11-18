import { IsNotEmpty, IsString } from 'class-validator'

export class VerifyCommercePaymentDto {
  @IsString()
  @IsNotEmpty()
  reference!: string
}
