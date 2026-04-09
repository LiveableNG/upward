import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { EmailSentEvent } from '../../../application/events/definition/email-sent.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class EmailLogEventHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<EmailSentEvent>('EmailSentEvent', async (event) => {
      try {
        await this.prisma.upward_email_log.create({
          data: {
            userId: event.userId,
            email: event.email,
            subject: event.subject,
            type: event.type,
            status: event.status,
            sessionId: event.sessionId ?? null,
            body: event.body ?? null,
            mailgunId: event.mailgunId ?? null,
            lastError: event.lastError ?? null,
            retries: event.retries,
            sentAt: event.status === 'SENT' ? event.occurredOn : null,
          },
        })
      } catch (error) {
        console.error('Failed to log email event to Prisma:', error)
      }
    })
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
