import { Inject, Injectable, Logger } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository } from '../../../domains/pm/IPropertyRepository';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SyncUnitToUpwardUseCase } from '../../pm/use-cases/units/sync-unit.use-case';

@Injectable()
export class ConfirmPmConnectionUseCase {
  private readonly logger = new Logger(ConfirmPmConnectionUseCase.name);

  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
    private readonly activityLogService: ActivityLogService,
    private readonly prisma: PrismaService,
    private readonly syncUnitUseCase: SyncUnitToUpwardUseCase,
  ) {}

  async execute(pmId: number, user: any) {
    // 1. Check if the tenant already exists under this PM using emailHash
    const existingTenant = await this.tenantRepository.findByEmailHash(pmId, user.emailHash);

    if (existingTenant) {
      this.logger.log(`Tenant ${user.email} already exists for PM ${pmId}. Auto-syncing units.`);
      // 2. PM already has this tenant. Let's auto-sync.
      // Update invite status to ACCEPTED
      await this.tenantRepository.update(existingTenant.uuid, {
        inviteStatus: 'ACCEPTED'
      });

      // Find any units for this tenant and sync them
      const units = await this.prisma.upward_pm_unit.findMany({
        where: { tenantId: existingTenant.id, isSynced: false }
      });

      let syncedCount = 0;
      for (const unit of units) {
        try {
          await this.syncUnitUseCase.execute(unit.uuid, pmId);
          syncedCount++;
        } catch (e) {
          this.logger.error(`Failed to sync unit ${unit.uuid}:`, e);
        }
      }
      
      return { 
        status: 'SYNCED', 
        message: `Connection successful. ${syncedCount} units have been synced.`,
        syncedCount
      };
    } else {
      this.logger.log(`Tenant ${user.email} not found for PM ${pmId}. Creating join request.`);
      // 3. PM doesn't have this tenant. Create a Join Request log.
      await this.activityLogService.log({
        pmId, // Use PM's ID as the performer because a tenant initiated it
        ownerPmId: pmId,
        action: 'TENANT_JOIN_REQUEST',
        entityType: 'TENANT_REQUEST',
        description: `${user.firstName} ${user.lastName} requested to connect with you as their Property Manager.`,
        metadata: {
          status: 'PENDING',
          userUuid: user.uuid,
          userFirstName: user.firstName,
          userLastName: user.lastName,
          userEmail: user.email,
        }
      });

      return { 
        status: 'REQUESTED', 
        message: 'Your connection request has been sent to the property manager.' 
      };
    }
  }
}
