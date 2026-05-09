import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository,
  PM_TENANT_REPOSITORY, ITenantRepository,
  PM_UNIT_REPOSITORY, IUnitRepository
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { EVENT_BUS, EventBus } from '../../../events/domain-event';
import { PmPaymentNotificationEvent } from '../../../events/definition/pm-payment-notification.event';

@Injectable()
export class ResendPmPaymentRequestUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly pmTenantRepo: ITenantRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  async execute(pmId: number, uuid: string): Promise<any> {
    const pmPR = await this.pmPaymentRepo.findByUuid(uuid);
    if (!pmPR || pmPR.pmId !== pmId) {
      throw new NotFoundException('Payment request not found');
    }

    if (pmPR.status === 'PAID') {
      throw new BadRequestException('Cannot resend an invoice that is already paid');
    }

    const pm = await this.pmRepo.findById(pmId);
    if (!pm) throw new NotFoundException('Property Manager not found');

    const unit = await this.unitRepo.findByUuid(pmPR.unit?.uuid || '');
    if (!unit) throw new NotFoundException('Unit not found');

    const tenant = await this.pmTenantRepo.findById(pmPR.tenantId!);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const tenantEmail = tenant.email || null;
    if (!tenantEmail) {
      throw new BadRequestException('Tenant does not have an email address');
    }

    const tenantName = tenant.firstName || 'Tenant';
    const pmName = pm.businessName || `${pm.firstName} ${pm.lastName}`;

    // Get core request uuid for the payment link
    const coreRequestUuid = pmPR.coreRequestUuid;
    if (!coreRequestUuid) {
      throw new BadRequestException('Payment link is not available for this request');
    }

    const paymentLink = `https://upward.goodtenants.io/pay/${coreRequestUuid}`;

    // Trigger Notification Event asynchronously
    this.eventBus.publish(new PmPaymentNotificationEvent(
      tenantEmail,
      tenantName,
      pmName,
      pmPR.amount,
      pmPR.currency,
      pmPR.dueDate,
      pmPR.description || undefined,
      paymentLink,
      coreRequestUuid,
      true // Mark as reminder
    ));

    return { success: true, message: 'Invoice reminder is being sent' };
  }
}
