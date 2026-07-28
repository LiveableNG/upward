import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';
import { WhatsappService } from '../../../shared/infrastructure/whatsapp/whatsapp.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class RetrySequenceUseCase {
  private readonly logger = new Logger(RetrySequenceUseCase.name);

  constructor(
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IWhatsappSequenceLogRepository,
    private readonly whatsappService: WhatsappService,
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: number, adminId?: string): Promise<void> {
    this.logger.log(`[WhatsappSequence] Admin ${adminId} retrying sequence log ${id}`);
    
    const log = await this.sequenceRepository.findById(id);
    if (!log) {
      throw new NotFoundException('Sequence log not found');
    }

    if (log.status === 'SENT') {
      throw new BadRequestException('Cannot retry a sequence that was already sent successfully');
    }

    const user = await this.prisma.upward_user.findUnique({
      where: { id: log.userId },
      select: { phone: true },
    });

    if (!user || !user.phone) {
      await this.sequenceRepository.updateStatus(log.id, 'FAILED', 'No phone number associated with user.');
      throw new BadRequestException('User has no phone number');
    }

    const plainPhone = this.encryptionService.decrypt(user.phone);
    const bodyTextArgs = log.templateData?.body_text?.[0] || [];
    const parameters = bodyTextArgs.map((text: string) => ({
      type: 'text',
      text: text || '',
    }));

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
        if (result.messageId) {
          await this.sequenceRepository.saveMetaMessageId(log.id, result.messageId);
        }
      } else {
        error = result.error || 'Unknown Meta API error during retry';
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', error);
      }

      await this.prisma.upward_communication_log.create({
        data: {
          registeredUserId: log.userId,
          subject: `WhatsApp Sequence: ${log.stage} (Retry)`,
          status,
          channel: 'WHATSAPP',
          type: 'SEQUENCE',
          recipient: plainPhone,
          body: `Template: ${log.templateName}`,
          lastError: error,
          sentAt: status === 'SENT' ? new Date() : null,
        }
      });

      if (!result.success) {
        throw new BadRequestException(`Meta API Error: ${result.error}`);
      }
    } catch (error: any) {
      if (!(error instanceof BadRequestException)) {
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', error.message || 'Unknown internal error during retry');
        await this.prisma.upward_communication_log.create({
          data: {
            registeredUserId: log.userId,
            subject: `WhatsApp Sequence: ${log.stage} (Retry)`,
            status: 'FAILED',
            channel: 'WHATSAPP',
            type: 'SEQUENCE',
            recipient: plainPhone,
            body: `Template: ${log.templateName}`,
            lastError: error.message || 'Unknown internal error during retry',
          }
        });
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
