import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';
import { InviteTenantUseCase } from './invite-tenant.use-case';

export interface CreateTenantDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  units?: string[]; // Optional unit UUIDs to assign immediately
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
  ) {}

  async execute(pmId: number, data: CreateTenantDto): Promise<TenantEntity> {
    if (data.phone) {
      let cleaned = data.phone.trim().replace(/\s+/g, '');
      
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+234' + cleaned.substring(1);
      } 
      // Handle 10-digit format without prefix: 80... (10 digits)
      else if (!cleaned.startsWith('+') && cleaned.length === 10) {
        cleaned = '+234' + cleaned;
      }

      if (!/^\+234\d{10}$/.test(cleaned)) {
        throw new BadRequestException('Phone number must be in format +2348000000000 or 08000000000');
      }
      
      data.phone = cleaned;
    }
    const existingUser = await this.userRepo.findByEmail(data.email);
    const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

    const { units, ...tenantData } = data;
    const tenant = await this.tenantRepo.create({
      pmId,
      ...tenantData,
      inviteStatus: initialStatus,
      inviteSentAt: null,
    });

    // Always attempt to sync/invite to ensure properties are linked in Core
    try {
      await this.inviteTenantUseCase.execute(pmId, tenant.uuid);
    } catch (error) {
      console.error(`[CreateTenantUseCase] Failed to auto-sync/invite tenant ${tenant.uuid}:`, error);
    }

    return tenant;
  }
}

