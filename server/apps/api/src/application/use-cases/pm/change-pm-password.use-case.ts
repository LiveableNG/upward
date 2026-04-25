import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import * as bcrypt from 'bcrypt'

@Injectable()
export class ChangePmPasswordUseCase {
  private readonly logger = new Logger(ChangePmPasswordUseCase.name)

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(pmUuid: string, dto: {
    currentPassword?: string
    newPassword: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    if (dto.currentPassword) {
      const isValid = await bcrypt.compare(dto.currentPassword, pm.passwordHash)
      if (!isValid) throw new BadRequestException('Current password is incorrect')
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10)
    await this.pmRepository.update(pm.id!, { passwordHash })

    return { success: true }
  }
}
