import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { TenantSyncedEvent } from '../definition/tenant-synced.event'
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'
import { ResolveDedicatedAccountUseCase } from '../../use-cases/payments/payment.use-cases'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class TenantSyncHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantSyncHandler.name)
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<TenantSyncedEvent>(
      'TenantSyncedEvent',
      (event) => {
        // Defer execution entirely to run asynchronously in a future event loop tick
        setImmediate(async () => {
          try {
            await this.handleTenantSync(event)
          } catch (error: any) {
            this.logger.error(`Error handling TenantSyncedEvent asynchronously: ${error.message}`, error.stack)
          }
        })
      },
    )
  }

  private async handleTenantSync(event: TenantSyncedEvent): Promise<void> {
    this.logger.log(`Handling background tenant sync for ${event.tenantEmail} with ${event.properties.length} properties`)

    for (const propData of event.properties) {
      try {
        let subaccountId = null

        // 1. Provision Subaccount if bank details are present
        if (propData.bankCode && propData.accountNumber) {
          this.logger.log(`Provisioning subaccount for property ${propData.propertyId}...`)
          const subaccount = await this.paymentGateway.findOrCreateSubaccount({
            businessName: propData.businessName || 'Property Owner',
            bankCode: propData.bankCode,
            accountNumber: propData.accountNumber,
          })
          if (subaccount?.id) {
            subaccountId = subaccount.id
            await this.prisma.upward_user_property.update({
              where: { id: propData.propertyId },
              data: { subaccountId },
            })
            this.logger.log(`Subaccount successfully linked to property ${propData.propertyId}: ${subaccountId}`)
          }
        }

        // 2. Pre-provision Dedicated Virtual Account (DVA)
        this.logger.log(`Provisioning Dedicated Virtual Account (DVA) for property ${propData.propertyId}...`)
        await this.resolveDedicatedAccount.execute({
          userPropertyId: propData.propertyId,
          tenantEmail: event.tenantEmail,
          tenantName: event.tenantName,
          tenantPhone: event.tenantPhone,
        })
        this.logger.log(`DVA successfully provisioned for property ${propData.propertyId}`)
      } catch (error: any) {
        this.logger.error(`Failed to complete background provisioning for property ${propData.propertyId}: ${error.message}`, error.stack)
      }
    }
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
