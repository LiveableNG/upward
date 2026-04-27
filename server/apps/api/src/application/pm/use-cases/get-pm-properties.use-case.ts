import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetPmPropertiesUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number) {
    const properties = await this.propertyRepository.findByPmId(pmId);
    
    return Promise.all(properties.map(async (prop) => {
      if (prop.imageUrl) {
        prop.imageUrl = await this.s3Service.getDownloadUrl(prop.imageUrl);
      }
      return prop;
    }));
  }
}
