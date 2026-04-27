import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
  ) {}

  async execute(pmId: number, uuid: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findByUuid(uuid);
    if (!tenant || tenant.pmId !== pmId) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
