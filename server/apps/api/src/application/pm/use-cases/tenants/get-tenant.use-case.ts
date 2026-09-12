import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity, PM_PROPERTY_REPOSITORY, IPropertyRepository } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, uuid: string, actor?: any): Promise<TenantEntity> {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const tenant = await this.tenantRepo.findByUuid(uuid);
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.pmId !== ownerPmId) {
      throw new NotFoundException('Tenant not found');
    }

    if (!actor || !actor.isEmployee || actor.accessLevel === 'ALL') {
      return tenant;
    }

    // For employees, check if any unit of this tenant is on an assigned property
    const units = tenant.units || [];
    for (const unit of units) {
      const hasAccess = await this.propertyRepository.hasAccessToProperty(ownerPmId, unit.propertyId, actor);
      if (hasAccess) return tenant;
    }

    throw new NotFoundException('Tenant not found');
  }

}
