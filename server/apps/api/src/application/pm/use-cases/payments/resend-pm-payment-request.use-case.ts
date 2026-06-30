import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository,
  PM_TENANT_REPOSITORY, ITenantRepository,
  PM_UNIT_REPOSITORY, IUnitRepository
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { EVENT_BUS, EventBus } from '../../../events/domain-event';
import { PmPaymentNotificationEvent } from '../../../events/definition/pm-payment-notification.event';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

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
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string, overrideEmail?: string): Promise<any> {
    const pmPR = await this.pmPaymentRepo.findByUuid(uuid);
    if (!pmPR) {
      throw new NotFoundException('Payment request not found');
    }

    // Check collaborator access
    let hasAccess = pmPR.pmId === pmId;
    if (!hasAccess) {
      // Check if team collaborator with ALL access
      const teamCollab = await this.prisma.upward_pm_team_collaboration.findFirst({
        where: {
          collaboratorPmId: pmId,
          ownerPmId: pmPR.pmId,
          status: 'ACCEPTED',
          accessLevel: 'ALL'
        }
      });
      if (teamCollab) {
        hasAccess = true;
      }
      
      // Check if custom property collaborator with access to unit's property
      if (!hasAccess && pmPR.unitId) {
        const unit = await this.prisma.upward_pm_unit.findUnique({
          where: { id: pmPR.unitId },
          select: { propertyId: true }
        });
        if (unit) {
          const propCollab = await this.prisma.upward_pm_property_collaboration.findFirst({
            where: {
              collaboratorPmId: pmId,
              propertyId: unit.propertyId
            }
          });
          if (propCollab) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      throw new NotFoundException('Payment request not found');
    }

    if (pmPR.status === 'PAID') {
      throw new BadRequestException('Cannot resend an invoice that is already paid');
    }

    const ownerPmId = pmPR.pmId;
    const pm = await this.pmRepo.findById(ownerPmId);
    if (!pm) throw new NotFoundException('Property Manager not found');

    const unit = await this.unitRepo.findByUuid(pmPR.unit?.uuid || '');
    if (!unit) throw new NotFoundException('Unit not found');

    const tenant = await this.pmTenantRepo.findById(pmPR.tenantId!);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const tenantEmail = overrideEmail || tenant.email || null;
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

    const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim();
    const paymentLink = `${baseUrl}/pay/${coreRequestUuid}`;

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
      true, // Mark as reminder
      pm.pmType
    ));

    return { success: true, message: 'Invoice reminder is being sent' };
  }
}
