import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class DeletePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, propertyUuid: string) {
    const property = await this.propertyRepository.findByUuid(propertyUuid);
    
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.pmId !== pmId) {
      throw new ForbiddenException('You do not have access to delete this property');
    }

    return this.propertyRepository.delete(propertyUuid);
  }
}
