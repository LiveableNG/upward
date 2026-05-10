import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmUnitsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, propertyUuid?: string) {
    if (propertyUuid) {
      const property = await this.propertyRepository.findByUuid(propertyUuid);
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      const hasAccess = await this.propertyRepository.hasAccessToProperty(pmId, property.id);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this property');
      }
      return this.unitRepository.findByPropertyId(property.id);
    }
    return this.unitRepository.findAccessibleByPmId(pmId);
  }
}
