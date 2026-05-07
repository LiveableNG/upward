import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PM_TENANT_REPOSITORY,
  ITenantRepository,
} from '../../../../domains/pm/IPropertyRepository';
import { BULK_INVITE_REPOSITORY, IBulkInviteRepository } from '../../../../domains/pm/IBulkInviteRepository';

export interface BulkInviteDto {
  tenantUuids: string[];
}

@Injectable()
export class BulkInviteTenantsUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(BULK_INVITE_REPOSITORY)
    private readonly bulkInviteRepo: IBulkInviteRepository,
  ) {}

  async execute(pmId: number, dto: BulkInviteDto): Promise<{ bulkInviteId: string }> {
    const { tenantUuids } = dto;

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
      items: eligibleTenants.map(t => ({
        tenantUuid: t.uuid,
        status: 'PENDING',
        retries: 0,
      })) as any
    });

    return { bulkInviteId: bulkInvite.id! };
  }
}
