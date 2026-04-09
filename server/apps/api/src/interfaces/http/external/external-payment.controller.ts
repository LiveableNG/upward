import { Controller, Post, Get, Body, UseGuards, Req, Param } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { CreateExternalPaymentRequestUseCase, ExternalPaymentRequestPayload } from '@application/use-cases/external/create-payment-request.use-case'
import { GetPublicPaymentDetailsUseCase } from '@application/use-cases/external/get-public-payment.use-case'
import { ConfirmExternalPaymentUseCase } from '@application/use-cases/external/confirm-payment.use-case'

@Controller('payment-request')
export class ExternalPaymentController {
  constructor(
    private readonly createPaymentRequestUseCase: CreateExternalPaymentRequestUseCase,
    private readonly getPublicPaymentDetailsUseCase: GetPublicPaymentDetailsUseCase,
    private readonly confirmExternalPaymentUseCase: ConfirmExternalPaymentUseCase,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async createPaymentRequest(@Body() payload: ExternalPaymentRequestPayload, @Req() req: any) {
    const platformId = req.platformId
    const result = await this.createPaymentRequestUseCase.execute(payload, platformId)
    return {
      success: true,
      data: result
    }
  }

  @Get(':uuid')
  async getPaymentDetails(@Param('uuid') uuid: string) {
    const result = await this.getPublicPaymentDetailsUseCase.execute(uuid)
    return {
      success: true,
      data: result
    }
  }

  @Post(':uuid/confirm')
  async confirmPayment(@Param('uuid') uuid: string, @Body('reference') reference: string) {
    return this.confirmExternalPaymentUseCase.execute(uuid, reference)
  }
}
