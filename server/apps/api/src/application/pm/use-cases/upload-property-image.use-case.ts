import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'

@Injectable()
export class UploadPropertyImageUseCase {
  constructor(
    private readonly s3Service: S3Service
  ) {}

  async execute(pmId: number, base64Data: string, contentType: string, filename?: string) {
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for properties')
    }

    const buffer = Buffer.from(base64Data, 'base64')
    
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const ext = filename?.split('.').pop() || contentType.split('/')[1] || 'png'
    const key = `pm/${pmId}/properties/${randomUUID()}.${ext}`

    const publicUrl = await this.s3Service.uploadBuffer(buffer, key, contentType)

    return {
      publicUrl,
      key
    }
  }
}
