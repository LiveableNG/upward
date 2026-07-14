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

  async findAll(filters: { skip?: number; take?: number; status?: string; stage?: string; email?: string }): Promise<{ data: EmailSequenceLog[]; total: number }> {
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.stage) where.stage = filters.stage
    if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' }

    const [logs, total] = await Promise.all([
      this.prisma.upward_email_sequence_log.findMany({
        where,
        skip: filters.skip,
        take: filters.take || 200,
        include: {
          user: { select: { firstName: true, email: true, lastName: true, phone: true } },
        },
        orderBy: { scheduledFor: 'desc' },
      }),
      this.prisma.upward_email_sequence_log.count({ where })
    ])
    return { data: logs as unknown as EmailSequenceLog[], total }
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

  async getStats(stage: string): Promise<{ total: number; sent: number; failed: number; pending: number }> {
    const counts = await this.prisma.upward_email_sequence_log.groupBy({
      by: ['status'],
      where: { stage },
      _count: { id: true },
    });

    const stats = { total: 0, sent: 0, failed: 0, pending: 0 };
    for (const c of counts) {
      if (c.status === 'SENT') stats.sent = c._count.id;
      if (c.status === 'FAILED') stats.failed = c._count.id;
      if (c.status === 'PENDING') stats.pending = c._count.id;
      stats.total += c._count.id;
    }
    return stats;
  }
}
