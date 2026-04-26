import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class AddUnitPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
  ) {}

  async execute(pmId: number, unitUuid: string, data: any) {
    // Verify PM owns the unit
    const units = await this.unitRepository.findByPmId(pmId);
    if (!units.find(u => u.uuid === unitUuid)) {
      throw new NotFoundException('Unit not found');
    }

    return this.unitRepository.addRentPayment(unitUuid, {
      ...data,
      paymentDate: new Date(data.paymentDate),
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
    });
  }
}
