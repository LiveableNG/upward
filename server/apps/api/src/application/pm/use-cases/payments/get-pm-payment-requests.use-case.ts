import { Inject, Injectable } from '@nestjs/common';
import { PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmPaymentRequestsUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
  ) {}

  async execute(pmId: number): Promise<any> {
    return this.pmPaymentRepo.findByPmId(pmId);
  }
}
