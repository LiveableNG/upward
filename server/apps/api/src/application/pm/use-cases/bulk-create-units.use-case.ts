import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY, ITenantRepository, PM_TENANT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import { BulkCreateUnitsDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { BulkInviteTenantsUseCase } from './tenants/bulk-invite-tenants.use-case';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { SyncUnitToUpwardUseCase } from './units/sync-unit.use-case';

@Injectable()
export class BulkCreateUnitsUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY) private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly bulkInviteUseCase: BulkInviteTenantsUseCase,
    private readonly activityLog: ActivityLogService,
    private readonly syncUnitUseCase: SyncUnitToUpwardUseCase,
  ) {}

  async execute(pmId: number, dto: BulkCreateUnitsDto) {
    const property = await this.propertyRepository.findByUuid(dto.propertyUuid);
    if (!property) {
      throw new Error('Property not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(pmId, property.id);
    if (!hasAccess) {
      throw new Error('Unauthorized to add units to this property');
    }

    const phoneRegex = /^\+234\d{10}$/;
    for (const u of dto.units) {
      if (u.tenantPhone && !phoneRegex.test(u.tenantPhone)) {
        throw new Error(`Invalid phone format for tenant ${u.tenantEmail || u.tenantFirstName}. Must be +2348000000000`);
      }
    }

    const unitsToCreate = [];
    const createdTenantUuids: string[] = [];
    const unitsToSync: string[] = [];

    for (const u of dto.units) {
      let tenantId: number | null = null;
      let initialStatus = 'PENDING';

      const email = u.tenantEmail?.trim();
      const firstName = u.tenantFirstName?.trim();
      const lastName = u.tenantLastName?.trim();

      if (u.tenantUuid) {
        const tenant = await this.tenantRepository.findByUuid(u.tenantUuid);
        if (tenant && (tenant.pmId === pmId || tenant.pmId === property.pmId)) {
          tenantId = tenant.id;
          initialStatus = tenant.inviteStatus;
        }
      } else if (email) {
        const emailHash = this.encryption.hash(email);
        let tenant = await this.tenantRepository.findByEmailHash(pmId, emailHash);
        if (!tenant && pmId !== property.pmId) {
          tenant = await this.tenantRepository.findByEmailHash(property.pmId, emailHash);
        }

        if (!tenant) {
          const existingUser = await this.userRepository.findByEmail(email);
          initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

          tenant = await this.tenantRepository.create({
            pmId,
            firstName: firstName || '',
            lastName: lastName || '',
            email: email,
            phone: u.tenantPhone?.trim() || '',
            inviteStatus: initialStatus,
            inviteSentAt: null,
          });
        } else {
          initialStatus = tenant.inviteStatus;
        }
        tenantId = tenant.id;
        if (tenant.inviteStatus === 'PENDING') {
          createdTenantUuids.push(tenant.uuid);
        }
      }

      const existingUnits = await this.unitRepository.findByPropertyId(property.id);
      const duplicateUnit = existingUnits.find(exUnit => exUnit.unitName.trim().toLowerCase() === u.unitName.trim().toLowerCase());

      if (duplicateUnit) {
        throw new BadRequestException(`Unit "${u.unitName}" already exists in this property.`);
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

      // If tenant is already on upward, mark for sync
      if (tenantId && (initialStatus === 'ON_UPWARD' || initialStatus === 'ACCEPTED')) {
        unitsToSync.push(newUnit.uuid);
      }

      if (u.rentAmountPaid && u.rentAmountPaid > 0) {
        let periodEnd: Date | null = null;
        if (newUnit.rentStartDate) {
          periodEnd = new Date(newUnit.rentStartDate);
          if (newUnit.rentType === 'Monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
          periodEnd.setDate(periodEnd.getDate() - 1);
        }

        await this.unitRepository.addRentPayment(newUnit.uuid, {
          amount: u.rentAmountPaid,
          paymentDate: new Date(),
          periodStart: newUnit.rentStartDate,
          status: 'SUCCESS',
          method: 'Other',
          notes: 'Imported initial payment',
          periodEnd: periodEnd,
          tenantId: tenantId,
          reference: null
        });
      }
    }

    // Log Activity
    await this.activityLog.log({
        pmId,
        ownerPmId: property.pmId,
        action: ActivityAction.CREATE_UNIT,
        entityType: 'UNIT',
        description: `Bulk created ${dto.units.length} units in property ${property.name}`,
        metadata: {
            property: property.name,
            count: dto.units.length
        }
    });

    if (createdTenantUuids.length > 0) {
      await this.bulkInviteUseCase.execute(pmId, {
        tenantUuids: [...new Set(createdTenantUuids)]
      });
    }

    // Process auto-syncs
    for (const unitUuid of unitsToSync) {
      try {
        await this.syncUnitUseCase.execute(unitUuid, pmId);
      } catch (error) {
        console.error(`Auto-sync failed for unit ${unitUuid} during bulk create:`, error);
      }
    }

    return { count: dto.units.length };
  }
}
