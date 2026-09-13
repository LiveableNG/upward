import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PM_TENANT_REPOSITORY,
  ITenantRepository,
} from '../../../../domains/pm/IPropertyRepository';
import { BULK_INVITE_REPOSITORY, IBulkInviteRepository } from '../../../../domains/pm/IBulkInviteRepository';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

export interface BulkInviteDto {
  tenantUuids: string[];
  deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
}

@Injectable()
export class BulkInviteTenantsUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(BULK_INVITE_REPOSITORY)
    private readonly bulkInviteRepo: IBulkInviteRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmId: number, dto: BulkInviteDto, actor?: PmActorContext): Promise<{ bulkInviteId: string }> {
    const { tenantUuids, deliveryChannel } = dto;

    const tenants = await this.tenantRepo.findByUuids(tenantUuids);
    const eligibleTenants = tenants.filter(t => t.inviteStatus !== 'ON_UPWARD' && t.inviteStatus !== 'ACCEPTED');

    if (eligibleTenants.length === 0) {
      throw new Error('No eligible tenants selected for invitation. Selected tenants are already on Upward.');
    }
    
    const bulkInvite = await this.bulkInviteRepo.create({
      pmId,
      status: 'PENDING',
      totalTenants: eligibleTenants.length,
      sentCount: 0,
      failedCount: 0,
      channel: deliveryChannel || 'EMAIL',
      items: eligibleTenants.map(t => ({
        tenantUuid: t.uuid,
        status: 'PENDING',
        retries: 0,
      })) as any
    });

    await this.activityLog.log({
      pmId,
      ownerPmId: pmId,
      employeeId: actor?.employeeId,
      action: ActivityAction.BULK_INVITE_TENANTS,
      entityType: 'TENANT',
      entityId: bulkInvite.id,
      description: `Bulk invited ${eligibleTenants.length} tenants via ${deliveryChannel || 'EMAIL'}`,
      metadata: {
        bulkInviteId: bulkInvite.id,
        totalTenants: eligibleTenants.length,
        channel: deliveryChannel || 'EMAIL',
      },
    }).catch(err => console.error('[BulkInviteTenantsUseCase] Failed to log activity:', err));

    return { bulkInviteId: bulkInvite.id! };
  }
}
