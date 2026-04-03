import { DomainEvent } from '../domain-event'

export class AdminRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly perpetratorId: string, // Who did the change
    public readonly targetAdminId: string, // Whose role changed
    public readonly oldRole: string,
    public readonly newRole: string,
    public readonly ip?: string,
    public readonly ua?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'AdminRoleChangedEvent'
  }
}
