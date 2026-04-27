import { Inject, Injectable } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';

export interface CreateTenantDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(pmId: number, data: CreateTenantDto): Promise<TenantEntity> {
    if (data.phone && !/^\+234\d{10}$/.test(data.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }
    const existingUser = await this.userRepo.findByEmail(data.email);
    const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

    return this.tenantRepo.create({
      pmId,
      ...data,
      inviteStatus: initialStatus,
      inviteSentAt: null,
    });
  }
}
