import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { AdminDeletedEvent } from '@application/events/admin-deleted.event'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'

@Injectable()
export class AdminAuditEventHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly adminLogService: AdminLogService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<AdminDeletedEvent>(
      'AdminDeletedEvent',
      async (event) => {
        await this.adminLogService.logAction(
          event.perpetratorId,
          'DELETE_ADMIN',
          `Deleted admin account: ${event.targetEmail} (${event.targetAdminId})`,
          event.ip,
          event.ua,
        )
      },
    )
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
