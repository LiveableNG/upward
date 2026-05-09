import { Inject, Injectable } from '@nestjs/common';
import {
  IUnitRepository,
  PM_UNIT_REPOSITORY,
  IPropertyRepository,
  PM_PROPERTY_REPOSITORY,
  ITenantRepository,
  PM_TENANT_REPOSITORY,
} from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository';
import { BulkFullImportDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { BulkInviteTenantsUseCase } from './tenants/bulk-invite-tenants.use-case';

@Injectable()
export class BulkFullImportUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY) private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly bulkInviteUseCase: BulkInviteTenantsUseCase,
  ) {}

  async execute(pmId: number, dto: BulkFullImportDto) {
    const { rows, inviteAfterImport } = dto;

    const propertyCache = new Map<string, { id: number; uuid: string }>();
    const createdTenantUuids: string[] = [];

    for (const row of rows) {
      const propertyKey = `${row.propertyName.trim().toLowerCase()}::${row.propertyAddress.trim().toLowerCase()}`;

      let property = propertyCache.get(propertyKey);
      if (!property) {
        const existing = await this.propertyRepository.findByPmId(pmId);
        const match = existing.find(
          (p) =>
            p.name.trim().toLowerCase() === row.propertyName.trim().toLowerCase() &&
            (p.address || '').trim().toLowerCase() === row.propertyAddress.trim().toLowerCase(),
        );

        if (match) {
          property = { id: match.id, uuid: match.uuid };
        } else {
          const landlordName = row.landlordFirstName
            ? `${row.landlordFirstName} ${row.landlordLastName || ''}`.trim()
            : undefined;

          const created = await this.propertyRepository.create({
            pmId,
            name: row.propertyName.trim(),
            address: row.propertyAddress.trim(),
            propertyType: row.propertyType || 'Residential',
            totalUnits: 0,
            imageUrl: null,
            country: row.propertyCountry || 'Nigeria',
            state: row.propertyState || null,
            area: row.propertyArea || null,
            landlordName: landlordName || null,
            landlordEmail: row.landlordEmail || null,
            landlordPhone: row.landlordPhone || null,
          });
          property = { id: created.id, uuid: created.uuid };
        }

        propertyCache.set(propertyKey, property);
      }

      let tenantId: number | null = null;
      let tenantUuid: string | null = null;

      const email = row.tenantEmail?.trim().toLowerCase();
      if (email) {
        const emailHash = this.encryption.hash(email);
        let tenant = await this.tenantRepository.findByEmailHash(pmId, emailHash);

        if (!tenant) {
          const existingUser = await this.userRepository.findByEmail(email);
          const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

          tenant = await this.tenantRepository.create({
            pmId,
            firstName: row.tenantFirstName?.trim() || '',
            lastName: row.tenantLastName?.trim() || '',
            email,
            phone: row.tenantPhone?.trim() || '',
            inviteStatus: initialStatus,
            inviteSentAt: null,
          });
        }

        tenantId = tenant.id;
        tenantUuid = tenant.uuid;

        if (tenant.inviteStatus === 'PENDING') {
          createdTenantUuids.push(tenant.uuid);
        }
      }

      // 3. Create Unit
      const existingUnits = await this.unitRepository.findByPropertyId(property.id);
      const duplicateUnit = existingUnits.find(u => u.unitName.trim().toLowerCase() === row.unitName.trim().toLowerCase());

      if (duplicateUnit) {
        // Skip duplicate unit creation
        continue;
      }

      const newUnit = await this.unitRepository.create({
        propertyId: property.id,
        unitName: row.unitName.trim(),
        rentAmount: row.unitRentAmount || 0,
        managementFee: row.unitManagementFee ?? 0,
        rentStartDate: row.unitRentStartDate ? new Date(row.unitRentStartDate) : null,
        rentDueDate: row.unitRentDueDate ? new Date(row.unitRentDueDate) : null,
        rentType: row.unitRentType || 'Monthly',
        currency: row.unitCurrency || 'NGN',
        notes: row.unitNotes || null,
        status: tenantId ? 'OCCUPIED' : 'VACANT',
        tenantId,
        unitType: row.unitType || null,
        isSynced: false,
        userPropertyUuid: null,
      });

      // 4. Create Payment Record if amount paid > 0
      if (row.unitRentAmountPaid && row.unitRentAmountPaid > 0) {
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
          amount: row.unitRentAmountPaid,
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

    // 4. Kick off bulk invite for PENDING tenants automatically
    let bulkInviteId: string | null = null;
    if (createdTenantUuids.length > 0) {
      const result = await this.bulkInviteUseCase.execute(pmId, {
        tenantUuids: [...new Set(createdTenantUuids)],
      });
      bulkInviteId = result.bulkInviteId;
    }

    return {
      success: true,
      propertiesCreated: propertyCache.size,
      unitsCreated: rows.length,
      bulkInviteId,
    };
  }
}
