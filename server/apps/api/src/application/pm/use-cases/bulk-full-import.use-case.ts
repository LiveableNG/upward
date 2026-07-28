import { Inject, Injectable, BadRequestException } from '@nestjs/common';
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

    for (const row of rows) {
      if (row.tenantPhone) {
        const identifier = row.tenantEmail || row.tenantFirstName || row.tenantCommercialName || 'unknown';
        try {
          if (row.tenantPhone.includes(',')) {
            const parts = row.tenantPhone.split(',');
            const p1 = cleanAndValidatePhone(parts[0]!, identifier);
            const p2 = cleanAndValidatePhone(parts[1]!, identifier);
            row.tenantPhone = `${p1},${p2}`;
          } else {
            row.tenantPhone = cleanAndValidatePhone(row.tenantPhone, identifier);
          }
        } catch (err: any) {
          throw new BadRequestException(err.message);
        }
      }
    }

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
      const commercialName = (row as any).tenantCommercialName?.trim();
      const firstName = row.tenantFirstName?.trim();
      const lastName = row.tenantLastName?.trim();

      // A tenant row is valid if it has email, commercialName, or at least a name
      const hasTenantIdentifier = !!(email || commercialName || firstName || lastName || row.tenantPhone);

      if (hasTenantIdentifier) {
        if (!commercialName && !firstName && !lastName) {
          throw new BadRequestException(`Tenant with email/phone ${email || row.tenantPhone} must have a first/last name or commercial name provided.`);
        }
        let phoneVal = row.tenantPhone?.trim() || undefined;
        let otherPhoneVal = undefined;
        if (phoneVal && phoneVal.includes(',')) {
          const parts = phoneVal.split(',');
          phoneVal = parts[0]?.trim();
          otherPhoneVal = parts[1]?.trim();
        }

        if (email) {
          const emailHash = this.encryption.hash(email);
          let tenant = await this.tenantRepository.findByEmailHash(pmId, emailHash);

          if (!tenant) {
            const existingUser = await this.userRepository.findByEmail(email);
            const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

            tenant = await this.tenantRepository.create({
              pmId,
              commercialName: commercialName || undefined,
              firstName: firstName || '',
              lastName: lastName || '',
              email,
              phone: phoneVal || '',
              otherPhone: otherPhoneVal || undefined,
              inviteStatus: initialStatus,
              inviteSentAt: null,
            });
          }

          tenantId = tenant.id;
          tenantUuid = tenant.uuid;

          if (tenant.inviteStatus === 'PENDING') {
            createdTenantUuids.push(tenant.uuid);
          }
        } else {
          // No email — commercial/unnamed tenant (no invite sent)
          const tenant = await this.tenantRepository.create({
            pmId,
            commercialName: commercialName || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phone: phoneVal || undefined,
            otherPhone: otherPhoneVal || undefined,
            inviteStatus: 'PENDING',
            inviteSentAt: null,
          });
          tenantId = tenant.id;
          tenantUuid = tenant.uuid;
        }
      }

      // 3. Create Unit
      const existingUnits = await this.unitRepository.findByPropertyId(property.id);
      const duplicateUnit = existingUnits.find(u => u.unitName.trim().toLowerCase() === row.unitName.trim().toLowerCase());

      if (duplicateUnit) {
        // Skip duplicate unit creation
        continue;
      }

      let inferredRentType = row.unitRentType;
      if (!inferredRentType && row.unitRentStartDate && row.unitRentDueDate) {
        const start = new Date(row.unitRentStartDate);
        const due = new Date(row.unitRentDueDate);
        const diffDays = Math.ceil(Math.abs(due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        inferredRentType = diffDays > 300 ? 'Annually' : 'Monthly';
      } else if (!inferredRentType) {
        inferredRentType = 'Monthly';
      }

      const newUnit = await this.unitRepository.create({
        propertyId: property.id,
        unitName: row.unitName.trim(),
        rentAmount: row.unitRentAmount || 0,
        managementFee: row.unitManagementFee ?? 0,
        rentStartDate: row.unitRentStartDate ? new Date(row.unitRentStartDate) : null,
        rentDueDate: row.unitRentDueDate ? new Date(row.unitRentDueDate) : null,
        rentType: inferredRentType,
        currency: row.unitCurrency || 'NGN',
        notes: row.unitNotes || null,
        status: tenantId ? 'OCCUPIED' : 'VACANT',
        tenantId,
        unitType: row.unitType || null,
        rentReminderEnabled: row.unitRentReminderEnabled ?? false,
        rentReminderDaysBefore: row.unitRentReminderDaysBefore ?? 7,
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
          } else if (newUnit.rentType === 'Lease') {
            const years = Math.max(1, row.leaseYears || 1);
            periodEnd.setFullYear(periodEnd.getFullYear() + years);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
          periodEnd.setDate(periodEnd.getDate() - 1);
        }


        await this.unitRepository.addRentPayment(newUnit.uuid, {
          amount: row.unitRentAmountPaid,
          rentAmountAtPayment: newUnit.rentAmount,
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
