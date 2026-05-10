import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, uuid: string) {
    const unit = await this.unitRepository.findByUuid(uuid);
    
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(pmId, unit.propertyId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this unit');
    }

    return unit;
  }
}
