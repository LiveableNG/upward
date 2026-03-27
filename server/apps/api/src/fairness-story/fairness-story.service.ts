import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { S3Service } from '../common/s3/s3.service'

@Injectable()
export class FairnessStoryService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async create(createStoryDto: CreateStoryDto) {
    return this.prisma.upward_fairness_story.create({
      data: {
        name: createStoryDto.name,
        categories: createStoryDto.categories,
        story: createStoryDto.story,
        audioUrl: createStoryDto.audioUrl,
        fileUrls: createStoryDto.fileUrls || [],
      },
    })
  }

  async findAll() {
    const stories = await this.prisma.upward_fairness_story.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(
      stories.map(async (story) => {
        const signedAudioUrl = story.audioUrl
          ? await this.s3Service.getDownloadUrl(story.audioUrl)
          : null

        const signedFileUrls = story.fileUrls
          ? await Promise.all(story.fileUrls.map((u) => this.s3Service.getDownloadUrl(u)))
          : []

        return {
          ...story,
          audioUrl: signedAudioUrl,
          fileUrls: signedFileUrls,
        }
      }),
    )
  }

  async remove(id: string) {
    return this.prisma.upward_fairness_story.delete({
      where: { id },
    })
  }
}
