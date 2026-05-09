import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmPaymentRequestUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
  ) {}

  async execute(pmId: number, uuid: string): Promise<any> {
    const request = await this.pmPaymentRepo.findByUuid(uuid);
    
    if (!request || request.pmId !== pmId) {
      throw new NotFoundException('Payment request not found');
    }

    return request;
  }
}
