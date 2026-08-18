import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'

@Injectable()
export class UpdatePmBankInfoUseCase {
  private readonly logger = new Logger(UpdatePmBankInfoUseCase.name)

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(pmUuid: string, dto: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    const updatedPm = await this.pmRepository.update(pm.id!, dto)
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, id: serverId, uuid, ...rest } = updatedPm
    return {
      id: uuid,
      uuid,
      ...rest
    }
  }
}
