import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { PaymentSucceededEvent } from '../definition/payment-succeeded.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PaymentUpdatedEvent } from '../definition/payment-updated.event'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { SendRentReceiptEmailUseCase } from '../../use-cases/payments/send-rent-receipt-email.use-case'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class PaymentPostActionsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentPostActionsHandler.name)
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly sendRentReceiptEmail: SendRentReceiptEmailUseCase,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<PaymentSucceededEvent>(
      'payment.succeeded',
      async (event) => {
        const { data } = event
        
        try {
          if (data.rentPortion > 0) {
            this.sendRentReceiptEmail
              .execute({ transactionId: data.transactionId, propertyId: data.propertyId })
              .then((result) => {
                if (result.emailSent || result.whatsappSent) {
                  this.logger.log(
                    `Rent receipt delivery for transaction ${data.transactionId}: email=${result.emailSent}, whatsapp=${result.whatsappSent}`,
                  )
                }
              })
              .catch((err) => {
                this.logger.error(`Failed to send rent receipt for transaction ${data.transactionId}:`, err)
              })
          }

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

             if (prop && prop.pmId) {
               try {
                 const pm = await this.prisma.upward_property_manager.findUnique({
                   where: { id: prop.pmId }
                 });

                 const tenantUser = await this.prisma.upward_user.findUnique({
                   where: { id: data.userId }
                 });

                 if (pm && tenantUser) {
                   const tenantFirstName = this.encryption.decrypt(tenantUser.firstName);
                   const tenantLastName = this.encryption.decrypt(tenantUser.lastName);
                   const tenantName = `${tenantFirstName} ${tenantLastName}`;

                   const pmFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName) : '';
                   const pmLastName = pm.lastName ? this.encryption.decrypt(pm.lastName) : '';
                   const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : '';
                   const pmName = decryptedBusinessName || `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager';

                   let unitName = 'N/A';
                   let propertyName = 'N/A';
                   if (prop.pmUnitId) {
                     const unit = await this.prisma.upward_pm_unit.findUnique({
                       where: { id: prop.pmUnitId },
                       include: { property: true }
                     });
                     if (unit) {
                       unitName = unit.unitName;
                       propertyName = unit.property?.name || 'N/A';
                     }
                   }

                   const amount = data.rentPortion || data.amount;

                   // 1. Create PM in-app notification
                   await this.prisma.upward_pm_notification.create({
                     data: {
                       pmId: prop.pmId,
                       title: 'Payment Received',
                       message: `Tenant ${tenantName} completed payment of NGN ${amount.toLocaleString()} for Unit ${unitName} at ${propertyName}.`,
                       type: 'PAYMENT_COMPLETED',
                       isPopup: true, // Show popup alert
                       url: data.paymentRequestUuid ? `/payments/${data.paymentRequestUuid}` : '/payments',
                     }
                   });

                    // 2. Send email to PM
                    const pmEmail = pm.email ? this.encryption.decrypt(pm.email) : null;
                    if (pmEmail) {
                      const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim();
                      
                      await this.unifiedCommService.processCommunication({
                        recipientEmail: pmEmail,
                        recipientName: pmName,
                        recipientRole: 'PM',
                        pmUuid: pm.uuid,
                        type: 'PM_PAYMENT_RECEIVED',
                        context: {
                          pmName,
                          tenantName,
                          unitName,
                          propertyName,
                          amount,
                          formattedAmount: amount.toLocaleString(),
                          baseUrl,
                        },
                      }).catch((err) => {
                        this.logger.error(`Failed to send communication to PM ${pmEmail}:`, err);
                      });
                    }
                 }
               } catch (err) {
                 this.logger.error('Failed to trigger PM notification on payment success:', err);
               }
             }
          }
 
          if (data.platformId && data.externalUnitId) {
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
      let statusForWebhook: 'PAID' | 'PARTIAL' = 'PAID'
      if (data.paymentRequestId) {
        const currentItems = await this.prisma.upward_payment_line_item.findMany({
          where: { paymentRequestId: data.paymentRequestId }
        })
        const rentItems = currentItems.filter((i: any) => i.name.toLowerCase().includes('rent'))
        const totalRentPaid = rentItems.reduce((sum: number, i: any) => sum + i.amountPaid, 0)
        const totalRentAmount = rentItems.reduce((sum: number, i: any) => sum + i.totalAmount, 0)
        statusForWebhook = totalRentPaid >= totalRentAmount ? 'PAID' : 'PARTIAL'
      }

      const tx = await this.prisma.upward_transaction.findUnique({
        where: { id: data.transactionId }
      })

      const lineItemsPaid: Record<string, number> = {}
      if (tx && tx.lineItems && Array.isArray(tx.lineItems)) {
        const items = tx.lineItems as any[]
        for (const item of items) {
          const isFee = item.category === ['Upward Benefits'].includes(item.name)
          if (!isFee) {
            lineItemsPaid[item.name] = (lineItemsPaid[item.name] || 0) + (item.amount || 0)
          }
        }
      } else {
        const fallbackName = data.narration || 'Rent'
        lineItemsPaid[fallbackName] = data.rentPortion
      }

      this.eventBus.publish(new PaymentUpdatedEvent(data.platformId, data.externalUnitId, 'payment.updated', {
        paymentUuid: data.paymentRequestUuid,
        transactionUuid: tx?.uuid,
        reference: data.reference,
        lineItems: lineItemsPaid,
        currency: data.currency,
        status: statusForWebhook,
        paidAt: new Date(),
        customerEmail: data.email,
        isUnderpayment: tx?.settlementStatus === 'PENDING_REFUND',
        settlementStatus: tx?.settlementStatus
      }))
    } catch (e) {
      this.logger.error(`Failed to publish webhook event in handler:`, e)
    }
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe()
  }
}
