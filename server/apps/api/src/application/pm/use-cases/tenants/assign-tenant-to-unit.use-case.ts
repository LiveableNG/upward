import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { 
  PM_UNIT_REPOSITORY, 
  IUnitRepository, 
  PM_TENANT_REPOSITORY, 
  ITenantRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { SyncUnitToUpwardUseCase } from '../units/sync-unit.use-case';

@Injectable()
export class AssignTenantToUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    private readonly prisma: PrismaService,
    private readonly syncUnitToUpwardUseCase: SyncUnitToUpwardUseCase,
  ) {}

  async execute(pmId: number, unitUuid: string, tenantUuid: string | null): Promise<void> {
    const units = await this.unitRepo.findByPmId(pmId);
    const unit = units.find(u => u.uuid === unitUuid);
    if (!unit) throw new NotFoundException('Unit not found');

    if (tenantUuid) {
      const tenant = await this.tenantRepo.findByUuid(tenantUuid);
      if (!tenant || tenant.pmId !== pmId) {
        throw new NotFoundException('Tenant not found');
      }

      await this.unitRepo.update(unitUuid, { 
        tenantId: tenant.id,
        status: 'OCCUPIED'
      });

      if (tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED') {
        try {
          await this.syncUnitToUpwardUseCase.execute(unitUuid, pmId);
        } catch (error) {
          console.error(`Auto-sync failed for unit ${unitUuid} during assignment:`, error);
        }
      }
    } else {

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
