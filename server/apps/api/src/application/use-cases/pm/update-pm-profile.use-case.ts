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
    country?: string
    cacNumber?: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    // 1. Handle file deletions for replaced/removed items
    if (dto.profilePic !== undefined && pm.profilePic && pm.profilePic !== dto.profilePic) {
      await this.s3Service.deleteObject(pm.profilePic)
    }
    if (dto.letterheadHeaderUrl !== undefined && pm.letterheadHeaderUrl && pm.letterheadHeaderUrl !== dto.letterheadHeaderUrl) {
      await this.s3Service.deleteObject(pm.letterheadHeaderUrl)
    }
    if (dto.letterheadFooterUrl !== undefined && pm.letterheadFooterUrl && pm.letterheadFooterUrl !== dto.letterheadFooterUrl) {
      await this.s3Service.deleteObject(pm.letterheadFooterUrl)
    }

    // 2. Update the profile
    const updatedPm = await this.pmRepository.update(pm.id!, dto)
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, id: serverId, uuid, ...rest } = updatedPm
    const clientProfile: any = {
      id: uuid,
      uuid,
      ...rest
    }

    // 3. Sign all S3 URLs for the client
    if (clientProfile.profilePic) {
      clientProfile.profilePic = await this.s3Service.getDownloadUrl(clientProfile.profilePic)
    }
    if (clientProfile.letterheadHeaderUrl) {
      clientProfile.letterheadHeaderUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadHeaderUrl)
    }
    if (clientProfile.letterheadFooterUrl) {
      clientProfile.letterheadFooterUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadFooterUrl)
    }

    return clientProfile
  }
}
