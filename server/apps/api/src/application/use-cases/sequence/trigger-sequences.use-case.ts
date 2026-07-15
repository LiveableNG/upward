import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

import { ProcessPendingEmailSequencesUseCase } from '../email-sequence/process-pending-email-sequences.use-case';
import { ProcessPendingSequencesUseCase } from '../whatsapp-sequence/process-pending-sequences.use-case';

@Injectable()
export class TriggerSequencesUseCase {
  private readonly logger = new Logger(TriggerSequencesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processEmailSequences: ProcessPendingEmailSequencesUseCase,
    private readonly processWhatsappSequences: ProcessPendingSequencesUseCase,
  ) {}

  async execute(channel: 'EMAIL' | 'WHATSAPP', stage: string): Promise<void> {
    this.logger.log(`Triggering sequences for channel: ${channel}, stage: ${stage}`);

    if (channel === 'EMAIL') {
      await this.prisma.upward_email_sequence_log.updateMany({
        where: {
          status: 'ON_HOLD',
          stage: stage,
        },
        data: {
          status: 'APPROVED',
        },
      });
      // Dispatch immediately
      await this.processEmailSequences.execute();
    } else if (channel === 'WHATSAPP') {
      await this.prisma.upward_whatsapp_sequence_log.updateMany({
        where: {
          status: 'ON_HOLD',
          stage: stage,
        },
        data: {
          status: 'APPROVED',
        },
      });
      // Dispatch immediately
      await this.processWhatsappSequences.execute();
    }
  }
}
