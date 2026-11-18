import { DomainEvent } from '../domain-event'

export class UserGoalsUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId?: number | string,
    public readonly userUuid?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'user.goals.updated'
  }
}
