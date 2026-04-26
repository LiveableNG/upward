import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmPropertiesUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number) {
    return this.propertyRepository.findByPmId(pmId);
  }
}
