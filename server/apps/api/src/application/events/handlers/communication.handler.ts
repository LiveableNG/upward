import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event';
import { SendCommunicationEvent } from '../../../application/events/definition/send-communication.event';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';

@Injectable()
export class CommunicationEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunicationEventHandler.name);
  private subscription?: Subscription;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly unifiedCommunicationService: UnifiedCommunicationService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<SendCommunicationEvent>(
      SendCommunicationEvent.EVENT_NAME,
      async (event) => {
        try {
          this.logger.log(`Processing async communication event: ${event.payload.type}`);
          await this.unifiedCommunicationService.processCommunication(event.payload);
        } catch (err: any) {
          this.logger.error(
            `Failed to process async communication event ${event.payload.type}:`,
            err.stack || err.message,
          );
        }
      },
    );
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
