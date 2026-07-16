import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY, ITenantRepository, PM_TENANT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import { BulkCreateUnitsDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { BulkInviteTenantsUseCase } from './tenants/bulk-invite-tenants.use-case';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { SyncUnitToUpwardUseCase } from './units/sync-unit.use-case';

function cleanAndValidatePhone(phoneStr: string, identifier: string): string {
  let cleaned = phoneStr.trim().replace(/\s+/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+234' + cleaned;
  }

  if (!/^\+\d{7,15}$/.test(cleaned)) {
    throw new Error(`Invalid phone format for tenant ${identifier}. Must be in international format (e.g. +234...)`);
  }
  return cleaned;
}

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

    for (const u of dto.units) {
      if (u.tenantPhone) {
        const identifier = u.tenantEmail || u.tenantFirstName || u.tenantCommercialName || 'unknown';
        if (u.tenantPhone.includes(',')) {
          const parts = u.tenantPhone.split(',');
          const p1 = cleanAndValidatePhone(parts[0]!, identifier);
          const p2 = cleanAndValidatePhone(parts[1]!, identifier);
          u.tenantPhone = `${p1},${p2}`;
        } else {
          u.tenantPhone = cleanAndValidatePhone(u.tenantPhone, identifier);
        }
      }
    }

    const unitsToCreate = [];
    const createdTenantUuids: string[] = [];
    const unitsToSync: string[] = [];

    for (const u of dto.units) {
      let tenantId: number | null = null;
      let initialStatus = 'PENDING';

      const email = u.tenantEmail?.trim();
      const commercialName = u.tenantCommercialName?.trim();
      const firstName = u.tenantFirstName?.trim();
      const lastName = u.tenantLastName?.trim();

      const hasTenantIdentifier = !!(email || commercialName || firstName || lastName || u.tenantPhone);

      if (hasTenantIdentifier && !u.tenantUuid) {
        if (!commercialName && !firstName && !lastName) {
          throw new BadRequestException(`Unit ${u.unitName}: Tenant with email/phone ${email || u.tenantPhone} must have a first/last name or commercial name provided.`);
        }
      }

      if (u.tenantUuid) {
        const tenant = await this.tenantRepository.findByUuid(u.tenantUuid);
        if (tenant && (tenant.pmId === pmId || tenant.pmId === property.pmId)) {
          tenantId = tenant.id;
          initialStatus = tenant.inviteStatus;
        }
      } else if (hasTenantIdentifier) {
        let phoneVal = u.tenantPhone?.trim() || undefined;
        let otherPhoneVal = undefined;
        if (phoneVal && phoneVal.includes(',')) {
          const parts = phoneVal.split(',');
          phoneVal = parts[0]?.trim();
          otherPhoneVal = parts[1]?.trim();
        }

        if (email || phoneVal) {
          let tenant = null;
          let existingUser = null;

          if (email) {
            const emailHash = this.encryption.hash(email);
            tenant = await this.tenantRepository.findByEmailHash(pmId, emailHash);
            if (!tenant && pmId !== property.pmId) {
              tenant = await this.tenantRepository.findByEmailHash(property.pmId, emailHash);
            }
            if (!tenant) {
              existingUser = await this.userRepository.findByEmail(email);
            }
          }

          if (!tenant && phoneVal) {
            const phoneHash = this.encryption.hash(phoneVal);
            tenant = await this.tenantRepository.findByPhoneHash(pmId, phoneHash);
            if (!tenant && pmId !== property.pmId) {
              tenant = await this.tenantRepository.findByPhoneHash(property.pmId, phoneHash);
            }
            if (!tenant && !existingUser) {
              existingUser = await this.userRepository.findByPhone(phoneVal);
            }
          }

          if (!tenant) {
            initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

            tenant = await this.tenantRepository.create({
              pmId,
              commercialName: commercialName || undefined,
              firstName: firstName || '',
              lastName: lastName || '',
              email: email || undefined,
              phone: phoneVal || '',
              otherPhone: otherPhoneVal || undefined,
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
        } else {
          // No contact info - create guest tenant
          const tenant = await this.tenantRepository.create({
            pmId,
            commercialName: commercialName || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phone: undefined,
            otherPhone: otherPhoneVal || undefined,
            inviteStatus: 'PENDING',
            inviteSentAt: null,
          });
          tenantId = tenant.id;
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
        rentReminderEnabled: u.rentReminderEnabled ?? false,
        rentReminderDaysBefore: u.rentReminderDaysBefore ?? 7,
        isSynced: false,
        userPropertyUuid: null,
      });

      unitsToCreate.push(newUnit);

      // If tenant is already on upward, mark for sync
      if (tenantId && (initialStatus === 'ON_UPWARD' || initialStatus === 'ACCEPTED')) {
        unitsToSync.push(newUnit.uuid);
      }

      const actualRentAmountPaid = u.isFullyPaid ? u.rentAmount : u.rentAmountPaid;

      if (actualRentAmountPaid !== undefined && actualRentAmountPaid > 0) {
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
          amount: actualRentAmountPaid,
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

    return { count: dto.units.length, units: unitsToCreate };
  }
}
