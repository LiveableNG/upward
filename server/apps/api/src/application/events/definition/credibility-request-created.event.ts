import { DomainEvent } from '../domain-event';

export class CredibilityRequestCreatedEvent extends DomainEvent {
  constructor(
    public readonly platformId: number,
    public readonly eventType: string,
    public readonly payload: any
  ) {
    super();
  }

  eventName(): string {
    return 'CredibilityRequestCreatedEvent';
  }
}
