import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class DeleteFairnessStoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string) {
    return this.prisma.upward_fairness_story.delete({
      where: { id },
    })
  }
}
