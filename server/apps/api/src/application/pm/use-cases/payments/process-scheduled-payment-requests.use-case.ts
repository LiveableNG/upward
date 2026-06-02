import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { CreateExternalPaymentRequestUseCase } from '../../../use-cases/external/create-payment-request.use-case';
import { ExternalPaymentRequestPayloadDto } from '../../../use-cases/external/external-api.dto';
import { 
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository,
  PM_UNIT_REPOSITORY, IUnitRepository,
  PM_TENANT_REPOSITORY, ITenantRepository
} from '../../../../domains/pm/IPropertyRepository';
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository as ICorePaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { EVENT_BUS, EventBus } from '../../../events/domain-event';
import { PmPaymentNotificationEvent } from '../../../events/definition/pm-payment-notification.event';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class ProcessScheduledPmPaymentRequestsUseCase {
  private readonly logger = new Logger(ProcessScheduledPmPaymentRequestsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly createExternalPaymentRequestUseCase: CreateExternalPaymentRequestUseCase,
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly corePaymentRepo: ICorePaymentRequestRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly pmTenantRepo: ITenantRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(): Promise<any> {
    this.logger.log('Checking for scheduled rent requests that are due for delivery...');
    const now = new Date();

    // 1. Fetch all scheduled requests that are due
    const scheduledRequests: any[] = await (this.prisma.upward_pm_payment_request as any).findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now }
      },
      include: {
        unit: { include: { property: true } },
        pm: true,
        tenant: true
      }
    });

    this.logger.log(`Found ${scheduledRequests.length} scheduled requests to process.`);
    const processedUuids: string[] = [];

    for (const pr of scheduledRequests) {
      try {
        const pm = pr.pm;
        const unit = pr.unit;

        if (!unit.isSynced || !unit.userPropertyUuid) {
          this.logger.warn(`Skipping scheduled request ${pr.uuid} because unit ${unit.unitName} is not synced`);
          continue;
        }

        // 2. Invoke gateway to register the payment request
        const payload: ExternalPaymentRequestPayloadDto = {
          userPropertyUuid: unit.userPropertyUuid ?? undefined,
          amount: pr.amount,
          dueDate: pr.rentEndDate ? pr.rentEndDate.toISOString().split('T')[0] : pr.dueDate.toISOString().split('T')[0],
          rentStartDate: pr.rentStartDate ? pr.rentStartDate.toISOString().split('T')[0] : undefined,
          rentEndDate: pr.rentEndDate ? pr.rentEndDate.toISOString().split('T')[0] : undefined,
          description: pr.description || undefined,
          allowPartial: pr.allowPartial,
          minAmount: pr.allowPartial === false ? 0 : (pr.minAmount ?? undefined),
          bankCode: pm.bankCode ?? undefined,
          accountNumber: pm.accountNumber ?? undefined,
        };

        const result = await this.createExternalPaymentRequestUseCase.execute(payload, 0);

        const corePR = await this.corePaymentRepo.findByUuid(result.paymentUuid);
        if (!corePR) {
          throw new Error('Failed to synchronize scheduled request with payment gateway');
        }

        // 3. Calculate reminder frequency if configured
        let nextReminderAt: Date | null = null;
        if (pr.reminderFrequency && pr.reminderFrequency !== 'NONE') {
          nextReminderAt = new Date();
          nextReminderAt.setDate(nextReminderAt.getDate() + 1); // Start tomorrow
          nextReminderAt.setHours(9, 0, 0, 0); // 9 AM
        }

        // 4. Update scheduled request state to PENDING and associate paymentRequestId
        await this.pmPaymentRepo.update(pr.uuid, {
          paymentRequestId: corePR.id ?? null,
          status: 'PENDING',
          nextReminderAt,
        });

        // 5. Send Tenant Payment notification email/event
        if (unit.tenantId) {
          const tenant = await this.pmTenantRepo.findById(unit.tenantId);
          if (tenant && tenant.email) {
            const pmName = pm.businessName || `${pm.firstName} ${pm.lastName}`;
            const decryptedTenantEmail = tenant.emailEncrypted ? this.encryption.decrypt(tenant.emailEncrypted) : null;
            const decryptedTenantName = tenant.firstNameEncrypted ? this.encryption.decrypt(tenant.firstNameEncrypted) : 'Tenant';
            const decryptedPmName = pmName ? this.encryption.decrypt(pmName) : 'Property Manager';

            if (decryptedTenantEmail) {
              this.eventBus.publish(new PmPaymentNotificationEvent(
                decryptedTenantEmail,
                decryptedTenantName,
                decryptedPmName,
                pr.amount,
                unit.currency || 'NGN',
                pr.rentEndDate ? pr.rentEndDate.toISOString().split('T')[0] : pr.dueDate.toISOString().split('T')[0],
                pr.description,
                result.paymentLink,
                corePR.uuid,
                false,
                pm.pmType
              ));
            }
          }
        }

        // 6. Generate PM in-app notification
        await this.prisma.upward_pm_notification.create({
          data: {
            pmId: pm.id,
            title: 'Scheduled Rent Request Sent 🚀',
            message: `Your scheduled rent request of NGN ${pr.amount.toLocaleString()} for Unit ${unit.unitName} has been successfully sent to the tenant.`,
            type: 'PAYMENT_DUE',
            isPopup: false,
            url: '/dashboard',
          }
        });

        // 7. Send PM confirmation email (in forest green and ivory theme)
        const pmEmail = pm.email ? this.encryption.decrypt(pm.email) : null;
        if (pmEmail) {
          const pmFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName) : '';
          const pmLastName = pm.lastName ? this.encryption.decrypt(pm.lastName) : '';
          const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : '';
          const pmName = decryptedBusinessName || `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager';

          const emailHtml = `
            <div style="background-color: #fafae6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #fffffb; border: 1px solid #e3e2cf; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 67, 50, 0.05);">
                <!-- Header Banner -->
                <div style="background-color: #1b4332; padding: 32px 24px; text-align: center;">
                  <h1 style="color: #fffff0; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Scheduled Rent Request Sent 🚀</h1>
                  <p style="color: #a3b899; font-size: 14px; margin: 8px 0 0 0;">Upward Property Management</p>
                </div>
                
                <!-- Content Area -->
                <div style="padding: 32px 24px;">
                  <p style="font-size: 16px; color: #2f3e35; margin-top: 0; line-height: 1.5;">Dear <strong>${pmName}</strong>,</p>
                  <p style="font-size: 14px; color: #506256; line-height: 1.5; margin-bottom: 24px;">
                    This is to confirm that your scheduled rent request has been automatically sent to your tenant today.
                  </p>
                  
                  <div style="background-color: #fafae6; padding: 24px; border-radius: 12px; border: 1px solid #e3e2cf; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #2f3e35;">
                      <tr style="border-bottom: 1px solid #e3e2cf;">
                        <td style="padding: 8px 0; font-weight: 600; color: #607366;">Unit / Property</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 700;">Unit ${unit.unitName} (${unit.property?.name || 'N/A'})</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e3e2cf;">
                        <td style="padding: 8px 0; font-weight: 600; color: #607366;">Amount</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1b4332;">NGN ${pr.amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #607366;">Due Date</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 700;">${pr.dueDate.toDateString()}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="font-size: 14px; color: #506256; line-height: 1.5;">You can view and manage all properties, payments, and notifications directly from your Upward dashboard.</p>
                  
                  <div style="margin-top: 32px; text-align: center;">
                    <a href="https://upward.ng/portal/dashboard" style="display: inline-block; background-color: #1b4332; color: #fffff0; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px;">Open PM Dashboard</a>
                  </div>

                  <p style="margin-top: 32px; font-size: 11px; color: #88998e; text-align: center; border-top: 1px solid #e3e2cf; padding-top: 16px;">
                    This is an automated notification sent by Upward. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            </div>
          `;

          await this.emailService.sendEmailWithRetry({
            userId: pm.uuid,
            email: pmEmail,
            subject: `[Upward] Scheduled Rent Request Sent: Unit ${unit.unitName}`,
            html: emailHtml,
            type: 'PM_RENT_DIGEST'
          }).catch((err) => {
            this.logger.error(`Failed to send activation email to PM ${pmEmail}:`, err);
          });
        }
        // 8. Handle Recurrence by cloning the scheduled request for the next period
        if ((pr as any).isRecurring && (pr as any).recurrenceInterval) {
          const interval = (pr as any).recurrenceInterval;
          
          let nextScheduledAt: Date | null = null;
          let nextDueDate: Date | null = null;
          let nextRentStart: Date | null = null;
          let nextRentEnd: Date | null = null;

          const advanceDate = (date: Date, intervalStr: string): Date => {
            const d = new Date(date);
            if (intervalStr === 'MONTHLY') d.setMonth(d.getMonth() + 1);
            else if (intervalStr === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
            else if (intervalStr === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
            return d;
          };

          if ((pr as any).scheduledAt) nextScheduledAt = advanceDate((pr as any).scheduledAt, interval);
          if (pr.dueDate) nextDueDate = advanceDate(pr.dueDate, interval);
          if (pr.rentStartDate) nextRentStart = advanceDate(pr.rentStartDate, interval);
          if (pr.rentEndDate) nextRentEnd = advanceDate(pr.rentEndDate, interval);

          await this.prisma.upward_pm_payment_request.create({
            data: {
              pmId: pm.id,
              unitId: unit.id,
              tenantId: unit.tenantId,
              paymentRequestId: null,
              amount: pr.amount,
              currency: unit.currency || 'NGN',
              description: pr.description,
              dueDate: nextDueDate || new Date(),
              rentStartDate: nextRentStart,
              rentEndDate: nextRentEnd,
              rentType: pr.rentType,
              reminderFrequency: pr.reminderFrequency,
              nextReminderAt: null,
              reminderCount: 0,
              status: 'SCHEDULED',
              amountPaid: 0,
              allowPartial: pr.allowPartial,
              minAmount: pr.minAmount,
              scheduledAt: nextScheduledAt,
              isRecurring: true,
              recurrenceInterval: interval
            }
          });
          
          this.logger.log(`Created recurring clone for request ${pr.uuid} scheduled for ${nextScheduledAt}`);
        }

        processedUuids.push(pr.uuid);
      } catch (err) {
        this.logger.error(`Failed to activate scheduled request ${pr.uuid}:`, err);
      }
    }

    return processedUuids;
  }
}
