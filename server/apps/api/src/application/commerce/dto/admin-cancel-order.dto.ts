import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class AdminCancelOrderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Please provide a valid cancellation reason (minimum 3 characters)' })
  reason!: string
}
