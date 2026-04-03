import { DomainEvent } from '../domain-event'

export class WaitlistUserDeletedEvent extends DomainEvent {
  constructor(
    public readonly perpetratorId: string,
    public readonly targetUserId: string,
    public readonly targetEmail: string,
  ) {
    super()
  }

  eventName(): string {
    return 'WaitlistUserDeletedEvent'
  }
}
