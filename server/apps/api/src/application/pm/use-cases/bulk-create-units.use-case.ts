import { Inject, Injectable } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY, ITenantRepository, PM_TENANT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import { BulkCreateUnitsDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class BulkCreateUnitsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY) private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, dto: BulkCreateUnitsDto) {
    const property = await this.propertyRepository.findByUuid(dto.propertyUuid);
    if (!property || property.pmId !== pmId) {
      throw new Error('Property not found or unauthorized');
    }

    const phoneRegex = /^\+234\d{10}$/;
    for (const u of dto.units) {
      if (u.tenantPhone && !phoneRegex.test(u.tenantPhone)) {
        throw new Error(`Invalid phone format for tenant ${u.tenantEmail || u.tenantFirstName}. Must be +2348000000000`);
      }
    }

    const unitsToCreate = [];

    for (const u of dto.units) {
      let tenantId: number | null = null;

      // Handle tenant if info is provided
      if (u.tenantUuid) {
        const tenant = await this.tenantRepository.findByUuid(u.tenantUuid);
        if (tenant && tenant.pmId === pmId) {
          tenantId = tenant.id;
        }
      } else if (u.tenantEmail) {
        const emailHash = this.encryption.hash(u.tenantEmail);
        let tenant = await this.tenantRepository.findByEmailHash(pmId, emailHash);

        if (!tenant) {
          const existingUser = await this.userRepository.findByEmail(u.tenantEmail);
          const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

          tenant = await this.tenantRepository.create({
            pmId,
            firstName: u.tenantFirstName || '',
            lastName: u.tenantLastName || '',
            email: u.tenantEmail,
            phone: u.tenantPhone || '',
            inviteStatus: initialStatus,
            inviteSentAt: null,
          });
        }
        tenantId = tenant.id;
      }

      unitsToCreate.push({
        propertyId: property.id,
        unitName: u.unitName,
        rentAmount: u.rentAmount,
        rentStartDate: u.rentStartDate ? new Date(u.rentStartDate) : null,
        rentDueDate: u.rentDueDate ? new Date(u.rentDueDate) : null,
        rentFrequency: u.rentFrequency || 'Monthly',
        currency: 'NGN',
        status: u.status,
        tenantId,
        isSynced: false,
        userPropertyUuid: null,
      });
    }

    return this.unitRepository.createMany(unitsToCreate);
  }
}
