import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetUnitPaymentsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
  ) {}

  async execute(pmId: number, unitUuid: string, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    // Verify PM has access to the unit
    const units = actor
      ? await this.unitRepository.findAccessibleForActor(actor)
      : await this.unitRepository.findAccessibleByPmId(ownerPmId);

    if (!units.find(u => u.uuid === unitUuid)) {
      throw new NotFoundException('Unit not found');
    }

    return this.unitRepository.getRentPayments(unitUuid);
  }
}

