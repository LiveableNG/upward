import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PM_PROPERTY_REPOSITORY, IPropertyRepository } from '../../../domains/pm/IPropertyRepository'
import { randomUUID } from 'crypto'

@Injectable()
export class GetPropertyImageUploadUrlUseCase {
  constructor(
    private readonly s3Service: S3Service,
    @Inject(PM_PROPERTY_REPOSITORY) private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, contentType: string, filename: string) {
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for properties')
    }

    const ext = filename.split('.').pop()
    const key = `pm/${pmId}/properties/${randomUUID()}.${ext}`

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
