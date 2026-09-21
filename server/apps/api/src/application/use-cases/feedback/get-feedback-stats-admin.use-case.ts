import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetFeedbackStatsAdminUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const [totalFeedback, feedbackByType, recentCount] = await Promise.all([
      this.prisma.upward_feedback.count(),
      this.prisma.upward_feedback.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.upward_feedback.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
          },
        },
      }),
    ])

    return {
      totalFeedback,
      feedbackByType,
      recentCount,
    }
  }
}
