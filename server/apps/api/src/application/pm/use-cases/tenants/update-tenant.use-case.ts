import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    if (data.phone) {
      let cleaned = data.phone.trim().replace(/\s+/g, '');
      
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+234' + cleaned.substring(1);
      } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
        cleaned = '+234' + cleaned;
      }

      if (!/^\+234\d{10}$/.test(cleaned)) {
        throw new BadRequestException('Phone number must be in format +2348000000000 or 08000000000');
      }
      
      data.phone = cleaned;
    }

    return this.tenantRepo.update(uuid, data);
  }
}
