import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { TENANT_REPOSITORY, TenantRepository } from '@domains/users/tenant.repository'

@Injectable()
export class UpdateTenantProfileUseCase {
  private readonly logger = new Logger(UpdateTenantProfileUseCase.name)

  constructor(@Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository) {}

  async execute(
    tenantId: string,
    dto: {
      fullName?: string
      phone?: string
      rentAnniversary?: string
      address?: string
      occupation?: string
      gender?: string
      dateOfBirth?: string
      hasDismissedAppBanner?: boolean
    },
  ) {
    const tenant = await this.tenantRepository.findById(tenantId)
    if (!tenant) {
      throw new NotFoundException('Tenant not found')
    }

    const updatedData = {
      ...tenant,
      ...dto,
      rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : tenant.rentAnniversary,
      updatedAt: new Date(),
    }

    await this.tenantRepository.update(tenantId, updatedData)

    // Return updated profile without sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = updatedData
    return profile
  }
}
