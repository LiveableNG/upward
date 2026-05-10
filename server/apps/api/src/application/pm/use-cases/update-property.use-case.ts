import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { UpdatePropertyDto } from '../dtos/property.dto';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { LandlordService } from '../services/landlord.service';

@Injectable()
export class UpdatePropertyUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly s3Service: S3Service,
    private readonly landlordService: LandlordService,
  ) {}

  async execute(pmId: number, propertyUuid: string, dto: UpdatePropertyDto) {
    const property = await this.propertyRepository.findByUuid(propertyUuid);
    
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.pmId !== pmId) {
      throw new ForbiddenException('You do not have access to update this property');
    }

    const updatedProperty = await this.propertyRepository.update(propertyUuid, {
      name: dto.name,
      address: dto.address,
      totalUnits: dto.totalUnits,
      propertyType: dto.propertyType,
      imageUrl: dto.imageUrl,
      country: dto.country,
      state: dto.state,
      area: dto.area,
      landlordName: dto.landlordName,
      landlordEmail: dto.landlordEmail,
      landlordPhone: dto.landlordPhone,
    });
    
    if (dto.landlordEmail && dto.landlordEmail !== property.landlordEmail) {
        await this.landlordService.ensureLandlord(
            dto.landlordEmail,
            dto.landlordName,
            dto.landlordPhone
        );
    }

    if (updatedProperty.imageUrl) {
      updatedProperty.imageUrl = await this.s3Service.getDownloadUrl(updatedProperty.imageUrl);
    }

    return updatedProperty;
  }
}
