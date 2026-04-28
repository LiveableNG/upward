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

    if (!tenantUuids || tenantUuids.length === 0) {
      throw new Error('No tenants selected for invitation');
    }
    
    const bulkInvite = await this.bulkInviteRepo.create({
      pmId,
      status: 'PENDING',
      totalTenants: tenantUuids.length,
      sentCount: 0,
      failedCount: 0,
      items: tenantUuids.map(uuid => ({
        tenantUuid: uuid,
        status: 'PENDING',
        retries: 0,
      })) as any
    });

    return { bulkInviteId: bulkInvite.id! };
  }
}
