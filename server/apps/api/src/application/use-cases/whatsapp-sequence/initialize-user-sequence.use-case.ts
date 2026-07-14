import { Injectable, Inject, Logger } from '@nestjs/common';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';

export interface InitializeUserSequenceCommand {
  userId: number;
  firstName: string;
  phoneEncrypted?: string | null;
  phoneHash?: string | null;
  pmName?: string | null;
}

@Injectable()
export class InitializeUserSequenceUseCase {
  private readonly logger = new Logger(InitializeUserSequenceUseCase.name);

  constructor(
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IWhatsappSequenceLogRepository,
  ) {}

  async execute(command: InitializeUserSequenceCommand): Promise<void> {
    this.logger.log(`[WhatsappSequence] Initializing sequence for user ${command.userId}`);

    const now = new Date();
    
    // Helper to calculate future date
    const getFutureDate = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      // Optional: Set to a reasonable daytime hour, e.g. 10 AM, if days > 0
      if (days > 0) {
        date.setHours(10, 0, 0, 0);
      }
      return date;
    };

    const sequences = [
      {
        stage: 'WELCOME',
        templateName: 'upward_seq_welcome_v2',
        scheduledFor: getFutureDate(0), // Immediately
        templateData: { body_text: [[command.firstName, command.pmName || 'Upward']] },
      },
      {
        stage: 'DAY_2',
        templateName: 'upward_seq_day2_v2',
        scheduledFor: getFutureDate(2),
        templateData: { body_text: [[command.firstName]] },
      },
      {
        stage: 'DAY_5',
        templateName: 'upward_seq_day5_v2',
        scheduledFor: getFutureDate(5),
        templateData: { body_text: [[command.firstName]] },
      },
      {
        stage: 'DAY_9',
        templateName: 'upward_seq_day9_v2',
        scheduledFor: getFutureDate(9),
        templateData: { body_text: [[command.firstName]] },
      },
      {
        stage: 'DAY_14',
        templateName: 'upward_seq_day14_v2',
        scheduledFor: getFutureDate(14),
        templateData: { body_text: [[command.firstName]] },
      }
    ];

    const logsToCreate = sequences.map(seq => ({
      userId: command.userId,
      phoneEncrypted: command.phoneEncrypted || null,
      phoneHash: command.phoneHash || null,
      stage: seq.stage,
      status: 'PENDING',
      scheduledFor: seq.scheduledFor,
      templateName: seq.templateName,
      templateData: seq.templateData,
    }));

    await this.sequenceRepository.createMany(logsToCreate);
    this.logger.log(`[WhatsappSequence] Initialized 5 sequence logs for user ${command.userId}`);
  }
}
