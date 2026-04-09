import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { AdminDeletedEvent } from '../../../application/events/definition/admin-deleted.event'
import { WaitlistUserDeletedEvent } from '../../../application/events/definition/waitlist-user-deleted.event'
import { AdminCreatedEvent } from '../../../application/events/definition/admin-created.event'
import { AdminRoleChangedEvent } from '../../../application/events/definition/admin-role-changed.event'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'

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

    this.subscription.add(
      this.eventBus.subscribe<WaitlistUserDeletedEvent>(
        'WaitlistUserDeletedEvent',
        async (event) => {
          await this.adminLogService.logAction(
            event.perpetratorId,
            'DELETE_USER',
            `Deleted user: ${event.targetEmail} (${event.targetUserId})`,
          )
        },
      ),
    )

    this.subscription.add(
      this.eventBus.subscribe<AdminCreatedEvent>('AdminCreatedEvent', async (event) => {
        await this.adminLogService.logAction(
          event.perpetratorId,
          'ADD_ADMIN',
          `Created new admin: ${event.targetEmail} (${event.targetRole})`,
          event.ip,
          event.ua,
        )
      }),
    )

    this.subscription.add(
      this.eventBus.subscribe<AdminRoleChangedEvent>('AdminRoleChangedEvent', async (event) => {
        await this.adminLogService.logAction(
          event.perpetratorId,
          'UPDATE_ADMIN_ROLE',
          `Changed role for ${event.targetAdminId} from ${event.oldRole} to ${event.newRole}`,
          event.ip,
          event.ua,
        )
      }),
    )
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
