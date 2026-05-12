import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { 
  PM_UNIT_REPOSITORY, 
  IUnitRepository, 
  PM_TENANT_REPOSITORY, 
  ITenantRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { SyncUnitToUpwardUseCase } from '../units/sync-unit.use-case';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';

@Injectable()
export class AssignTenantToUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly prisma: PrismaService,
    private readonly syncUnitToUpwardUseCase: SyncUnitToUpwardUseCase,
  ) {}

  async execute(
    pmId: number, 
    unitUuid: string, 
    tenantUuid: string | null, 
    rentAmountPaid?: number,
    rentAmount?: number,
    rentType?: string,
    rentStartDate?: Date,
    rentDueDate?: Date
  ): Promise<void> {
    const units = await this.unitRepo.findByPmId(pmId);
    const unit = units.find(u => u.uuid === unitUuid);
    if (!unit) throw new NotFoundException('Unit not found');

    if (tenantUuid) {
      const tenant = await this.tenantRepo.findByUuid(tenantUuid);
      if (!tenant || tenant.pmId !== pmId) {
        throw new NotFoundException('Tenant not found');
      }

      // Update unit with tenant and potentially new rent terms
      await this.unitRepo.update(unitUuid, { 
        tenantId: tenant.id,
        status: 'OCCUPIED',
        rentAmount: rentAmount !== undefined ? rentAmount : unit.rentAmount,
        rentType: rentType || unit.rentType,
        rentStartDate: rentStartDate || unit.rentStartDate,
        rentDueDate: rentDueDate || unit.rentDueDate,
      });

      // Handle initial payment if provided
      if (rentAmountPaid !== undefined && rentAmountPaid >= 0) {
        const activeRentStartDate = rentStartDate || unit.rentStartDate;
        const activeRentType = rentType || unit.rentType;
        
        let periodEnd: Date | null = null;
        if (activeRentStartDate) {
          periodEnd = new Date(activeRentStartDate);
          if (activeRentType === 'Monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
          periodEnd.setDate(periodEnd.getDate() - 1);
        }

        await this.unitRepo.addRentPayment(unitUuid, {
          amount: rentAmountPaid,
          paymentDate: new Date(),
          periodStart: activeRentStartDate,
          status: 'SUCCESS',
          method: 'Other',
          notes: 'Initial payment recorded during tenant assignment',
          periodEnd: periodEnd,
          tenantId: tenant.id,
          reference: null
        });
      }

      // Check if user exists on Upward Core platform
      const upwardUser = tenant.email ? await this.userRepo.findByEmail(tenant.email) : null;
      
      if (upwardUser || tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED') {
        try {
          await this.syncUnitToUpwardUseCase.execute(unitUuid, pmId);
        } catch (error) {
          console.error(`Auto-sync failed for unit ${unitUuid} during assignment:`, error);
        }
      }
    } else {
      // ... (existing unassign logic)
      if (unit.isSynced && unit.userPropertyUuid) {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: unit.userPropertyUuid },
          data: {
            isVerified: false,
            isPastTenancy: true
          }
        });
      }

      await this.unitRepo.update(unitUuid, { 
        tenantId: null,
        status: 'VACANT',
        isSynced: false,
        userPropertyUuid: null
      });
    }
  }
}
