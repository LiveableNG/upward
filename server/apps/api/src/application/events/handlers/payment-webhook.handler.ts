import { Injectable, Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { EVENT_BUS, EventBus } from '../domain-event';
import { PaymentUpdatedEvent } from '../definition/payment-updated.event';
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service';

@Injectable()
export class PaymentWebhookHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly webhookService: WebhookService
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<PaymentUpdatedEvent>(
      'PaymentUpdatedEvent',
      async (event) => {
        try {
          await this.webhookService.sendWebhook(event.platformId, event.eventType, {...event.payload, externalUnitId: event.externalUnitId as any});
        } catch (error) {
          // Log failure but don't crash since it's fire-and-forget
          console.error(`[PaymentWebhookHandler] Failed to send webhook for platform ${event.platformId}`, error);
        }
      }
    );
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }
}
