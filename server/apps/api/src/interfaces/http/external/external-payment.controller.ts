import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { CreateExternalPaymentRequestUseCase, ExternalPaymentRequestPayload } from '@application/use-cases/external/create-payment-request.use-case'

@Controller('payment-request')
export class ExternalPaymentController {
  constructor(
    private readonly createPaymentRequestUseCase: CreateExternalPaymentRequestUseCase
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async createPaymentRequest(@Body() data: ExternalPaymentRequestPayload, @Req() req: any) {
    const platformId = req.platformId

    const result = await this.createPaymentRequestUseCase.execute(data, platformId)

    return {
      success: true,
      data: result
    }
  }
}
