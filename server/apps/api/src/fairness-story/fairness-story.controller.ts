import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common'
import { FairnessStoryService } from './fairness-story.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { S3Service } from '../common/s3/s3.service'
import { randomUUID } from 'crypto'

@Controller('fairness-story')
export class FairnessStoryController {
  constructor(
    private readonly fairnessStoryService: FairnessStoryService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('upload-urls')
  async getUploadUrls(
    @Body() body: { files: { filename: string; contentType: string; isAudio?: boolean }[] },
  ) {
    if (!body.files || !Array.isArray(body.files)) {
      throw new BadRequestException('files array is required')
    }

    const tasks = body.files.map(async (file) => {
      const ext = file.filename.split('.').pop()
      const folder = file.isAudio ? 'audio' : 'documents'
      const key = `fairness-stories/${folder}/${randomUUID()}.${ext}`

      const uploadUrl = await this.s3Service.getUploadUrl(key, file.contentType)

      return {
        filename: file.filename,
        key, // The unique path in S3
        uploadUrl, // The temporary PUT link
        isAudio: file.isAudio,
      }
    })

    const results = await Promise.all(tasks)
    return { urls: results }
  }

  @Post()
  async create(@Body() createStoryDto: CreateStoryDto) {
    return this.fairnessStoryService.create(createStoryDto)
  }

  @Get()
  async findAll() {
    return this.fairnessStoryService.findAll()
  }
}
