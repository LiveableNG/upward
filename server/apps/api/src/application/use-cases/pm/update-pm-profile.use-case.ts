import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'

@Injectable()
export class UpdatePmProfileUseCase {
  private readonly logger = new Logger(UpdatePmProfileUseCase.name)

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(pmUuid: string, dto: {
    firstName?: string
    lastName?: string
    phone?: string
    businessName?: string
    profilePic?: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    return this.pmRepository.update(pm.id!, dto)
  }
}
