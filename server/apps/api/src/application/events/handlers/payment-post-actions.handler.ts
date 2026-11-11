import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { PaymentSucceededEvent } from '../definition/payment-succeeded.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PaymentUpdatedEvent } from '../definition/payment-updated.event'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { SendRentReceiptEmailUseCase } from '../../use-cases/payments/send-rent-receipt-email.use-case'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { NotificationCopy } from '../../../shared/infrastructure/common/notification-copy'

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
    private readonly notificationService: NotificationService,
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

          // 1. Instant Mobile Push & In-App Payment Notifications (Full & Partial Payments)
          try {
            const tx = await this.prisma.upward_transaction.findUnique({
              where: { id: data.transactionId },
            })
            const prop = data.propertyId
              ? await this.prisma.upward_user_property.findUnique({ where: { id: data.propertyId } })
              : null

            const paidAmount = data.rentPortion || data.amount || tx?.amount || 0
            const currency = data.currency || tx?.currency || 'NGN'
            const formattedAmount = `${currency} ${paidAmount.toLocaleString()}`
            const remaining = tx?.remainingBalance ?? prop?.amountRemaining ?? 0
            const isPartial = tx?.isPartial === true || remaining > 0

            if (isPartial && remaining > 0) {
              const copy = NotificationCopy.tenant.partialRentPaymentReceived(paidAmount, remaining, currency)
              await this.notificationService.notifyUser(data.userId, {
                title: copy.title,
                message: copy.message,
                type: copy.type,
                url: copy.url,
                data: {
                  transactionId: String(data.transactionId),
                  transactionUuid: tx?.uuid || '',
                  isPartial: 'true',
                  remaining: String(remaining),
                },
              })
              this.logger.log(`Dispatched Partial Payment push notification to user ${data.userId}`)
            } else {
              const copy = NotificationCopy.tenant.rentPaymentSuccessful(paidAmount, currency)
              await this.notificationService.notifyUser(data.userId, {
                title: copy.title,
                message: copy.message,
                type: copy.type,
                url: copy.url,
                data: {
                  transactionId: String(data.transactionId),
                  transactionUuid: tx?.uuid || '',
                  isPartial: 'false',
                },
              })
              this.logger.log(`Dispatched Full Rent Payment push notification to user ${data.userId}`)
            }
          } catch (notifErr) {
            this.logger.error(`Failed to dispatch payment notification for user ${data.userId}:`, notifErr)
          }

          if (data.rentPortion > 0 && data.propertyId) {
             const prop = await this.prisma.upward_user_property.findUnique({ where: { id: data.propertyId } })

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
                   let pmPropertyId: number | null = null;
                   if (prop.pmUnitId) {
                     const unit = await this.prisma.upward_pm_unit.findUnique({
                       where: { id: prop.pmUnitId },
                       include: { property: true }
                     });
                     if (unit) {
                       unitName = unit.unitName;
                       propertyName = unit.property?.name || 'N/A';
                       pmPropertyId = unit.propertyId;
                     }
                   } else if (data.paymentRequestId) {
                     const pr = await (this.prisma as any).upward_pm_payment_request.findUnique({
                       where: { id: data.paymentRequestId },
                       include: { unit: { include: { property: true } } }
                     });
                     if (pr?.unit) {
                       unitName = pr.unit.unitName;
                       propertyName = pr.unit.property?.name || 'N/A';
                       pmPropertyId = pr.unit.propertyId;
                     }
                   }

                   const amount = data.rentPortion || data.amount;

                   // 1. Create PM in-app notification
                   const isPmPartial = prop.amountRemaining > 0
                   const pmCopy = isPmPartial
                     ? NotificationCopy.pm.partialRentPaymentReceived(tenantName, amount, prop.amountRemaining, unitName, propertyName, data.currency || 'NGN')
                     : NotificationCopy.pm.rentPaymentReceived(tenantName, amount, unitName, propertyName, data.currency || 'NGN')

                   await this.prisma.upward_pm_notification.create({
                     data: {
                       pmId: prop.pmId,
                       title: pmCopy.title,
                       message: pmCopy.message,
                       type: pmCopy.type,
                       isPopup: true, // Show popup alert
                       url: data.paymentRequestUuid ? `/payments/${data.paymentRequestUuid}` : '/payments',
                     }
                   });

                    // 2. Send email to PM
                    const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim();
                    const pmEmail = pm.email ? this.encryption.decrypt(pm.email) : null;
                    if (pmEmail) {
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

                    // 3. Send email to assigned employees
                    try {
                      const activeEmployees = await (this.prisma as any).upward_pm_employee.findMany({
                        where: {
                          ownerPmId: prop.pmId,
                          status: 'ACTIVE',
                        },
                        include: {
                          assignedProperties: true,
                        },
                      });

                      const assignedEmployees = activeEmployees.filter((emp: any) => {
                        if (emp.accessLevel === 'ALL') return true;
                        if (!pmPropertyId) return false;
                        return emp.assignedProperties?.some((ap: any) => ap.propertyId === pmPropertyId);
                      });

                      for (const emp of assignedEmployees) {
                        const empEmail = emp.email ? this.encryption.decrypt(emp.email) : null;
                        if (empEmail && empEmail !== pmEmail) {
                          const empFirstName = emp.firstName ? this.encryption.decrypt(emp.firstName) : '';
                          const empLastName = emp.lastName ? this.encryption.decrypt(emp.lastName) : '';
                          const empFullName = `${empFirstName} ${empLastName}`.trim() || 'Team Member';

                          await (this.prisma as any).upward_pm_notification.create({
                            data: {
                              pmId: prop.pmId,
                              employeeId: emp.id,
                              title: 'Payment Received',
                              message: `Tenant ${tenantName} completed payment of NGN ${amount.toLocaleString()} for Unit ${unitName} at ${propertyName}.`,
                              type: 'PAYMENT_COMPLETED',
                              isPopup: true,
                              url: data.paymentRequestUuid ? `/payments/${data.paymentRequestUuid}` : '/payments',
                            }
                          }).catch((err: any) => {
                            this.logger.error(`Failed to create in-app notification for employee ${emp.id}:`, err);
                          });

                          await this.unifiedCommService.processCommunication({
                            recipientEmail: empEmail,
                            recipientName: empFullName,
                            recipientRole: 'PM',
                            pmUuid: pm.uuid,
                            type: 'PM_PAYMENT_RECEIVED',
                            context: {
                              pmName: empFullName,
                              tenantName,
                              unitName,
                              propertyName,
                              amount,
                              formattedAmount: amount.toLocaleString(),
                              baseUrl,
                            },
                          }).catch((err) => {
                            this.logger.error(`Failed to send payment email to employee ${empEmail}:`, err);
                          });
                        }
                      }
                    } catch (empErr) {
                      this.logger.error('Failed to notify assigned employees of payment:', empErr);
                    }
                 }
               } catch (err) {
                 this.logger.error('Failed to trigger PM notification on payment success:', err);
               }
             }
          }
 
          if (data.platformId) {
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
          const isFee = item.category === 'Fee' || ['Upward Benefits'].includes(item.name)
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
