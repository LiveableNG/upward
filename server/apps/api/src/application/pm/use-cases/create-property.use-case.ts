import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { CreatePropertyDto } from '../dtos/property.dto';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class CreatePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number, dto: CreatePropertyDto) {
    const property = await this.propertyRepository.create({
      pmId,
      name: dto.name,
      address: dto.address || null,
      totalUnits: dto.totalUnits,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl || null,
      country: dto.country || 'Nigeria',
      state: dto.state || null,
      area: dto.area || null,
    });

    if (property.imageUrl) {
      property.imageUrl = await this.s3Service.getDownloadUrl(property.imageUrl);
    }

    return property;
  }
}
