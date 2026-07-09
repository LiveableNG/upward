import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { ProcessPaymentWebhookUseCase } from '../payments/payment.use-cases'
import { WEBHOOK_REPOSITORY, IWebhookRepository } from '../../../domains/payments/payment.repository'

@Injectable()
export class RetryWebhookUseCase {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly processPaymentWebhookUc: ProcessPaymentWebhookUseCase,
    @Inject(WEBHOOK_REPOSITORY) private readonly webhookRepo: IWebhookRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: string) {
    const log = await this.webhookRepo.findById(id)
    if (!log) throw new Error('Webhook log not found')

    if (log.direction === 'INCOMING') {
      const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || ''
      const bodyString = JSON.stringify(log.payload)
      const signature = createHmac('sha512', secret).update(bodyString).digest('hex')

      try {
        await this.processPaymentWebhookUc.execute(log.payload, signature)
        await this.webhookRepo.update(id, {
          status: 'SUCCESS',
          errorMessage: undefined,
          retries: log.retries + 1,
          lastTriedAt: new Date()
        })
        return { success: true }
      } catch (error: any) {
        await this.webhookRepo.update(id, {
          status: 'FAILED',
          errorMessage: error.message || String(error),
          retries: log.retries + 1,
          lastTriedAt: new Date()
        })
        throw error
      }
    } else {
      return this.webhookService.retryWebhook(id)
    }
  }
}
