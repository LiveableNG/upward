import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { PmPaymentNotificationEvent } from '../definition/pm-payment-notification.event'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class PmPaymentNotificationHandler implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<PmPaymentNotificationEvent>(
      'PmPaymentNotificationEvent',
      async (event) => {
        try {
          let pmUuid: string | undefined = undefined;
          let propertyName = 'Property';
          let unitName = 'Unit';

          if (event.corePrUuid) {
            const pr = await this.prisma.upward_pm_payment_request.findFirst({
              where: {
                paymentRequest: { uuid: event.corePrUuid }
              },
              include: {
                pm: true,
                unit: {
                  include: {
                    property: true
                  }
                }
              }
            });
            pmUuid = pr?.pm?.uuid;
            if (pr?.unit) {
              unitName = pr.unit.unitName;
              if (pr.unit.property) {
                propertyName = pr.unit.property.name;
              }
            }
          }

          // Unified Multi-Channel Dispatch (EMAIL, WHATSAPP, SMS)
          const requestedChannel = event.channels.includes('WHATSAPP')
            ? 'WHATSAPP'
            : event.channels.includes('SMS')
            ? 'SMS'
            : event.channels.includes('EMAIL')
            ? 'EMAIL'
            : undefined;

          await this.unifiedCommService.processCommunication({
            recipientEmail: event.email,
            recipientPhone: event.tenantPhoneNumber,
            recipientName: event.tenantName,
            recipientRole: 'TENANT',
            pmUuid,
            type: 'PAYMENT_REQUEST',
            forceChannel: requestedChannel,
            context: {
              displayName: event.tenantName,
              pmName: event.pmName,
              amount: event.amount,
              formattedAmount: `${event.currency} ${event.amount.toLocaleString()}`,
              currency: event.currency,
              dueDate: event.dueDate,
              description: event.description,
              paymentLink: event.paymentLink,
              pmRole: event.pmType,
              propertyName,
              unitName,
            },
          });

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
