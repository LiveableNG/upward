import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import { randomUUID } from 'crypto'

@Injectable()
export class GetPmAvatarUploadUrlUseCase {
  constructor(
    private readonly s3Service: S3Service,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(pmUuid: string, contentType: string, filename: string) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) {
      throw new BadRequestException('Property manager not found')
    }

    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for avatars')
    }

    const ext = filename.split('.').pop()
    const key = `pm/${pm.uuid}/avatar/${randomUUID()}.${ext}`

    const uploadUrl = await this.s3Service.getUploadUrl(key, contentType)

    const bucket = process.env['AWS_S3_BUCKET']
    const region = process.env['AWS_REGION']

    return {
      key,
      uploadUrl,
      publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`
    }
  }
}
