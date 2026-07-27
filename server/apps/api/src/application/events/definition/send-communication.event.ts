import { DomainEvent } from '../domain-event';
import { RecipientRole } from '../../../shared/infrastructure/communication/communication-templates';

export interface SendCommunicationPayload {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  recipientRole?: RecipientRole;
  userId?: string;
  registeredUserId?: number;
  pmUuid?: string;
  type: string;
  title?: string;
  context?: Record<string, any>;
  forceChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
  fromOverride?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
  cc?: string;
  bcc?: string;
}

export class SendCommunicationEvent extends DomainEvent {
  public static readonly EVENT_NAME = 'communication.send';

  constructor(public readonly payload: SendCommunicationPayload) {
    super();
  }

  eventName(): string {
    return SendCommunicationEvent.EVENT_NAME;
  }
}
