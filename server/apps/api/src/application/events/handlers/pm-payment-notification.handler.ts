import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { PmPaymentNotificationEvent } from '../definition/pm-payment-notification.event'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class PmPaymentNotificationHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<PmPaymentNotificationEvent>(
      'PmPaymentNotificationEvent',
      async (event) => {
        try {
          let pmUuid: string | undefined = undefined;
          if (event.corePrUuid) {
            const pr = await this.prisma.upward_pm_payment_request.findFirst({
              where: {
                paymentRequest: { uuid: event.corePrUuid }
              },
              include: {
                pm: true
              }
            });
            pmUuid = pr?.pm?.uuid;
          }

          // 1. Send Email
          await this.emailService.sendPaymentRequestEmail({
            email: event.email,
            tenantName: event.tenantName,
            pmName: event.pmName,
            amount: event.amount,
            currency: event.currency,
            dueDate: event.dueDate,
            description: event.description,
            paymentLink: event.paymentLink,
            pmType: event.pmType,
            pmUuid,
          });

          // 2. Send Push Notification if user exists
          const emailHash = this.encryption.hash(event.email);
          const coreUser = await this.prisma.upward_user.findUnique({
            where: { emailHash }
          });
          
          if (coreUser) {
            await this.notificationService.notifyUser(coreUser.id, {
              title: event.isReminder ? 'Payment Reminder' : 'New Payment Request',
              message: event.isReminder 
                ? `This is a reminder for your payment of ${event.currency} ${event.amount.toLocaleString()} from ${event.pmName}.`
                : `You have a new payment request for ${event.currency} ${event.amount.toLocaleString()} from ${event.pmName}.`,
              type: 'PAYMENT',
              url: `/pay/${event.corePrUuid}`,
            });
          }
        } catch (error) {
          console.error('Failed to handle PmPaymentNotificationEvent:', error);
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
