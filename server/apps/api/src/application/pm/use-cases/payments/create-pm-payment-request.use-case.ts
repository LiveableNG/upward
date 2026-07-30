import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { 
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository,
  PM_UNIT_REPOSITORY, IUnitRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository as ICorePaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { CreateExternalPaymentRequestUseCase } from '../../../use-cases/external/create-payment-request.use-case';
import { ExternalPaymentRequestPayloadDto } from '../../../use-cases/external/external-api.dto';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { PM_TENANT_REPOSITORY, ITenantRepository } from '../../../../domains/pm/IPropertyRepository';
import { EVENT_BUS, EventBus } from '../../../events/domain-event';
import { PmPaymentNotificationEvent } from '../../../events/definition/pm-payment-notification.event';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';
import { SubscriptionService, FeatureKey } from '../../../../domains/subscription/subscription.service';

export interface CreatePmPaymentRequestDto {
  unitUuid: string;
  amount: number;
  dueDate: string;
  rentStartDate?: string;
  rentEndDate?: string;
  description?: string;
  allowPartial?: boolean;
  minAmount?: number;
  lineItems?: { name: string; amount: number }[];
  rentType?: string;
  reminderFrequency?: string;
  scheduledAt?: string; // Future scheduled delivery time
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
  silent?: boolean;
}

@Injectable()
export class CreatePmPaymentRequestUseCase {
  constructor(
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
    private readonly activityLog: ActivityLogService,
    private readonly createExternalPaymentRequestUseCase: CreateExternalPaymentRequestUseCase,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(pmId: number, data: CreatePmPaymentRequestDto): Promise<any> {
    const unit = await this.unitRepo.findByUuid(data.unitUuid);
    if (!unit) throw new NotFoundException('Unit not found');

    if (!unit.isSynced || !unit.userPropertyUuid) {
      throw new BadRequestException('Unit must be synced to Upward Pay before requesting payments');
    }

    const prisma = (this.unitRepo as any).prisma;
    const property = await prisma.upward_pm_property.findUnique({
        where: { id: unit.propertyId },
        include: { collaborators: true }
    });
    if (!property) throw new NotFoundException('Property not found');

    // Check collaborator access
    let hasAccess = property.pmId === pmId;
    if (!hasAccess) {
      const isCollab = property.collaborators.some((c: any) => c.collaboratorPmId === pmId);
      if (isCollab) {
        hasAccess = true;
      } else {
        const teamCollab = await prisma.upward_pm_team_collaboration.findFirst({
          where: {
            collaboratorPmId: pmId,
            ownerPmId: property.pmId,
            status: 'ACCEPTED',
            accessLevel: 'ALL'
          }
        });
        if (teamCollab) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      throw new NotFoundException('Unit not found');
    }

    const ownerPmId = property.pmId;
    const pm = await this.pmRepo.findById(ownerPmId);
    if (!pm) throw new NotFoundException('Property Manager not found');

    if (!pm.bankCode || !pm.accountNumber) {
      throw new BadRequestException('Please set up your bank information in settings to receive payments');
    }

    // Programmatically gate premium features under SERVICE_CHARGE_PAYMENTS
    const isScheduled = data.scheduledAt && new Date(data.scheduledAt) > new Date();
    const isRecurring = data.isRecurring;
    const hasReminders = data.reminderFrequency && data.reminderFrequency !== 'NONE';
    const hasMultipleLineItems = data.lineItems && (
      data.lineItems.length > 1 || 
      (data.lineItems.length === 1 && data.lineItems[0]?.name !== 'Rent')
    );

    const isPremiumFeatureUsed = isScheduled || isRecurring || hasReminders || hasMultipleLineItems;

    if (isPremiumFeatureUsed) {
      const check = await this.subscriptionService.checkAccess(ownerPmId, FeatureKey.SERVICE_CHARGE_PAYMENTS);
      if (!check.hasAccess) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Premium payment features (scheduling, recurring, reminders, and custom line items) are locked under your current plan.',
          code: 'FEATURE_LOCKED',
          requiredTier: check.requiredTier,
          reason: check.reason,
        });
      }
    }

    if (unit.tenantId) {
      const tenant = await this.pmTenantRepo.findById(unit.tenantId);
      if (tenant && !tenant.hasReceivedWelcomeTemplate) {
        throw new BadRequestException('You must send the Welcome system template to this tenant before requesting payment.');
      }
    }
    
    let corePRId: number | null = null;
    let status = 'PENDING';
    let paymentLink = '';
    let corePRUuid = '';

    if (!isScheduled) {
      const payload: ExternalPaymentRequestPayloadDto = {
        userPropertyUuid: unit.userPropertyUuid ?? undefined,
        amount: data.amount,
        dueDate: data.rentEndDate || data.dueDate,
        rentStartDate: data.rentStartDate,
        rentEndDate: data.rentEndDate,
        description: data.description,
        allowPartial: data.allowPartial,
        minAmount: data.allowPartial === false ? 0 : data.minAmount,
        lineItems: data.lineItems,
        rentType: data.rentType || unit.rentType || undefined,
        bankCode: pm.bankCode ?? undefined,
        accountNumber: pm.accountNumber ?? undefined,
      };

      const result = await this.createExternalPaymentRequestUseCase.execute(payload, 0); 

      const corePR = await this.corePaymentRepo.findByUuid(result.paymentUuid);
      if (!corePR) {
        throw new BadRequestException('Failed to synchronize with payment gateway');
      }
      corePRId = corePR.id ?? null;
      paymentLink = result.paymentLink;
      corePRUuid = corePR.uuid;
    } else {
      status = 'SCHEDULED';
    }

    // Set initial reminder time if enabled
    let nextReminderAt: Date | null = null;
    const frequency = data.reminderFrequency || 'NONE';
    if (frequency !== 'NONE' && !isScheduled) {
      nextReminderAt = new Date();
      nextReminderAt.setDate(nextReminderAt.getDate() + 1); // Start tomorrow
      nextReminderAt.setHours(9, 0, 0, 0); // 9 AM
    }

    const pmPR = await this.pmPaymentRepo.create({
      pmId: ownerPmId,
      unitId: unit.id,
      tenantId: unit.tenantId,
      paymentRequestId: corePRId,
      amount: data.amount,
      currency: unit.currency || 'NGN',
      description: data.description || null,
      dueDate: new Date(data.rentEndDate || data.dueDate),
      rentStartDate: data.rentStartDate ? new Date(data.rentStartDate) : null,
      rentEndDate: data.rentEndDate ? new Date(data.rentEndDate) : null,
      rentType: data.rentType || unit.rentType || null,
      reminderFrequency: frequency,
      nextReminderAt,
      reminderCount: 0,
      status: status,
      amountPaid: 0,
      allowPartial: data.allowPartial || false,
      minAmount: (data.allowPartial === false) ? 0 : (data.minAmount || null),
      scheduledAt: isScheduled ? new Date(data.scheduledAt!) : null,
      isRecurring: isScheduled ? (data.isRecurring || false) : false,
      recurrenceInterval: isScheduled && data.isRecurring ? (data.recurrenceInterval || null) : null,
    });

    // Log Activity
    if (property) {
        const descriptionText = isScheduled
          ? `Scheduled invoice of ${data.amount} ${unit.currency || 'NGN'} for ${unit.unitName} (${property.name}) for ${new Date(data.scheduledAt!).toLocaleString()}`
          : `Sent invoice of ${data.amount} ${unit.currency || 'NGN'} for ${unit.unitName} (${property.name})`;

        await this.activityLog.log({
            pmId,
            ownerPmId: property.pmId,
            action: ActivityAction.SEND_INVOICE,
            entityType: 'PAYMENT',
            entityId: pmPR.uuid,
            description: descriptionText,
            metadata: {
                amount: data.amount,
                unit: unit.unitName,
                property: property.name,
                scheduledAt: data.scheduledAt
            }
        });
    }

    // PM / Tenant Notifications
    if (isScheduled) {
      // Create PM in-app notification about scheduled request
      await (this.unitRepo as any).prisma.upward_pm_notification.create({
        data: {
          pmId,
          title: 'Rent Request Scheduled 🗓️',
          message: `Rent request of NGN ${data.amount.toLocaleString()} for Unit ${unit.unitName} has been scheduled for delivery on ${new Date(data.scheduledAt!).toLocaleString()}`,
          type: 'SYSTEM',
          isPopup: false,
          url: '/dashboard',
        }
      });
    } else if (unit.tenantId && !data.silent) {
      // Trigger Notification Event asynchronously
      this.pmTenantRepo.findById(unit.tenantId).then(tenant => {
        if (tenant && tenant.email) {
          const pmName = pm.businessName || `${pm.firstName} ${pm.lastName}`;
          this.eventBus.publish(new PmPaymentNotificationEvent(
            tenant.email,
            tenant.firstName || 'Tenant',
            pmName,
            data.amount,
            unit.currency || 'NGN',
            data.rentEndDate || data.dueDate,
            data.description,
            paymentLink,
            corePRUuid,
            false,
            pm.pmType
          ));
        }
      }).catch(err => console.error('Failed to trigger payment notification event:', err));
    }

    return pmPR;
  }
}
