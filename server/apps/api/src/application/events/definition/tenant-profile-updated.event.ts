import { DomainEvent } from '../domain-event'

export class TenantProfileUpdatedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly changedFields: string[],
  ) {
    super()
  }

  eventName(): string {
    return 'TenantProfileUpdatedEvent'
  }
}
