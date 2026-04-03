import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { S3Service } from '@shared/infrastructure/common/s3/s3.service'

@Injectable()
export class GetFairnessStoriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute() {
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
}
