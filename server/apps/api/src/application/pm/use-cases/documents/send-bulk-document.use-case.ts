import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SendDocumentUseCase, SendDocumentDto } from './send-document.use-case';

export interface BulkSendDocumentDto {
  subject: string;
  content: string;
  documentType: string;
  includeLetterhead?: boolean;
  deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
  fromEmail?: string;
  recipients: Array<{
    uuid: string;
    type: 'TENANT' | 'LANDLORD';
    email: string;
    phone?: string;
    name: string;
  }>;
}

@Injectable()
export class SendBulkDocumentUseCase {
  private readonly logger = new Logger(SendBulkDocumentUseCase.name);

  constructor(
    private readonly sendDocumentUseCase: SendDocumentUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(actorPmId: number, actorPmUuid: string, data: BulkSendDocumentDto) {
    this.logger.log(`Initiating bulk send for ${data.recipients.length} recipients...`);

    this.processBulkDispatch(actorPmId, actorPmUuid, data);

    return {
      message: `Bulk dispatch initiated for ${data.recipients.length} recipients.`,
      status: 'PROCESSING',
    };
  }

  private async processBulkDispatch(actorPmId: number, actorPmUuid: string, data: BulkSendDocumentDto) {
    const BATCH_SIZE = 3;
    const results: PromiseSettledResult<any>[] = [];

    for (let i = 0; i < data.recipients.length; i += BATCH_SIZE) {
      const batch = data.recipients.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (recipient) => {
          const dto: SendDocumentDto = {
            subject: data.subject,
            content: data.content,
            documentType: data.documentType,
            includeLetterhead: data.includeLetterhead,
            deliveryChannel: data.deliveryChannel,
            fromEmail: data.fromEmail,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
          };

          if (recipient.type === 'TENANT') {
            dto.tenantUuid = recipient.uuid;
          }

          return this.sendDocumentUseCase.execute(actorPmId, dto);
        })
      );
      results.push(...batchResults);
    }

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Bulk send completed. Success: ${successful}, Failed: ${failed}`);
    
    // Log failures if any for debugging
    results.forEach((r, index) => {
      if (r.status === 'rejected') {
        this.logger.error(`Failed to send document to recipient at index ${index}:`, r.reason);
      }
    });

    this.eventEmitter.emit('pm.bulk_dispatch.completed', {
      pmUuid: actorPmUuid,
      successful,
      failed,
      total: results.length,
      timestamp: new Date()
    });
  }
}
