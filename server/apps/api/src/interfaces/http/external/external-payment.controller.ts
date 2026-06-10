import { Controller, Post, Get, Patch, Body, UseGuards, Req, Param } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { CreateExternalPaymentRequestUseCase } from '../../../application/use-cases/external/create-payment-request.use-case'
import { ExternalPaymentRequestPayloadDto, UpdateExternalPaymentRequestPayloadDto } from '../../../application/use-cases/external/external-api.dto'
import { GetPublicPaymentDetailsUseCase } from '../../../application/use-cases/external/get-public-payment.use-case'
import { ConfirmExternalPaymentUseCase } from '../../../application/use-cases/external/confirm-payment.use-case'
import { ResolveExternalPendingRefundUseCase, ExternalRefundResolutionAction } from '../../../application/use-cases/external/resolve-external-refund.use-case'
import { CancelExternalPaymentRequestUseCase } from '../../../application/use-cases/external/cancel-payment-request.use-case'
import { UpdateExternalPaymentRequestUseCase } from '../../../application/use-cases/external/update-payment-request.use-case'

@Controller('payment-request')
export class ExternalPaymentController {
  constructor(
    private readonly createPaymentRequestUseCase: CreateExternalPaymentRequestUseCase,
    private readonly getPublicPaymentDetailsUseCase: GetPublicPaymentDetailsUseCase,
    private readonly confirmExternalPaymentUseCase: ConfirmExternalPaymentUseCase,
    private readonly resolveExternalPendingRefundUseCase: ResolveExternalPendingRefundUseCase,
    private readonly cancelPaymentRequestUseCase: CancelExternalPaymentRequestUseCase,
    private readonly updatePaymentRequestUseCase: UpdateExternalPaymentRequestUseCase,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async createPaymentRequest(@Body() payload: ExternalPaymentRequestPayloadDto, @Req() req: any) {
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
  async confirmPayment(
    @Param('uuid') uuid: string, 
    @Body('reference') reference: string,
    @Body('lineItemPayments') lineItemPayments?: any[]
  ) {
    return this.confirmExternalPaymentUseCase.execute(uuid, reference, lineItemPayments)
  }

  @Post(':uuid/cancel')
  @UseGuards(ApiKeyGuard)
  async cancelPaymentRequest(@Param('uuid') uuid: string, @Req() req: any) {
    const platformId = req.platformId
    return this.cancelPaymentRequestUseCase.execute(platformId, uuid)
  }

  @Patch(':uuid')
  @UseGuards(ApiKeyGuard)
  async updatePaymentRequest(
    @Param('uuid') uuid: string,
    @Body() payload: UpdateExternalPaymentRequestPayloadDto,
    @Req() req: any
  ) {
    const platformId = req.platformId
    const result = await this.updatePaymentRequestUseCase.execute(platformId, uuid, payload)
    return {
      success: true,
      data: result
    }
  }

  @Post('transaction/:uuid/accept')
  @UseGuards(ApiKeyGuard)
  async acceptRefund(@Param('uuid') uuid: string, @Req() req: any) {
    const platformId = req.platformId
    return this.resolveExternalPendingRefundUseCase.execute(platformId, uuid, ExternalRefundResolutionAction.ACCEPT)
  }

  @Post('transaction/:uuid/reject')
  @UseGuards(ApiKeyGuard)
  async rejectRefund(@Param('uuid') uuid: string, @Req() req: any) {
    const platformId = req.platformId
    return this.resolveExternalPendingRefundUseCase.execute(platformId, uuid, ExternalRefundResolutionAction.REJECT)
  }
}

