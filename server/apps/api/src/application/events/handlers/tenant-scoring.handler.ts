import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { TenantProfileUpdatedEvent } from '@application/events/definition/tenant-profile-updated.event'
import { TransactionCompletedEvent } from '@application/events/definition/transaction-completed.event'
import { CreditScoreService } from '@shared/infrastructure/common/credit-score.service'

@Injectable()
export class TenantScoringHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantScoringHandler.name)
  private profileSubs?: Subscription
  private txSubs?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing TenantScoringHandler subscriptions...')

    // Handle Profile Updates
    this.profileSubs = this.eventBus.subscribe<TenantProfileUpdatedEvent>(
      'TenantProfileUpdatedEvent',
      async (event) => {
        this.logger.debug(`Processing score for profile update: ${event.tenantId}`)
        try {
          await this.creditScoreService.updateTenantScore(event.tenantId)
        } catch (error) {
          this.logger.error(
            `Failed to handle TenantProfileUpdatedEvent for ${event.tenantId}:`,
            error,
          )
        }
      },
    )

    // Handle Completed Transactions
    this.txSubs = this.eventBus.subscribe<TransactionCompletedEvent>(
      'TransactionCompletedEvent',
      async (event) => {
        this.logger.debug(`Processing score for transaction: ${event.transactionId}`)
        try {
          await this.creditScoreService.updateTenantScore(event.tenantId)
        } catch (error) {
          this.logger.error(
            `Failed to handle TransactionCompletedEvent for ${event.tenantId}:`,
            error,
          )
        }
      },
    )
  }

  onModuleDestroy() {
    this.profileSubs?.unsubscribe()
    this.txSubs?.unsubscribe()
  }
}
