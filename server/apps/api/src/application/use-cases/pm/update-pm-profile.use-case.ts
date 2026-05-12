import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'

@Injectable()
export class UpdatePmProfileUseCase {
  private readonly logger = new Logger(UpdatePmProfileUseCase.name)

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmUuid: string, dto: {
    firstName?: string
    lastName?: string
    phone?: string
    businessName?: string
    pmType?: string
    profilePic?: string
    letterheadHeaderUrl?: string
    letterheadFooterUrl?: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    const updatedPm = await this.pmRepository.update(pm.id!, dto)
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, id: serverId, uuid, ...rest } = updatedPm
    const clientProfile: any = {
      id: uuid,
      uuid,
      ...rest
    }

    if (clientProfile.profilePic) {
      clientProfile.profilePic = await this.s3Service.getDownloadUrl(clientProfile.profilePic)
    }

    return clientProfile
  }
}
