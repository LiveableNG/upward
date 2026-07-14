import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IWhatsappSequenceLogRepository } from '../../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';
import { WhatsappSequenceLogEntity } from '../../../../domains/whatsapp-sequence/whatsapp-sequence.entity';

@Injectable()
export class PrismaWhatsappSequenceLogRepository implements IWhatsappSequenceLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: any): WhatsappSequenceLogEntity {
    return new WhatsappSequenceLogEntity(
      record.id,
      record.uuid,
      record.userId,
      record.phoneEncrypted,
      record.phoneHash,
      record.stage,
      record.status,
      record.scheduledFor,
      record.sentAt,
      record.errorReason,
      record.templateName,
      record.templateData,
      record.createdAt,
      record.updatedAt,
      record.user,
    );
  }

  async createMany(
    logs: Omit<WhatsappSequenceLogEntity, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'sentAt' | 'errorReason'>[]
  ): Promise<void> {
    await this.prisma.upward_whatsapp_sequence_log.createMany({
      data: logs.map(log => ({
        userId: log.userId,
        phoneEncrypted: log.phoneEncrypted,
        phoneHash: log.phoneHash,
        stage: log.stage,
        status: log.status,
        scheduledFor: log.scheduledFor,
        templateName: log.templateName,
        templateData: log.templateData ?? {},
      })),
      skipDuplicates: true,
    });
  }

  async findPendingLogsBefore(date: Date, limit: number): Promise<WhatsappSequenceLogEntity[]> {
    const records = await this.prisma.upward_whatsapp_sequence_log.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: date },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
      take: limit,
      orderBy: { scheduledFor: 'asc' },
    });

    return records.map((r) => this.mapToEntity(r));
  }

  async updateStatus(
    id: number,
    status: string,
    errorReason?: string | null
  ): Promise<WhatsappSequenceLogEntity> {
    const record = await this.prisma.upward_whatsapp_sequence_log.update({
      where: { id },
      data: {
        status,
        errorReason: errorReason ?? null,
        sentAt: status === 'SENT' ? new Date() : undefined,
      },
    });

    return this.mapToEntity(record);
  }

  async findById(id: number): Promise<WhatsappSequenceLogEntity | null> {
    const record = await this.prisma.upward_whatsapp_sequence_log.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findAll(options: { skip?: number; take?: number; status?: string; stage?: string }): Promise<{ data: WhatsappSequenceLogEntity[]; total: number }> {
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.stage) where.stage = options.stage;
    
    const [records, total] = await Promise.all([
      this.prisma.upward_whatsapp_sequence_log.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { scheduledFor: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      }),
      this.prisma.upward_whatsapp_sequence_log.count({ where }),
    ]);

    return {
      data: records.map((r: any) => this.mapToEntity(r)),
      total,
    };
  }

  async getStats(stage: string): Promise<{ total: number; sent: number; failed: number; pending: number }> {
    const counts = await this.prisma.upward_whatsapp_sequence_log.groupBy({
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
