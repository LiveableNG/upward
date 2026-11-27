import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common'
import {
  PaystackWebhookPayload,
  ProcessPaystackSavingsWebhookUseCase,
} from '../../../application/use-cases/rent-savings/process-paystack-savings-webhook.use-case'
import {
  ArmWebhookPayload,
  ProcessArmWebhookUseCase,
} from '../../../application/use-cases/rent-savings/process-arm-webhook.use-case'

@Controller('payments/webhooks/rent-savings')
export class RentSavingsWebhookController {
  private readonly logger = new Logger(RentSavingsWebhookController.name)

  constructor(
    private readonly processPaystackWebhookUseCase: ProcessPaystackSavingsWebhookUseCase,
    private readonly processArmWebhookUseCase: ProcessArmWebhookUseCase,
  ) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Body() payload: PaystackWebhookPayload,
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    this.logger.log(`Received Paystack savings webhook event: ${payload?.event}`)
    const rawBody: string | Buffer | undefined = req.rawBody ?? JSON.stringify(payload)
    return this.processPaystackWebhookUseCase.execute(payload, signature, rawBody)
  }

  @Post('arm')
  @HttpCode(HttpStatus.OK)
  async handleArmWebhook(@Body() payload: ArmWebhookPayload) {
    this.logger.log(`Received ARM Connect webhook: ${JSON.stringify(payload)}`)
    return this.processArmWebhookUseCase.execute(payload)
  }
}
