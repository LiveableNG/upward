import { Inject, Injectable } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY, ITenantRepository, PM_TENANT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import { BulkCreateUnitsDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { BulkInviteTenantsUseCase } from './tenants/bulk-invite-tenants.use-case';

@Injectable()
export class BulkCreateUnitsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY) private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly bulkInviteUseCase: BulkInviteTenantsUseCase,
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
    const createdTenantUuids: string[] = [];

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
        if (tenant.inviteStatus === 'PENDING') {
          createdTenantUuids.push(tenant.uuid);
        }
      }

      const existingUnits = await this.unitRepository.findByPropertyId(property.id);
      const duplicateUnit = existingUnits.find(exUnit => exUnit.unitName.trim().toLowerCase() === u.unitName.trim().toLowerCase());

      if (duplicateUnit) {
        // Skip duplicate unit creation
        continue;
      }

      const newUnit = await this.unitRepository.create({
        propertyId: property.id,
        unitName: u.unitName,
        rentAmount: u.rentAmount,
        managementFee: u.managementFee ?? 0,
        rentStartDate: u.rentStartDate ? new Date(u.rentStartDate) : null,
        rentDueDate: u.rentDueDate ? new Date(u.rentDueDate) : null,
        rentType: u.rentType || 'Monthly',
        currency: u.currency || 'NGN',
        notes: u.notes || null,
        status: tenantId ? (u.status || 'OCCUPIED') : 'VACANT',
        tenantId,
        unitType: u.unitType || null,
        isSynced: false,
        userPropertyUuid: null,
      });

      if (u.rentAmountPaid && u.rentAmountPaid > 0) {
        await this.unitRepository.addRentPayment(newUnit.uuid, {
          amount: u.rentAmountPaid,
          paymentDate: new Date(),
          periodStart: newUnit.rentStartDate,
          status: 'SUCCESS',
          method: 'Other',
          notes: 'Imported initial payment',
          periodEnd: null,
          reference: null
        });
      }
    }

    if (createdTenantUuids.length > 0) {
      await this.bulkInviteUseCase.execute(pmId, {
        tenantUuids: [...new Set(createdTenantUuids)]
      });
    }

    return { count: dto.units.length };
  }
}
