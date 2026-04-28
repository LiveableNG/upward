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

      const email = u.tenantEmail?.trim();
      const firstName = u.tenantFirstName?.trim();
      const lastName = u.tenantLastName?.trim();

      if (u.tenantUuid) {
        const tenant = await this.tenantRepository.findByUuid(u.tenantUuid);
        if (tenant && tenant.pmId === pmId) {
          tenantId = tenant.id;
        }
      } else if (email) {
        const emailHash = this.encryption.hash(email);
        let tenant = await this.tenantRepository.findByEmailHash(pmId, emailHash);

        if (!tenant) {
          const existingUser = await this.userRepository.findByEmail(email);
          const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

          tenant = await this.tenantRepository.create({
            pmId,
            firstName: firstName || '',
            lastName: lastName || '',
            email: email,
            phone: u.tenantPhone?.trim() || '',
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
        status: tenantId ? (u.status || 'OCCUPIED') : 'VACANT',
        tenantId,
        isSynced: false,
        userPropertyUuid: null,
      });
    }

    return this.unitRepository.createMany(unitsToCreate);
  }
}
