import { Inject, Injectable } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmTenantsUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
  ) {}

  async execute(pmId: number): Promise<TenantEntity[]> {
    return this.tenantRepo.findAccessibleByPmId(pmId);
  }
}
