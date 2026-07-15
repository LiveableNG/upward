import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { PaymentSucceededEvent } from '../definition/payment-succeeded.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PaymentUpdatedEvent } from '../definition/payment-updated.event'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { SendRentReceiptEmailUseCase } from '../../use-cases/payments/send-rent-receipt-email.use-case'

@Injectable()
export class PaymentPostActionsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentPostActionsHandler.name)
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly sendRentReceiptEmail: SendRentReceiptEmailUseCase,
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
              .catch((err) => {
                this.logger.error(`Failed to send rent receipt email for transaction ${data.transactionId}:`, err)
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
                      await this.emailService.sendEmailWithRetry({
                        userId: pm.uuid,
                        email: pmEmail,
                        subject: `[Upward] Payment Received: Unit ${unitName} - ${propertyName}`,
                        html: `
                          <div style="background-color: #fafae6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #fffffb; border: 1px solid #e3e2cf; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 67, 50, 0.05);">
                              <!-- Header Banner -->
                              <div style="background-color: #1b4332; padding: 32px 24px; text-align: center;">
                                <h1 style="color: #fffff0; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Payment Received 🎉</h1>
                                <p style="color: #a3b899; font-size: 14px; margin: 8px 0 0 0;">Upward Property Management</p>
                              </div>
                              
                              <!-- Content Area -->
                              <div style="padding: 32px 24px;">
                                <p style="font-size: 16px; color: #2f3e35; margin-top: 0; line-height: 1.5;">Dear <strong>${pmName}</strong>,</p>
                                <p style="font-size: 14px; color: #506256; line-height: 1.5; margin-bottom: 24px;">
                                  We are pleased to inform you that your tenant <strong>${tenantName}</strong> has successfully completed a rent payment for <strong>Unit ${unitName}</strong> at <strong>${propertyName}</strong>.
                                </p>
                                
                                <div style="background-color: #fafae6; padding: 24px; border-radius: 12px; border: 1px solid #e3e2cf; margin: 24px 0; text-align: center;">
                                  <p style="margin: 0; font-size: 13px; color: #607366; text-transform: uppercase; letter-spacing: 0.5px;">Amount Received</p>
                                  <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 800; color: #1b4332;">NGN ${amount.toLocaleString()}</p>
                                </div>

                                <p style="font-size: 14px; color: #506256; line-height: 1.5;">You can view all your payment transactions, tenant ledgers, and payout details on your dashboard.</p>
                                
                                <div style="margin-top: 32px; text-align: center;">
                                  <a href="${baseUrl}/portal/payments" style="display: inline-block; background-color: #1b4332; color: #fffff0; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px;">Go to Payments</a>
                                </div>

                                <p style="margin-top: 32px; font-size: 11px; color: #88998e; text-align: center; border-top: 1px solid #e3e2cf; padding-top: 16px;">
                                  This is an automated notification sent by Upward. Please do not reply directly to this email.
                                </p>
                              </div>
                            </div>
                          </div>
                        `,
                        type: 'PM_PAYMENT_NOTIFICATION'
                      }).catch((err) => {
                        this.logger.error(`Failed to send email to PM ${pmEmail}:`, err);
                      });
                    }
                 }
               } catch (err) {
                 this.logger.error('Failed to trigger PM notification on payment success:', err);
               }
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

      const tx = await this.prisma.upward_transaction.findUnique({
        where: { id: data.transactionId }
      })

      const lineItemsPaid: Record<string, number> = {}
      if (tx && tx.lineItems && Array.isArray(tx.lineItems)) {
        const items = tx.lineItems as any[]
        for (const item of items) {
          const isFee = item.category === 'Fee' || 
                        ['Processing Fee', 'Upward Processing Fee', 'Upward & Provider Fee'].includes(item.name)
          if (!isFee) {
            lineItemsPaid[item.name] = (lineItemsPaid[item.name] || 0) + (item.amount || 0)
          }
        }
      } else {
        const fallbackName = data.narration || 'Rent'
        lineItemsPaid[fallbackName] = data.rentPortion
      }

      this.eventBus.publish(new PaymentUpdatedEvent(data.platformId, 'payment.updated', {
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
