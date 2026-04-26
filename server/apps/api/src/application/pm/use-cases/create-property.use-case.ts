import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { CreatePropertyDto } from '../dtos/property.dto';

@Injectable()
export class CreatePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, dto: CreatePropertyDto) {
    return this.propertyRepository.create({
      pmId,
      name: dto.name,
      address: dto.address || null,
      totalUnits: dto.totalUnits,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl || null,
    });
  }
}
