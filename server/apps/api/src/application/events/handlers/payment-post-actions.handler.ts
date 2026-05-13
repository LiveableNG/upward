import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { PaymentSucceededEvent } from '../definition/payment-succeeded.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PaymentUpdatedEvent } from '../definition/payment-updated.event'

@Injectable()
export class PaymentPostActionsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentPostActionsHandler.name)
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<PaymentSucceededEvent>(
      'payment.succeeded',
      async (event) => {
        const { data } = event
        
        try {
          if (data.rentPortion > 0 && data.propertyId) {
             const prop = await this.prisma.upward_user_property.findUnique({ where: { id: data.propertyId } })
             if (prop && prop.amountRemaining === 0) {
                await this.prisma.upward_notification.create({
                  data: {
                    userId: data.userId,
                    title: 'Credit Score Boost!',
                    message: `Congratulations! Your full rent payment has boosted your credit health.`,
                    type: 'SYSTEM'
                  }
                })
                this.logger.log(`Sent Credit Boost notification to user ${data.userId}`)
             }
          }

          if (data.platformId && data.paymentRequestId) {
             await this.publishWebhookEvent(data)
          }

        } catch (error) {
          this.logger.error(`Error in PaymentPostActionsHandler:`, error)
        }
      },
    )
  }

  private async publishWebhookEvent(data: any) {
    try {
      const currentItems = await this.prisma.upward_payment_line_item.findMany({ 
        where: { paymentRequestId: data.paymentRequestId } 
      })
      const rentItems = currentItems.filter((i: any) => i.name.toLowerCase().includes('rent'))
      const totalRentPaid = rentItems.reduce((sum: number, i: any) => sum + i.amountPaid, 0)
      const totalRentAmount = rentItems.reduce((sum: number, i: any) => sum + i.totalAmount, 0)
      const statusForWebhook = totalRentPaid >= totalRentAmount ? 'PAID' : 'PARTIAL'

      this.eventBus.publish(new PaymentUpdatedEvent(data.platformId, 'payment.updated', {
        paymentUuid: data.paymentRequestUuid,
        reference: data.reference,
        amountPaid: data.rentPortion,
        totalPaid: totalRentPaid,
        remainingAmount: Math.max(0, totalRentAmount - totalRentPaid),
        overpaymentAmount: data.excess,
        currency: data.currency,
        status: statusForWebhook,
        paidAt: new Date(),
        customerEmail: data.email
      }))
    } catch (e) {
      this.logger.error(`Failed to publish webhook event in handler:`, e)
    }
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe()
  }
}
