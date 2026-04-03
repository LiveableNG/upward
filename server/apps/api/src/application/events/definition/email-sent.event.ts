import { DomainEvent } from '../domain-event'

export type EmailDeliveryStatus = 'SENT' | 'FAILED' | 'PENDING'

export class EmailSentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly subject: string,
    public readonly type: string,
    public readonly status: EmailDeliveryStatus,
    public readonly mailgunId?: string,
    public readonly lastError?: string,
    public readonly retries: number = 0,
    public readonly sessionId?: string,
    public readonly body?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'EmailSentEvent'
  }
}
