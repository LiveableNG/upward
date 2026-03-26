import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStoryDto } from './dto/create-story.dto'

@Injectable()
export class FairnessStoryService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.upward_fairness_story.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }
}
