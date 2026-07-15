import { WhatsappSequenceLogEntity } from './whatsapp-sequence.entity';

export const WHATSAPP_SEQUENCE_REPOSITORY = Symbol('WHATSAPP_SEQUENCE_REPOSITORY');

export interface IWhatsappSequenceLogRepository {
  createMany(
    logs: Omit<WhatsappSequenceLogEntity, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'sentAt' | 'errorReason'>[]
  ): Promise<void>;
  
  findLogsBeforeByStatus(status: string, date: Date, limit: number): Promise<WhatsappSequenceLogEntity[]>;
  
  updateStatus(
    id: number,
    status: string,
    errorReason?: string | null
  ): Promise<WhatsappSequenceLogEntity>;

  findById(id: number): Promise<WhatsappSequenceLogEntity | null>;
  
  findAll(options: {
    skip?: number;
    take?: number;
    status?: string;
    stage?: string;
  }): Promise<{ data: WhatsappSequenceLogEntity[]; total: number }>;

  getStats(stage: string): Promise<{ total: number; sent: number; failed: number; pending: number }>;
}
