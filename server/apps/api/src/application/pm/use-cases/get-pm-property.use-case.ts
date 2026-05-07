import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetPmPropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number, propertyUuid: string) {
    const property = await this.propertyRepository.findByUuid(propertyUuid);
    
    if (!property || property.pmId !== pmId) {
      throw new NotFoundException('Property not found');
    }

    if (property.imageUrl) {
      property.imageUrl = await this.s3Service.getDownloadUrl(property.imageUrl);
    }
    
    return property;
  }
}
