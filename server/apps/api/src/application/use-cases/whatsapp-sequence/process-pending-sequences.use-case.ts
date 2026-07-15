import { Injectable, Inject, Logger } from '@nestjs/common';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';
import { WhatsappService } from '../../../shared/infrastructure/whatsapp/whatsapp.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class ProcessPendingSequencesUseCase {
  private readonly logger = new Logger(ProcessPendingSequencesUseCase.name);

  constructor(
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IWhatsappSequenceLogRepository,
    private readonly whatsappService: WhatsappService,
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('[WhatsappSequence] Processing pending sequences...');
    const now = new Date();

    const approvedLogs = await this.sequenceRepository.findLogsBeforeByStatus('APPROVED', now, 50);

    if (approvedLogs.length === 0) {
      return;
    }

    this.logger.log(`[WhatsappSequence] Found ${approvedLogs.length} approved sequences to process.`);

    for (const log of approvedLogs) {
      // Look up user to ensure we have the latest phone
      const user = await this.prisma.upward_user.findUnique({
        where: { id: log.userId },
        select: { phone: true },
      });

      if (!user || !user.phone) {
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', 'No phone number associated with user.');
        continue;
      }

      const plainPhone = this.encryptionService.decrypt(user.phone);

      const bodyTextArgs = log.templateData?.body_text?.[0] || [];
      const parameters = bodyTextArgs.map((text: string) => {
        let decoded = text || '';
        if (text && text.includes(':')) {
          decoded = this.encryptionService.decrypt(text);
        }
        return {
          type: 'text',
          text: decoded,
        };
      });

      try {
        const result = await this.whatsappService.sendMessage({
          to: plainPhone,
          template: {
            name: log.templateName,
            components: [
              {
                type: 'body',
                parameters,
              }
            ],
          },
        });

        let status = 'FAILED';
        let error: string | null = 'Unknown error';

        if (result.success) {
          status = 'SENT';
          error = null;
          await this.sequenceRepository.updateStatus(log.id, 'SENT');
        } else {
          error = result.error || 'Unknown Meta API error';
          await this.sequenceRepository.updateStatus(log.id, 'FAILED', error);
        }

        await this.prisma.upward_communication_log.create({
          data: {
            registeredUserId: log.userId,
            subject: `WhatsApp Sequence: ${log.stage}`,
            status,
            channel: 'WHATSAPP',
            type: 'SEQUENCE',
            recipient: plainPhone,
            body: `Template: ${log.templateName}`,
            lastError: error,
            sentAt: status === 'SENT' ? new Date() : null,
          }
        });
      } catch (error: any) {
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', error.message || 'Unknown internal error');
        await this.prisma.upward_communication_log.create({
          data: {
            registeredUserId: log.userId,
            subject: `WhatsApp Sequence: ${log.stage}`,
            status: 'FAILED',
            channel: 'WHATSAPP',
            type: 'SEQUENCE',
            recipient: plainPhone,
            body: `Template: ${log.templateName}`,
            lastError: error.message || 'Unknown internal error',
          }
        });
      }
    }
  }
}
