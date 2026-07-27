import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, ITenantRepository, PM_TENANT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository, PASS_PLACEHOLDERS } from '../../../domains/users/user.repository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { BulkAddRentHistoryDto } from '../dtos/property.dto';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { SingleInviteUseCase } from '../../use-cases/external/single-invite.use-case';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';

@Injectable()
export class BulkAddRentHistoryUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
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
  ) {}

  async execute(pmId: number, dto: BulkAddRentHistoryDto) {
    const unit = await this.unitRepository.findByUuid(dto.unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const pm = await this.pmRepo.findById(pmId);
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
        const email = row.tenantEmail.trim().toLowerCase();
        const emailHash = this.encryption.hash(email);
        
        // 1. Check if it's the current tenant or a past one
        const isCurrentTenant = unit.tenant?.email?.toLowerCase() === email;
        const tenant = isCurrentTenant 
          ? unit.tenant 
          : await this.tenantRepository.findByEmailHash(pmId, emailHash);

        // 2. Add Rent Payment on PM Side
        let periodEnd: Date | null = row.periodEnd ? new Date(row.periodEnd) : null;
        if (!periodEnd) {
          const start = new Date(row.periodStart);
          periodEnd = new Date(start);
          if (unit.rentType === 'Monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else if (unit.rentType === 'Lease') {
            const years = Math.max(1, (unit as any).leaseYears || 1);
            periodEnd.setFullYear(periodEnd.getFullYear() + years);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
          periodEnd.setDate(periodEnd.getDate() - 1);

        }

        const payment = await this.unitRepository.addRentPayment(dto.unitUuid, {
          amount: row.amount,
          paymentDate: new Date(row.paymentDate),
          periodStart: new Date(row.periodStart),
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

              // 4. Create Rent Cycle record linked to the user's property link
              await this.prisma.upward_rent_cycle.create({
                data: {
                  userId: user.id!,
                  userPropertyId: userProperty.id,
                  amountOwed: row.amount,
                  amountPaid: row.amount,
                  currency: unit.currency || 'NGN',
                  dueDate: row.periodEnd ? new Date(row.periodEnd) : new Date(row.paymentDate),
                  paidAt: new Date(row.paymentDate),
                  status: 'PAID',
                  description: row.notes || `Rent record added by ${pm.businessName || 'Manager'}`,
                  source: 'PM_SYNC',
                }
              });

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
        const allPaymentsAfter = await this.unitRepository.getRentPayments(dto.unitUuid);
        const tenantPayments = allPaymentsAfter.filter(p => p.tenantId === unit.tenantId && p.periodStart);

        const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number }>();
        for (const p of tenantPayments) {
          const key = new Date(p.periodStart!).toISOString().split('T')[0]!;
          if (!periodMap.has(key)) {
            periodMap.set(key, {
              periodStart: new Date(p.periodStart!),
              periodEnd: p.periodEnd ? new Date(p.periodEnd) : new Date(p.periodStart!),
              total: 0
            });
          }
          periodMap.get(key)!.total += p.amount;
        }

        const sortedPeriods = Array.from(periodMap.values()).sort(
          (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
        );

        const fullyPaidPeriods = sortedPeriods.filter(p => p.total >= (unit.rentAmount || 0));

        if (fullyPaidPeriods.length > 0) {
          const latestFullyPaid = fullyPaidPeriods[fullyPaidPeriods.length - 1]!;
          await this.unitRepository.update(dto.unitUuid, {
            rentStartDate: latestFullyPaid.periodStart,
            rentDueDate: latestFullyPaid.periodEnd
          });

          if (unit.isSynced && unit.userPropertyUuid) {
            await this.prisma.upward_user_property.updateMany({
              where: { uuid: unit.userPropertyUuid },
              data: {
                rentStartDate: latestFullyPaid.periodStart,
                rentEndDate: latestFullyPaid.periodEnd
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to recalculate unit dates after bulk rent history import:', err);
      }
    }

    return results;
  }
}
