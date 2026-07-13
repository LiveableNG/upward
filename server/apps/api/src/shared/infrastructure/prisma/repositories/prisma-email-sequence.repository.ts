import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  EmailSequenceLog,
  IEmailSequenceRepository,
} from '../../../../domains/email-sequence/email-sequence.repository.interface'

@Injectable()
export class PrismaEmailSequenceRepository implements IEmailSequenceRepository {
  constructor(private prisma: PrismaService) {}

  async createMany(data: EmailSequenceLog[]): Promise<void> {
    await this.prisma.upward_email_sequence_log.createMany({
      data: data.map((item) => ({
        userId: item.userId,
        email: item.email,
        stage: item.stage,
        status: item.status,
        scheduledFor: item.scheduledFor,
        templateName: item.templateName,
        templateData: item.templateData || {},
      })),
    })
  }

  async findPendingLogsBefore(date: Date, limit: number): Promise<EmailSequenceLog[]> {
    const logs = await this.prisma.upward_email_sequence_log.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: date },
      },
      include: {
        user: { select: { firstName: true } },
      },
      take: limit,
    })
    return logs as unknown as EmailSequenceLog[]
  }

  async updateStatus(
    id: number,
    status: 'SENT' | 'FAILED',
    errorReason?: string,
    sentAt?: Date,
  ): Promise<void> {
    await this.prisma.upward_email_sequence_log.update({
      where: { id },
      data: {
        status,
        errorReason,
        sentAt,
      },
    })
  }

  async findAll(filters: { status?: string; stage?: string; email?: string }): Promise<EmailSequenceLog[]> {
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.stage) where.stage = filters.stage
    if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' }

    const logs = await this.prisma.upward_email_sequence_log.findMany({
      where,
      include: {
        user: { select: { firstName: true, email: true, lastName: true } },
      },
      orderBy: { scheduledFor: 'desc' },
      take: 200,
    })
    return logs as unknown as EmailSequenceLog[]
  }

  async findById(id: number): Promise<EmailSequenceLog | null> {
    const log = await this.prisma.upward_email_sequence_log.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, email: true } },
      },
    })
    return log as unknown as EmailSequenceLog | null
  }
}
