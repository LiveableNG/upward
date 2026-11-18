import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common'
import {
  PaystackWebhookPayload,
  ProcessPaystackSavingsWebhookUseCase,
} from '../../../application/use-cases/rent-savings/process-paystack-savings-webhook.use-case'

@Controller('payments/webhooks/rent-savings')
export class RentSavingsWebhookController {
  private readonly logger = new Logger(RentSavingsWebhookController.name)

  constructor(
    private readonly processPaystackWebhookUseCase: ProcessPaystackSavingsWebhookUseCase,
  ) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Body() payload: PaystackWebhookPayload,
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    this.logger.log(`Received Paystack webhook event: ${payload?.event}`)
    // req.rawBody is captured if rawBody option is enabled, otherwise stringified body
    const rawBody = req.rawBody || JSON.stringify(payload)
    return this.processPaystackWebhookUseCase.execute(payload, signature, rawBody)
  }

  @Post('arm')
  @HttpCode(HttpStatus.OK)
  async handleArmWebhook(@Body() payload: any) {
    this.logger.log(`Received ARM Connect webhook: ${JSON.stringify(payload)}`)
    // Handle ARM CRM customer or merchant approval callbacks
    return {
      status: 'success',
      received: true,
      membershipId: payload?.membershipId || payload?.CustomerMembershipId,
    }
  }
}
