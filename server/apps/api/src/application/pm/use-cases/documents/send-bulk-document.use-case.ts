import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SendDocumentUseCase, SendDocumentDto } from './send-document.use-case';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';

export interface BulkSendDocumentDto {
  subject: string;
  content: string;
  documentType: string;
  includeLetterhead?: boolean;
  deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
  fromEmail?: string;
  templateId?: number;
  templateName?: string;
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
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(actorPmId: number, actorPmUuid: string, data: BulkSendDocumentDto) {
    const templateLabel = data.templateName ? `template "${data.templateName}" (ID: ${data.templateId ?? 'N/A'})` : `custom subject "${data.subject}"`;
    this.logger.log(`Initiating bulk send for ${data.recipients.length} recipients using ${templateLabel}...`);

    try {
      const isWhatsapp = data.deliveryChannel === 'WHATSAPP';
      const actionVerb = isWhatsapp
        ? `Generated WhatsApp bulk PDF for "${data.subject}"`
        : `Bulk sent document "${data.subject}"`;

      await this.activityLog.log({
        pmId: actorPmId,
        ownerPmId: actorPmId,
        action: ActivityAction.BULK_SEND_DOCUMENT,
        entityType: 'DOCUMENT',
        entityId: data.templateId ? String(data.templateId) : undefined,
        description: `${actionVerb} using ${data.templateName ? `template "${data.templateName}"` : 'custom content'} for ${data.recipients.length} recipients`,
        metadata: {
          templateId: data.templateId,
          templateName: data.templateName,
          recipientCount: data.recipients.length,
          documentType: data.documentType,
          deliveryChannel: data.deliveryChannel,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write bulk document activity log:', err);
    }

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
