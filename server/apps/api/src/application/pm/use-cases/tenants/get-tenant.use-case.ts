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

  async execute(pmId: number, uuid: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findByUuid(uuid);
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.pmId === pmId) return tenant;

    // Check if user is a collaborator on any property this tenant has a unit in
    const units = tenant.units || [];
    for (const unit of units) {
      const hasAccess = await this.propertyRepository.hasAccessToProperty(pmId, unit.propertyId);
      if (hasAccess) return tenant;
    }

    throw new NotFoundException('Tenant not found');
  }
}
