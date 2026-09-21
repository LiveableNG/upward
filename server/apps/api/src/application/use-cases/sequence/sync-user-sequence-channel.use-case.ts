import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { InitializeUserSequenceUseCase } from '../whatsapp-sequence/initialize-user-sequence.use-case';

export interface SyncUserSequenceChannelCommand {
  userId: number;
  firstName: string;
  phoneEncrypted: string;
  phoneHash: string;
  pmName?: string | null;
}

@Injectable()
export class SyncUserSequenceChannelUseCase {
  private readonly logger = new Logger(SyncUserSequenceChannelUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly initializeUserSequenceUseCase: InitializeUserSequenceUseCase,
  ) {}

  async execute(command: SyncUserSequenceChannelCommand): Promise<void> {
    if (!command.userId || !command.phoneEncrypted || !command.phoneHash) {
      return;
    }

    try {
      // 1. Check if user already has any WhatsApp sequence logs
      const existingWhatsappCount = await this.prisma.upward_whatsapp_sequence_log.count({
        where: { userId: command.userId },
      });

      if (existingWhatsappCount === 0) {
        // User was on Email sequence (or no sequence yet). Cancel/mark superseded pending email logs.
        const pendingEmailLogs = await this.prisma.upward_email_sequence_log.updateMany({
          where: {
            userId: command.userId,
            status: { in: ['PENDING', 'APPROVED'] },
          },
          data: {
            status: 'FAILED',
            errorReason: 'Migrated to WhatsApp sequence after phone number added',
          },
        });

        if (pendingEmailLogs.count > 0) {
          this.logger.log(
            `[SequenceSync] Marked ${pendingEmailLogs.count} pending email sequence logs as superseded for user ${command.userId}`,
          );
        }

        // Initialize WhatsApp sequence with their new phone number
        await this.initializeUserSequenceUseCase.execute({
          userId: command.userId,
          firstName: command.firstName,
          phoneEncrypted: command.phoneEncrypted,
          phoneHash: command.phoneHash,
          pmName: command.pmName,
        });

        this.logger.log(
          `[SequenceSync] Enrolled user ${command.userId} in WhatsApp sequence after phone number added`,
        );
      } else {
        // User already has a WhatsApp sequence; update phone number on any remaining pending logs
        const updatedPendingWhatsapp = await this.prisma.upward_whatsapp_sequence_log.updateMany({
          where: {
            userId: command.userId,
            status: 'PENDING',
          },
          data: {
            phoneEncrypted: command.phoneEncrypted,
            phoneHash: command.phoneHash,
          },
        });

        if (updatedPendingWhatsapp.count > 0) {
          this.logger.log(
            `[SequenceSync] Updated phone number on ${updatedPendingWhatsapp.count} pending WhatsApp sequence logs for user ${command.userId}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `[SequenceSync] Failed to sync sequence channel for user ${command.userId}: ${err?.message || err}`,
      );
    }
  }
}
