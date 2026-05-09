import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository,
  PM_TENANT_REPOSITORY, ITenantRepository,
  PM_UNIT_REPOSITORY, IUnitRepository
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import { NotificationService } from '../../../../shared/infrastructure/common/notification.service';
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
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
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

    const paymentLink = `https://upward.ng/pay/${coreRequestUuid}`;

    try {
      await this.emailService.sendPaymentRequestEmail({
        email: tenantEmail,
        tenantName,
        pmName,
        amount: pmPR.amount,
        currency: pmPR.currency,
        dueDate: pmPR.dueDate,
        description: pmPR.description || undefined,
        paymentLink,
      });

      const coreUser = await this.prisma.upward_user.findFirst({
        where: { email: tenantEmail }
      });

      if (coreUser) {
        await this.notificationService.notifyUser(coreUser.id, {
          title: 'Payment Reminder',
          message: `This is a reminder for your payment of ${pmPR.currency} ${pmPR.amount.toLocaleString()} from ${pmName}.`,
          type: 'PAYMENT',
          url: `/pay/${coreRequestUuid}`,
        });
      }

      return { success: true, message: 'Invoice resent successfully' };
    } catch (err) {
      console.error('Failed to resend payment request:', err);
      throw new BadRequestException('Failed to send email notification');
    }
  }
}
