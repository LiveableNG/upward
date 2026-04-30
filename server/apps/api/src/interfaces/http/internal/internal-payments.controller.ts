import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { CreateManualPaymentRequestUseCase } from '../../../application/use-cases/payments/payment.use-cases'

@Controller('internal/payments')
export class InternalPaymentsController {
  constructor(private readonly createManualRequestUc: CreateManualPaymentRequestUseCase) {}

  @Post('initialize-manual')
  @HttpCode(HttpStatus.OK)
  async initializeManual(@Body() body: any) {
    return this.createManualRequestUc.execute({
      userId: body.userId,
      amount: body.amount,
      landlordUuid: body.landlordUuid,
      landlordDetails: body.landlordDetails,
      propertyUuid: body.propertyUuid,
      metadata: body.metadata,
    })
  }
}
