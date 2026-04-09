import { Injectable, Logger, Inject } from '@nestjs/common'
import { WEBHOOK_REPOSITORY, IWebhookRepository } from '../../../../domains/payments/payment.repository'
import { PLATFORM_REPOSITORY, PlatformRepository } from '../../../../domains/companies/company.repository'
import { Cron, CronExpression } from '@nestjs/schedule'

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)
  private readonly MAX_RETRIES = 5

  constructor(
    @Inject(WEBHOOK_REPOSITORY) private readonly webhookRepo: IWebhookRepository,
    @Inject(PLATFORM_REPOSITORY) private readonly platformRepo: PlatformRepository,
  ) {}

  async sendWebhook(platformId: number, event: string, payload: any) {
    const platform = await this.platformRepo.findById(platformId)
    if (!platform || !platform.webhookUrl) {
      this.logger.warn(`No webhook URL found for platform ID: ${platformId}`)
      return
    }

    const log = await this.webhookRepo.create({
      platformId,
      event,
      url: platform.webhookUrl,
      payload,
      status: 'PENDING',
      retries: 0,
    })

    await this.dispatch(log)
  }

  private async dispatch(log: any) {
    try {
      this.logger.log(`Dispatching webhook ${log.event} to ${log.url} (Attempt ${log.retries + 1})`)

      const response = await fetch(log.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.payload),
      })

      if (response.ok) {
        await this.webhookRepo.update(log.id, {
          status: 'SENT',
          responseCode: response.status,
          lastTriedAt: new Date(),
        })
        this.logger.log(`Webhook ${log.id} sent successfully.`)
      } else {
        throw new Error(`Platform returned ${response.status}`)
      }
    } catch (error: any) {
      this.logger.error(`Webhook delivery failed for ${log.id}: ${error.message}`)
      
      await this.webhookRepo.update(log.id, {
        status: 'FAILED',
        responseCode: error.response?.status || 0,
        errorMessage: error.message,
        retries: log.retries + 1,
        lastTriedAt: new Date(),
      })
    }
  }

  @Cron('*/15 * * * *')
  async retryFailedWebhooks() {
    this.logger.log('Running scheduled webhook retry job...')
    const failedLogs = await this.webhookRepo.findToRetry(this.MAX_RETRIES)
    
    for (const log of failedLogs) {
      // Simple logic: only retry if it's been at least 15m since last try
      const lastTry = log.lastTriedAt ? new Date(log.lastTriedAt).getTime() : 0
      const now = Date.now()
      
      // Basic backoff: retries * 15m
      if (now - lastTry >= log.retries * 15 * 60 * 1000) {
        await this.dispatch(log)
      }
    }
  }
}
