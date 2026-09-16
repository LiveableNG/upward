import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, ITenantRepository, PM_TENANT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository, PASS_PLACEHOLDERS } from '../../../domains/users/user.repository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { BulkAddRentHistoryDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { SingleInviteUseCase } from '../../use-cases/external/single-invite.use-case';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { RentalPeriodService } from '../../services/rental-period.service';

@Injectable()
export class BulkAddRentHistoryUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly singleInviteUseCase: SingleInviteUseCase,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly activityLog: ActivityLogService,
    private readonly rentalPeriodService: RentalPeriodService,
  ) {}

  async execute(pmId: number, dto: BulkAddRentHistoryDto, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const unit = await this.unitRepository.findByUuid(dto.unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(ownerPmId, unit.propertyId, actor);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this unit');
    }

    const pm = await this.pmRepo.findById(ownerPmId);
    if (!pm) throw new NotFoundException('Property Manager not found');


    const results = {
      total: dto.rows.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Keep track of which users we've already emailed in this batch to avoid spam
    const emailedUsers = new Set<string>();

    for (const row of dto.rows) {
      try {
        const email = row.tenantEmail?.trim();
        const emailHash = email ? this.encryption.hash(email) : null;
        
        // 1. Check if it's the current tenant or a past one
        const isCurrentTenant = unit.tenant && emailHash && unit.tenant.emailHash === emailHash;
        const tenant = isCurrentTenant 
          ? unit.tenant 
          : (emailHash ? await this.tenantRepository.findByEmailHash(pmId, emailHash) : null);

        // 2. Add Rent Payment on PM Side
        const start = this.rentalPeriodService.parseCalendarDate(row.periodStart);
        let periodEnd = this.rentalPeriodService.parseCalendarDate(row.periodEnd);
        if (!periodEnd && start) {
          periodEnd = this.rentalPeriodService.calculateNextPeriod(
            start,
            start,
            unit.rentType,
            (unit as any).leaseYears,
          ).nextEnd;
        }

        const payment = await this.unitRepository.addRentPayment(dto.unitUuid, {
          amount: row.amount,
          rentAmountAtPayment: unit.rentAmount,
          paymentDate: new Date(row.paymentDate),
          periodStart: start,
          periodEnd,
          method: row.method || 'Bank Transfer',
          reference: null,
          status: 'SUCCESS',
          notes: row.notes || (row.tenantFirstName ? `${row.tenantFirstName} ${row.tenantLastName}` : 'Bulk Import'),
          tenantId: tenant?.id,
        });

        // 3. Resolve/Create Upward User & Property Link
        if (email) {
          const inviteResult = await this.singleInviteUseCase.execute({
            company: { name: pm.businessName || 'UPWARD' },
            invite: {
              user: {
                email,
                firstName: row.tenantFirstName || (isCurrentTenant ? unit.tenant?.firstName : '') || 'Tenant',
                lastName: row.tenantLastName || (isCurrentTenant ? unit.tenant?.lastName : '') || '',
              },
              properties: [{
                location: {
                  country: unit.property?.country || 'Nigeria',
                  state: unit.property?.state || '',
                  area: unit.property?.area || unit.property?.name || 'Property',
                  address: unit.property?.address || '',
                },
                rent: {
                  rentAmount: unit.rentAmount || row.amount,
                  rentEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                },
                manager: {
                  firstName: pm.firstName,
                  lastName: pm.lastName,
                  email: pm.email,
                }
              }]
            }
          });

          const userPropertyUuid = inviteResult.userPropertyUuid;
          const userUuid = inviteResult.userId;

          if (userPropertyUuid && userUuid) {
            const user = await this.userRepository.findByUuid(userUuid);
            const userProperty = await this.prisma.upward_user_property.findUnique({
              where: { uuid: userPropertyUuid }
            });

            if (user && userProperty) {
              if (!isCurrentTenant && !userProperty.isPastTenancy) {
                await this.prisma.upward_user_property.update({
                  where: { id: userProperty.id },
                  data: { isPastTenancy: true }
                });
              }

              if (!emailedUsers.has(email)) {
                const isShadowUser = user.passwordHash === PASS_PLACEHOLDERS.INVITED || user.passwordHash === PASS_PLACEHOLDERS.SHADOW;
                const propertyAddress = unit.property?.address || unit.property?.name || 'your rental property';
                const pmName = pm.businessName || `${pm.firstName} ${pm.lastName}`;

                await this.unifiedCommService.processCommunication({
                  recipientEmail: email,
                  recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant',
                  recipientRole: 'TENANT',
                  registeredUserId: user.id,
                  pmUuid: pm.uuid,
                  type: isShadowUser ? 'NEW_USER_RECORDS' : 'RECORD_ADDED',
                  context: {
                    displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant',
                    pmName,
                    propertyAddress,
                    completeProfileLink: inviteResult.inviteLink,
                    frontendUrl: 'https://upward.goodtenants.io',
                  },
                });
                emailedUsers.add(email);
              }
            }
          }
        }

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row for ${row.tenantEmail}: ${err.message}`);
      }
    }

    // Recalculate unit's active occupancy period based on all payments after bulk import
    if (unit.tenantId) {
      try {
        await this.rentalPeriodService.syncUnitPropertyState(unit.id);
      } catch (err) {
        console.error('Failed to sync unit property state after bulk rent history import:', err);
      }
    }

    if (results.success > 0) {
      await this.activityLog.log({
        pmId,
        ownerPmId,
        employeeId: actor?.employeeId,
        action: ActivityAction.ADD_RENT_HISTORY,
        entityType: 'RENT_PAYMENT',
        entityId: unit.uuid,
        description: `Imported ${results.success} rent payment records for unit ${unit.unitName || unit.uuid}`,
        metadata: {
          unitUuid: unit.uuid,
          unitName: unit.unitName,
          propertyName: unit.property?.name,
          successCount: results.success,
          totalRows: dto.rows.length,
        },
      }).catch(err => console.error('[BulkAddRentHistoryUseCase] Failed to log activity:', err));
    }

    return results;
  }
}
