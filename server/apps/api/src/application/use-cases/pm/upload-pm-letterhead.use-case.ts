import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import { randomUUID } from 'crypto'

@Injectable()
export class UploadPmLetterheadUseCase {
  constructor(
    private readonly s3Service: S3Service,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  async execute(pmUuid: string, type: 'header' | 'footer' | 'template_pdf', base64Data: string, contentType: string) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) {
      throw new BadRequestException('Property manager not found')
    }

    if (type === 'template_pdf') {
      if (contentType !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed for templates')
      }
    } else {
      if (!contentType.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed for previews')
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const ext = contentType.split('/')[1] || 'png'
    const key = `pm/${pm.uuid}/letterhead/${type}_${randomUUID()}.${ext}`

    const publicUrl = await this.s3Service.uploadBuffer(buffer, key, contentType)

    return {
      publicUrl
    }
  }
}
