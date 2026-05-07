import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';

export interface UpdateTenantDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  formerAddress?: string;
  nextOfKinName?: string;
  nextOfKinEmail?: string;
  nextOfKinPhone?: string;
  guarantorName?: string;
  guarantorEmail?: string;
  guarantorPhone?: string;
  emergencyContactName?: string;
  emergencyContactEmail?: string;
  emergencyContactPhone?: string;
}

@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
  ) {}

  async execute(pmId: number, uuid: string, data: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findByUuid(uuid);
    if (!tenant || tenant.pmId !== pmId) {
      throw new NotFoundException('Tenant not found');
    }

    if (data.phone && !/^\+234\d{10}$/.test(data.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }

    return this.tenantRepo.update(uuid, data);
  }
}
