import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { Feedback, IFeedbackRepository } from '../../../../domains/feedback/feedback.repository'

@Injectable()
export class PrismaFeedbackRepository implements IFeedbackRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<Feedback, 'id' | 'uuid' | 'createdAt' | 'updatedAt'> & { pmUuid?: string | null }): Promise<Feedback> {
    let pmId = data.pmId ?? undefined
    if (!pmId && data.pmUuid) {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: data.pmUuid },
        select: { id: true },
      })
      if (pm) {
        pmId = pm.id
      }
    }

    const feedback = await this.prisma.upward_feedback.create({
      data: {
        userId: data.userId || null,
        pmId: pmId || null,
        email: data.email || null,
        name: data.name || null,
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
