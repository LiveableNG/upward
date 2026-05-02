import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { Feedback, IFeedbackRepository } from '../../../../domains/feedback/feedback.repository'

@Injectable()
export class PrismaFeedbackRepository implements IFeedbackRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<Feedback, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<Feedback> {
    const feedback = await this.prisma.upward_feedback.create({
      data: {
        userId: data.userId,
        email: data.email,
        name: data.name,
        type: data.type,
        message: data.message,
      },
    })
    return feedback as Feedback
  }

  async findAll(): Promise<Feedback[]> {
    const feedbacks = await this.prisma.upward_feedback.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return feedbacks as Feedback[]
  }
}
