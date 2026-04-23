import { Injectable } from '@nestjs/common'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'

@Injectable()
export class RetryWebhookUseCase {
  constructor(private readonly webhookService: WebhookService) {}

  async execute(id: string) {
    return this.webhookService.retryWebhook(id)
  }
}
