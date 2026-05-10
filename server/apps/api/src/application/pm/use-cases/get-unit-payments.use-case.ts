import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetUnitPaymentsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
  ) {}

  async execute(pmId: number, unitUuid: string) {
    // Verify PM has access to the unit
    const units = await this.unitRepository.findAccessibleByPmId(pmId);
    if (!units.find(u => u.uuid === unitUuid)) {
      throw new NotFoundException('Unit not found');
    }

    return this.unitRepository.getRentPayments(unitUuid);
  }
}
