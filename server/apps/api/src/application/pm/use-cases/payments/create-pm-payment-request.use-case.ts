import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    private readonly createExternalPaymentRequestUseCase: CreateExternalPaymentRequestUseCase,
  ) {}

  async execute(pmId: number, data: CreatePmPaymentRequestDto): Promise<any> {
    const unit = await this.unitRepo.findByUuid(data.unitUuid);
    if (!unit) throw new NotFoundException('Unit not found');

    if (!unit.isSynced || !unit.userPropertyUuid) {
      throw new BadRequestException('Unit must be synced to Upward Pay before requesting payments');
    }

    const pm = await this.pmRepo.findById(pmId);
    if (!pm) throw new NotFoundException('Property Manager not found');

    if (!pm.bankCode || !pm.accountNumber) {
      throw new BadRequestException('Please set up your bank information in settings to receive payments');
    }

    const payload: ExternalPaymentRequestPayloadDto = {
      userPropertyUuid: unit.userPropertyUuid ?? undefined,
      amount: data.amount,
      dueDate: data.rentEndDate || data.dueDate,
      rentStartDate: data.rentStartDate,
      rentEndDate: data.rentEndDate,
      description: data.description,
      allowPartial: data.allowPartial,
      minAmount: data.minAmount,
      lineItems: data.lineItems,
      rentType: data.rentType,
      bankCode: pm.bankCode ?? undefined,
      accountNumber: pm.accountNumber ?? undefined,
    };

    const result = await this.createExternalPaymentRequestUseCase.execute(payload, 0); 

    const corePR = await this.corePaymentRepo.findByUuid(result.paymentUuid);
    if (!corePR) {
      throw new BadRequestException('Failed to synchronize with payment gateway');
    }

    const pmPR = await this.pmPaymentRepo.create({
      pmId,
      unitId: unit.id,
      tenantId: unit.tenantId,
      paymentRequestId: corePR.id ?? null,
      amount: data.amount,
      currency: unit.currency || 'NGN',
      description: data.description || null,
      dueDate: new Date(data.rentEndDate || data.dueDate),
      rentStartDate: data.rentStartDate ? new Date(data.rentStartDate) : null,
      rentEndDate: data.rentEndDate ? new Date(data.rentEndDate) : null,
      rentType: data.rentType || null,
      status: 'PENDING',
      amountPaid: 0,
      allowPartial: data.allowPartial || false,
      minAmount: data.minAmount || null,
    });

    // Trigger Notification Event asynchronously
    if (unit.tenantId) {
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
            result.paymentLink,
            corePR.uuid,
            false
          ));
        }
      }).catch(err => console.error('Failed to trigger payment notification event:', err));
    }

    return pmPR;
  }
}
