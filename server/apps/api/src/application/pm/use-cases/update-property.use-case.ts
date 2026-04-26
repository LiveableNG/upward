import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { UpdatePropertyDto } from '../dtos/property.dto';

@Injectable()
export class UpdatePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, propertyUuid: string, dto: UpdatePropertyDto) {
    const property = await this.propertyRepository.findByUuid(propertyUuid);
    
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.pmId !== pmId) {
      throw new ForbiddenException('You do not have access to update this property');
    }

    return this.propertyRepository.update(propertyUuid, {
      name: dto.name,
      address: dto.address,
      totalUnits: dto.totalUnits,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl,
    });
  }
}
