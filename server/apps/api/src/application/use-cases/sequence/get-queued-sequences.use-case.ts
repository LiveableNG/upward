import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

export interface QueuedSequenceDto {
  channel: 'EMAIL' | 'WHATSAPP';
  stage: string;
  count: number;
}

@Injectable()
export class GetQueuedSequencesUseCase {
  private readonly logger = new Logger(GetQueuedSequencesUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<QueuedSequenceDto[]> {
    const emailCounts = await this.prisma.upward_email_sequence_log.groupBy({
      by: ['stage'],
      where: { status: 'ON_HOLD' },
      _count: { id: true },
    });

    const whatsappCounts = await this.prisma.upward_whatsapp_sequence_log.groupBy({
      by: ['stage'],
      where: { status: 'ON_HOLD' },
      _count: { id: true },
    });

    const results: QueuedSequenceDto[] = [];
    
    for (const ec of emailCounts) {
      results.push({
        channel: 'EMAIL',
        stage: ec.stage,
        count: ec._count.id,
      });
    }

    for (const wc of whatsappCounts) {
      results.push({
        channel: 'WHATSAPP',
        stage: wc.stage,
        count: wc._count.id,
      });
    }

    return results;
  }
}
