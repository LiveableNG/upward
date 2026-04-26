import { Inject, Injectable } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { BulkCreateUnitsDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';


@Injectable()
export class BulkCreateUnitsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY) private readonly propertyRepository: IPropertyRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, dto: BulkCreateUnitsDto) {
    const property = await this.propertyRepository.findByUuid(dto.propertyUuid);
    if (!property || property.pmId !== pmId) {
      throw new Error('Property not found or unauthorized');
    }

    const unitsData = dto.units.map(u => ({
      propertyId: property.id,
      unitName: u.unitName,
      tenantFirstNameEncrypted: u.tenantFirstName ? this.encryption.encrypt(u.tenantFirstName) : null,
      tenantFirstNameSearch: u.tenantFirstName ? u.tenantFirstName.toLowerCase() : null,
      tenantLastNameEncrypted: u.tenantLastName ? this.encryption.encrypt(u.tenantLastName) : null,
      tenantLastNameSearch: u.tenantLastName ? u.tenantLastName.toLowerCase() : null,
      tenantEmailEncrypted: u.tenantEmail ? this.encryption.encrypt(u.tenantEmail) : null,
      tenantEmailHash: u.tenantEmail ? this.encryption.hash(u.tenantEmail) : null,
      tenantPhoneEncrypted: u.tenantPhone ? this.encryption.encrypt(u.tenantPhone) : null,
      tenantPhoneHash: u.tenantPhone ? this.encryption.hash(u.tenantPhone) : null,
      rentAmount: u.rentAmount,
      rentStartDate: u.rentStartDate ? new Date(u.rentStartDate) : null,
      rentDueDate: u.rentDueDate ? new Date(u.rentDueDate) : null,
      rentFrequency: u.rentFrequency || 'Monthly',
      currency: 'NGN',
      status: u.status,
    }));

    return this.unitRepository.createMany(unitsData);
  }
}
