import { Inject, Injectable, Logger } from '@nestjs/common';
import { PM_UNIT_REPOSITORY, IUnitRepository } from '../../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../../domains/companies/property.repository';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../../../domains/notifications/notification.repository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { LOCATION_REPOSITORY, LocationRepository } from '../../../../domains/companies/property.repository';
import { COMPANY_REPOSITORY, CompanyRepository, MANAGER_REPOSITORY, ManagerRepository } from '../../../../domains/companies/company.repository';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../../domains/payments/payment.repository';

@Injectable()
export class SyncUnitToUpwardUseCase {
  private readonly logger = new Logger(SyncUnitToUpwardUseCase.name);

  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly platformPropertyRepo: PropertyRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepository,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: LocationRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepo: ManagerRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) { }

  async execute(unitUuid: string, pmId: number): Promise<void> {
    const unit = await this.unitRepo.findByUuid(unitUuid);
    if (!unit) throw new Error('Unit not found');

    if (unit.isSynced) {
      throw new Error('Unit is already synced to Upward Pay');
    }

    if (!unit.tenantId || !unit.tenant) {
      throw new Error('Unit must have an assigned tenant to sync');
    }

    if (unit.tenant.inviteStatus !== 'ON_UPWARD' && unit.tenant.inviteStatus !== 'ACCEPTED' && unit.tenant.inviteStatus !== 'SENT') {
      throw new Error('Tenant must be invited or active on Upward to sync unit');
    }

    const tenantEmail = unit.tenant.email;
    if (!tenantEmail) throw new Error('Tenant has no email address');

    const upwardUser = await this.userRepo.findByEmail(tenantEmail);
    if (!upwardUser) throw new Error('Tenant user record not found on Upward');

    // Fetch and decrypt PM info for core sync
    const pmRecord = await this.prisma.upward_property_manager.findUnique({
      where: { id: pmId }
    });
    if (!pmRecord) throw new Error('Property Manager not found');

    const pmFirstName = pmRecord.firstName ? this.encryption.decrypt(pmRecord.firstName) : '';
    const pmLastName = pmRecord.lastName ? this.encryption.decrypt(pmRecord.lastName) : '';
    const pmEmail = pmRecord.email ? this.encryption.decrypt(pmRecord.email) : '';
    const pmPhone = pmRecord.phone ? this.encryption.decrypt(pmRecord.phone) : '';
    const pmBusinessName = pmRecord.businessName ? this.encryption.decrypt(pmRecord.businessName) : `${pmFirstName} ${pmLastName}`;

    // Find or Create Company in Upward Core
    let company = await this.companyRepo.findByName(pmBusinessName);
    if (!company) {
      company = await this.companyRepo.save({
        uuid: crypto.randomUUID(),
        name: 'UPWARD',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    // Find or Create Manager in Upward Core
    let manager = pmEmail ? await this.managerRepo.findByEmail(pmEmail) : null;
    if (!manager && pmEmail) {
      manager = await this.managerRepo.save({
        uuid: crypto.randomUUID(),
        companyId: company.id!,
        firstName: pmFirstName,
        lastName: pmLastName,
        email: pmEmail,
        phone: pmPhone,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    // 4. Resolve Subaccount for PM
    let subaccountId: number | undefined;
    if (pmRecord.accountNumber && pmRecord.bankCode) {
      const subaccount = await this.paymentGateway.findOrCreateSubaccount({
        businessName: pmRecord.accountName || pmBusinessName,
        bankCode: pmRecord.bankCode,
        accountNumber: pmRecord.accountNumber,
      });
      if (subaccount) {
        subaccountId = subaccount.id;
      }
    }

    // Perform transaction
    await this.prisma.$transaction(async (tx) => {
      const existingUserProperty = await tx.upward_user_property.findFirst({
        where: {
          userId: upwardUser.id!,
          pmUnitId: unit.id,
        }
      });

      let userProperty;

      if (existingUserProperty) {
        userProperty = await tx.upward_user_property.update({
          where: { id: existingUserProperty.id },
          data: {
            companyId: company.id,
            managerId: manager?.id,
            rentAmount: unit.rentAmount,
            currency: unit.currency,
            rentStartDate: unit.rentStartDate || undefined,
            rentEndDate: unit.rentDueDate || undefined,
            isVerified: true,
            isPastTenancy: false,
            amountRemaining: unit.rentAmount,
            subaccountId: subaccountId || existingUserProperty.subaccountId,
          }
        });
      } else {
        // Create location record (only for new properties)
        const location = await this.locationRepo.save({
          uuid: crypto.randomUUID(),
          country: unit.property?.country || 'Nigeria',
          state: unit.property?.state || '',
          area: unit.property?.area || '',
          address: unit.property?.address || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        // Create new upward_user_property
        userProperty = await tx.upward_user_property.create({
          data: {
            userId: upwardUser.id!,
            locationId: location.id,
            companyId: company.id,
            managerId: manager?.id,
            rentAmount: unit.rentAmount,
            currency: unit.currency,
            rentStartDate: unit.rentStartDate || undefined,
            rentEndDate: unit.rentDueDate || undefined,
            isVerified: true,
            amountPaid: 0,
            amountRemaining: unit.rentAmount,
            pmId,
            pmUnitId: unit.id,
            subaccountId: subaccountId,
          }
        });
      }

      // 2. Update PM Unit
      await tx.upward_pm_unit.update({
        where: { uuid: unitUuid },
        data: {
          isSynced: true,
          userPropertyUuid: userProperty.uuid,
        }
      });

      // 3. Create Notification for Tenant
      await this.notificationRepo.createNotification({
        userId: upwardUser.id!,
        title: 'New Property Verified',
        message: `Your property at ${unit.property?.name || 'Unit ' + unit.unitName} has been verified by your property manager ${pmFirstName} ${pmLastName}. You can now manage payments for this unit on Upward.`,
        type: 'SYSTEM',
        url: `/properties/${userProperty.uuid}`
      });
    });

    this.logger.log(`Unit ${unitUuid} synced to Upward Pay for user ${upwardUser.email}`);
  }
}
