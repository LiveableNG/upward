import { DomainEvent } from '../domain-event'

export class InteractionEvent extends DomainEvent {
  constructor(
    public readonly visitorId: string,
    public readonly type: string,
    public readonly target: string,
    public readonly abVariant: string,
    public readonly metadata?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'InteractionEvent'
  }
}
