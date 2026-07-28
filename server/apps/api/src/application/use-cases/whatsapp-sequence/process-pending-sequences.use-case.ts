import { Injectable, Inject, Logger } from '@nestjs/common';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class ProcessPendingSequencesUseCase {
  private readonly logger = new Logger(ProcessPendingSequencesUseCase.name);

  constructor(
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IWhatsappSequenceLogRepository,
    private readonly unifiedCommService: UnifiedCommunicationService,
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
      // Real-time eligibility re-check at dispatch time
      const liveUser = await this.prisma.upward_user.findUnique({
        where: { id: log.userId },
        select: { phone: true, firstName: true, isInternal: true },
      });

      if (!liveUser || liveUser.isInternal) {
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', liveUser?.isInternal ? 'User is marked as internal' : 'User not found');
        this.logger.warn(`[WhatsappSequence] Skipping ${log.stage} for user ${log.userId} — ${liveUser?.isInternal ? 'internal' : 'not found'}`);
        continue;
      }

      if (!liveUser.phone) {
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', 'User no longer has a phone number.');
        this.logger.warn(`[WhatsappSequence] Skipping ${log.stage} for user ${log.userId} — no phone`);
        continue;
      }

      const plainPhone = this.encryptionService.decrypt(liveUser.phone);
      
      let decryptedFirstName = 'there';
      if (liveUser.firstName) {
        decryptedFirstName = liveUser.firstName.includes(':')
          ? this.encryptionService.decrypt(liveUser.firstName)
          : liveUser.firstName;
      }

      try {
        const success = await this.unifiedCommService.processCommunication({
          recipientPhone: plainPhone,
          recipientName: decryptedFirstName,
          recipientRole: 'TENANT',
          registeredUserId: log.userId,
          type: `ONBOARDING_SEQUENCE_${log.stage}` as any,
          forceChannel: 'WHATSAPP',
          whatsappSequenceLogId: log.id,
          context: {
            firstName: decryptedFirstName,
            displayName: decryptedFirstName,
            stage: log.stage,
          },
        });

        if (success) {
          await this.sequenceRepository.updateStatus(log.id, 'SENT');
          this.logger.log(`[WhatsappSequence] Successfully sent sequence ${log.stage} to user ID ${log.userId}`);
        } else {
          await this.sequenceRepository.updateStatus(log.id, 'FAILED', 'WhatsApp dispatch failed');
          this.logger.warn(`[WhatsappSequence] Failed to send sequence ${log.stage} to user ID ${log.userId}`);
        }
      } catch (error: any) {
        await this.sequenceRepository.updateStatus(log.id, 'FAILED', error.message || 'Unknown internal error');
        this.logger.error(`[WhatsappSequence] Error sending sequence ${log.stage} to user ID ${log.userId}:`, error.message);
      }
    }
  }
}
