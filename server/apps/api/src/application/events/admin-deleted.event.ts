import { DomainEvent } from './domain-event'

export class AdminDeletedEvent extends DomainEvent {
  constructor(
    public readonly perpetratorId: string,
    public readonly targetAdminId: string,
    public readonly targetEmail: string,
    public readonly ip?: string,
    public readonly ua?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'AdminDeletedEvent'
  }
}
