import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import { randomUUID } from 'crypto'

@Injectable()
export class GetPmAvatarUploadUrlUseCase {
  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
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
    const fileId = randomUUID()
    const key = `pm/${pm.uuid}/avatar/${fileId}.${ext}`

    const uploadUrl = await this.s3Service.getUploadUrl(key, contentType)

    const baseUrl = this.configService.get<string>('API_URL') || 
                    this.configService.get<string>('BACKEND_URL') || 
                    'http://localhost:4000';

    return {
      key,
      uploadUrl,
      publicUrl: `${baseUrl}/api/v1/public/documents/pm/avatar/${pm.uuid}/${fileId}.${ext}`
    }
  }
}
