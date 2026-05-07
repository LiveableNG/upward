import { Inject, Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { 
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository,
  PM_UNIT_REPOSITORY, IUnitRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository as ICorePaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { CreateExternalPaymentRequestUseCase } from '../../../use-cases/external/create-payment-request.use-case';
import { ExternalPaymentRequestPayloadDto } from '../../../use-cases/external/external-api.dto';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';

export interface UpdatePmPaymentRequestDto {
  amount?: number;
  dueDate?: string;
  description?: string;
  allowPartial?: boolean;
  minAmount?: number;
  lineItems?: { name: string; amount: number }[];
}

@Injectable()
export class UpdatePmPaymentRequestUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly corePaymentRepo: ICorePaymentRequestRepository,
    private readonly createExternalPaymentRequestUseCase: CreateExternalPaymentRequestUseCase,
  ) {}

  async execute(pmId: number, uuid: string, data: UpdatePmPaymentRequestDto): Promise<any> {
    const pmPR = await this.pmPaymentRepo.findByUuid(uuid);
    if (!pmPR) throw new NotFoundException('Payment request not found');
    if (pmPR.pmId !== pmId) throw new UnauthorizedException('Unauthorized to update this request');
    if (pmPR.status === 'PAID') throw new BadRequestException('Cannot update a fully paid request');

    const unit = await this.unitRepo.findByUuid(pmPR.unit?.uuid || '');
    if (!unit) throw new NotFoundException('Unit not found');

    const pm = await this.pmRepo.findById(pmId);
    if (!pm) throw new NotFoundException('Property Manager not found');
    
    const payload: ExternalPaymentRequestPayloadDto = {
      userPropertyUuid: unit.userPropertyUuid ?? undefined,
      amount: data.amount ?? pmPR.amount,
      dueDate: (data.dueDate || pmPR.dueDate.toISOString().split('T')[0]) as string,
      description: (data.description ?? pmPR.description) ?? undefined,
      allowPartial: data.allowPartial ?? pmPR.allowPartial,
      minAmount: (data.minAmount ?? pmPR.minAmount) ?? undefined,
      lineItems: data.lineItems,
      bankCode: pm.bankCode ?? undefined,
      accountNumber: pm.accountNumber ?? undefined,
    };

    const result = await this.createExternalPaymentRequestUseCase.execute(payload, 0); 
    
    // Update local record
    const updated = await this.pmPaymentRepo.update(uuid, {
      amount: data.amount ?? pmPR.amount,
      description: data.description ?? pmPR.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : pmPR.dueDate,
      allowPartial: data.allowPartial ?? pmPR.allowPartial,
      minAmount: data.minAmount ?? pmPR.minAmount,
    });

    return updated;
  }
}

