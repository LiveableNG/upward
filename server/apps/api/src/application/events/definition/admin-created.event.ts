import { DomainEvent } from '../domain-event'

export class AdminCreatedEvent extends DomainEvent {
  constructor(
    public readonly perpetratorId: string, // Who created it
    public readonly targetAdminId: string, // The new admin ID
    public readonly targetEmail: string,
    public readonly targetRole: string,
    public readonly ip?: string,
    public readonly ua?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'AdminCreatedEvent'
  }
}
