import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { InteractionEvent } from '@application/events/definition/interaction.event'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class InteractionHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<InteractionEvent>(
      'InteractionEvent',
      async (event) => {
        try {
          await this.prisma.upward_interaction.create({
            data: {
              visitorId: event.visitorId,
              type: event.type,
              target: event.target,
              abVariant: event.abVariant,
              ipAddress: event.ipAddress ?? null,
              userAgent: event.userAgent ?? null,
              metadata: event.metadata ?? null,
              createdAt: event.occurredOn,
            },
          })
        } catch (error) {
          console.error('Failed to log interaction to Prisma:', error)
          // Handle fail silently to not block the event pipeline
        }
      },
    )
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
