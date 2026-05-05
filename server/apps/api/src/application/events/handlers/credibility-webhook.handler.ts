import { Injectable, Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { EVENT_BUS, EventBus } from '../domain-event';
import { CredibilityRequestCreatedEvent } from '../definition/credibility-request-created.event';
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service';

@Injectable()
export class CredibilityWebhookHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly webhookService: WebhookService
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<CredibilityRequestCreatedEvent>(
      'CredibilityRequestCreatedEvent',
      async (event) => {
        try {
          await this.webhookService.sendWebhook(event.platformId, event.eventType, event.payload);
        } catch (error) {
          console.error(`[CredibilityWebhookHandler] Failed to send webhook for platform ${event.platformId}`, error);
        }
      }
    );
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }
}
