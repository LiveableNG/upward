import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { CreateStoryDto } from '../../../interfaces/http/dto/create-story.dto'

@Injectable()
export class CreateFairnessStoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateStoryDto) {
    return this.prisma.upward_fairness_story.create({
      data: {
        name: dto.name,
        categories: dto.categories,
        story: dto.story,
        audioUrl: dto.audioUrl,
        fileUrls: dto.fileUrls || [],
      },
    })
  }
}
