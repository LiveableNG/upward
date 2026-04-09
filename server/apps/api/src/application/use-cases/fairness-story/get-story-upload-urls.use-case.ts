import { Injectable, BadRequestException } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'

export interface StoryFileUploadDto {
  filename: string
  contentType: string
  isAudio?: boolean
}

@Injectable()
export class GetStoryUploadUrlsUseCase {
  constructor(private readonly s3Service: S3Service) {}

  async execute(files: StoryFileUploadDto[]) {
    if (!files || !Array.isArray(files)) {
      throw new BadRequestException('files array is required')
    }

    const tasks = files.map(async (file) => {
      const ext = file.filename.split('.').pop()
      const folder = file.isAudio ? 'audio' : 'documents'
      const key = `fairness-stories/${folder}/${randomUUID()}.${ext}`

      const uploadUrl = await this.s3Service.getUploadUrl(key, file.contentType)

      return {
        filename: file.filename,
        key,
        uploadUrl,
        isAudio: file.isAudio,
      }
    })

    const results = await Promise.all(tasks)
    return { urls: results }
  }
}
